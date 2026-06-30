/**
 * importacaoMaterialService — importação de bens MÓVEIS a partir do relatório
 * "Movimentos de Liquidação" do SIAFIC (classificação 4.4.90.52.00 — material
 * permanente liquidado/pago).
 *
 * O relatório é texto de largura fixa, hierárquico:
 *   UG (fundo/secretaria)
 *    └─ Dotação (ação orçamentária)
 *        └─ Subelemento 4.4.90.52.XX (= tipo do bem)
 *            └─ Nota Fiscal (data, fornecedor, empenho, NF nº/série, liquidação)
 *                └─ Itens (quantidade · unidade · especificação · vl. unit · vl. total)
 *   + Fonte de Recursos por UG (no rodapé) → sugere origem_recurso.
 *
 * Este módulo PARSEIA (puro, testável) e expõe a extração de texto do PDF. A
 * criação dos patrimônios fica no fluxo de import (preview → confirmar).
 */

import pdfParse from 'pdf-parse';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache } from '../config/redis';
import { logInfo, logWarn } from '../config/logger';
import { proximoNumeroConfiguradoTx, formatNumero } from './numberingService';
import { ALMOXARIFADO_LOCAL_NOME } from '../constants/almoxarifado';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
  name?: string;
}

export class ImportacaoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportacaoValidationError';
  }
}

// Extrai o texto bruto do PDF preservando o layout de largura fixa (necessário
// para o parser). Isolado para ser fácil de stubar nos testes do endpoint.
export const extrairTextoPdf = async (buffer: Buffer): Promise<string> => {
  const data = await pdfParse(buffer);
  return data.text;
};

// ===========================================================================
// Tipos do resultado do parsing
// ===========================================================================

export interface ItemImportado {
  // hierarquia de origem (rastreabilidade)
  ug: string;
  unidadeOrcamentaria: string; // ex: '02 08'
  dotacaoCodigo: string; // função-subfunção-programa, ex: '15 122 0010'
  dotacao: string; // ação orçamentária (nome)
  projetoAtividade: string; // ex: '1.028'
  subelementoCodigo: string; // ex: '42'
  subelementoNome: string; // ex: 'Mobiliário em geral'
  // dados do bem
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  // nota fiscal / empenho
  dataAquisicao: string; // ISO (data da NF)
  numeroNotaFiscal: string; // ex: '697/1' (nº/série)
  fornecedor: string;
  empenhoProcesso: string; // ex: 'CD A.2026-001'
  numeroEmpenho: string; // ex: '02030013'
  numeroLiquidacao: string; // ex: '11030018'
  // sugestões derivadas (o usuário confirma na revisão)
  tipoSugerido: string;
  formaAquisicaoSugerida: string;
  numeroLicitacao: string; // = processo do empenho (LC/CD ...), p/ numero_licitacao
  anoLicitacao: number | null; // ano extraído do processo ou da NF
  observacoes: string; // trilha contábil completa, p/ observacoes do bem
}

export interface FonteRecurso {
  codigo: string;
  descricao: string;
  valor: number;
}

export interface UgImportada {
  nome: string;
  fontes: FonteRecurso[];
  origemRecursoSugerida: string | null; // só sugere se a UG tem fonte única
  fundoSugerido: string | null; // nome do fundo (FUNDEB, VAAT, SUS...) se único
}

export interface RelatorioParseado {
  exercicio: string | null;
  municipio: string | null;
  ugs: UgImportada[];
  itens: ItemImportado[];
  avisos: string[];
}

// ===========================================================================
// Mapas de derivação (subelemento → tipo, empenho → forma, fonte → origem)
// ===========================================================================

// Subelemento 4.4.90.52.XX → tipo do bem (categoria patrimonial).
const SUBELEMENTO_TIPO: Record<string, string> = {
  '08': 'Equipamento Médico-Hospitalar',
  '34': 'Máquinas e Equipamentos',
  '35': 'Equipamento de Processamento de Dados',
  '38': 'Máquinas, Ferramentas e Utensílios de Oficina',
  '39': 'Equipamento Hidráulico/Elétrico',
  '42': 'Mobiliário em Geral',
  '48': 'Veículo',
  '99': 'Outros Materiais Permanentes',
};

export const tipoDoSubelemento = (codigo: string, nome: string): string =>
  SUBELEMENTO_TIPO[codigo] ?? nome;

// Prefixo do processo de empenho → forma de aquisição.
export const formaDoEmpenho = (processo: string): string => {
  const p = processo.trim().toUpperCase();
  if (p.startsWith('LC')) return 'Licitação';
  if (p.startsWith('CD')) return 'Dispensa/Compra Direta';
  return 'Compra';
};

// Fonte de recursos → origem_recurso (enum do Patrimonio). Retorna null quando
// não dá para inferir com segurança.
export const origemDaFonte = (descricao: string): string | null => {
  const d = descricao.toLowerCase();
  if (d.includes('convên') || d.includes('conven')) return 'convenio';
  if (d.includes('emenda')) return 'emenda';
  // Base própria do município: recursos livres e a base de impostos+transf.
  // constitucionais ("receita de imposto e transf.") — tem prioridade sobre a
  // palavra genérica "transf", senão classificaria errado como transferência.
  if (
    d.includes('não vinculados') ||
    d.includes('nao vinculados') ||
    d.includes('ordinári') ||
    d.includes('imposto')
  )
    return 'proprio';
  // Transferências específicas de outros entes/programas.
  if (
    d.includes('sus') ||
    d.includes('fundeb') ||
    d.includes('salário-educ') ||
    d.includes('salario-educ') ||
    d.includes('transf')
  )
    return 'transferencia_ente';
  return null;
};

// Fundos/fontes específicas reconhecidos na descrição da fonte. Mais específicos
// primeiro (VAAT/VAAF antes de FUNDEB) para que "FUNDEB VAAT" caia no rótulo certo.
// Os rótulos batem com o que a secretaria cadastra em `fundos` para cruzamento.
const FUNDOS_CONHECIDOS: { rx: RegExp; nome: string }[] = [
  { rx: /vaat/i, nome: 'VAAT' },
  { rx: /vaaf/i, nome: 'VAAF' },
  { rx: /fundeb/i, nome: 'FUNDEB' },
  { rx: /sal[áa]rio[\s-]?educa/i, nome: 'Salário-Educação' },
  { rx: /\bsus\b/i, nome: 'SUS' },
  { rx: /\bpnae\b|alimenta[çc][ãa]o\s+escolar/i, nome: 'PNAE' },
  { rx: /\bpnate\b|transporte\s+escolar/i, nome: 'PNATE' },
];

// Extrai o nome do fundo/fonte específica da descrição da fonte. Retorna null
// quando não reconhece (ex.: recursos próprios não têm fundo nomeado).
export const fundoDaFonte = (descricao: string): string | null => {
  for (const f of FUNDOS_CONHECIDOS) {
    if (f.rx.test(descricao)) return f.nome;
  }
  return null;
};

// ===========================================================================
// Helpers de parsing
// ===========================================================================

const VL = /\d{1,3}(?:\.\d{3})*,\d{2}/; // 46.980,00 / 752,00
const VL_FIM = new RegExp(`(${VL.source})\\s+(${VL.source})\\s*$`); // dois valores no fim

// "46.980,00" -> 46980.00
const parseValor = (s: string): number => Number(s.replace(/\./g, '').replace(',', '.'));

// "10/04/2026" -> "2026-04-10T00:00:00.000Z" (ISO, sem horário local)
const dataIso = (br: string): string => {
  const [d, m, y] = br.split('/');
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`).toISOString();
};

const ehLinhaRuido = (l: string): boolean => {
  const t = l.trim();
  if (!t) return true;
  if (/^-+$/.test(t)) return true;
  if (t.startsWith('DOTAÇÃO') && t.includes('EMPENHO')) return true;
  if (t.startsWith('quantidade') && t.includes('especificação')) return true;
  if (t.startsWith('SUB-TOTAL')) return true;
  // "TOTAL SUBELEMENTO/PROJ/GERAL" — não confundir com "TOTAL GERAL ... POR FONTE".
  if (t.startsWith('TOTAL ') && !t.includes('POR FONTE DE RECURSOS')) return true;
  return false;
};

// Ruído de cabeçalho/rodapé de PÁGINA (repete a cada página). Removido na
// normalização para o conteúdo (NF + itens) fluir continuamente entre páginas.
const ehRuidoPagina = (l: string): boolean => {
  const t = l.trim();
  if (t.startsWith('Pará') && t.includes('MOVIMENTOS DE LIQUIDAÇÃO')) return true;
  if (t.startsWith('Governo Municipal') && t.includes('Exercício')) return true;
  if (t.startsWith('Classif. Econômica')) return true;
  return false;
};

const MARK_UG = '@@UG@@';

// Normaliza: remove ruído de página e marca transições de UG (apenas quando a
// UG muda) — assim a NF e os itens não "perdem o contexto" na quebra de página,
// e itens que quebram de uma página para outra são juntados corretamente.
const normalizar = (linhas: string[]): string[] => {
  const out: string[] = [];
  let ultimaUg = '';
  for (let i = 0; i < linhas.length; i++) {
    const raw = linhas[i];
    const prox = (linhas[i + 1] ?? '').trim();
    // A UG é a linha imediatamente antes de "Classif. Econômica".
    if (prox.startsWith('Classif. Econômica')) {
      const ug = raw.trim();
      if (ug && !ug.startsWith('Governo Municipal')) {
        if (ug !== ultimaUg) {
          out.push(MARK_UG + ug);
          ultimaUg = ug;
        }
        continue; // descarta a própria linha da UG (já virou marcador)
      }
    }
    if (ehRuidoPagina(raw)) continue;
    out.push(raw);
  }
  return out;
};

// ===========================================================================
// Parser principal
// ===========================================================================

interface NfState {
  data: string;
  fornecedor: string;
  processo: string;
  numeroEmpenho: string;
  numeroNotaFiscal: string;
  numeroLiquidacao: string;
}

export const parseRelatorioLiquidacao = (texto: string): RelatorioParseado => {
  const exMatch = texto.match(/Exercício de (\d{4})/);
  const linhas = normalizar(texto.split('\n'));
  const avisos: string[] = [];
  const itens: ItemImportado[] = [];
  const ugsMap = new Map<string, UgImportada>();

  const exercicio: string | null = exMatch ? exMatch[1] : null;
  let municipio: string | null = null;

  // Estado corrente da hierarquia.
  let ugAtual = '';
  let unidadeOrcAtual = '';
  let dotacaoCodigoAtual = '';
  let dotacaoAtual = '';
  let projAtivAtual = '';
  let subCodigoAtual = '';
  let subNomeAtual = '';
  // Nota fiscal corrente.
  let nf: NfState | null = null;
  let coletandoFontes = false;

  const ensureUg = (nome: string): UgImportada => {
    let ug = ugsMap.get(nome);
    if (!ug) {
      ug = { nome, fontes: [], origemRecursoSugerida: null, fundoSugerido: null };
      ugsMap.set(nome, ug);
    }
    return ug;
  };

  for (let i = 0; i < linhas.length; i++) {
    const raw = linhas[i];
    const t = raw.trim();

    // Marcador de troca de UG (emitido na normalização). Reinicia o contexto.
    if (raw.startsWith(MARK_UG)) {
      ugAtual = raw.slice(MARK_UG.length).trim();
      ensureUg(ugAtual);
      if (!municipio && ugAtual.toLowerCase().startsWith('prefeitura')) municipio = ugAtual;
      unidadeOrcAtual = '';
      dotacaoCodigoAtual = '';
      dotacaoAtual = '';
      projAtivAtual = '';
      subCodigoAtual = '';
      subNomeAtual = '';
      coletandoFontes = false;
      nf = null;
      continue;
    }

    // Órgão/unidade orçamentária: "02 08." (precede a dotação).
    const uo = raw.match(/^\s*(\d{2}\s+\d{2})\.\s*$/);
    if (uo) {
      unidadeOrcAtual = uo[1].replace(/\s+/g, ' ').trim();
      continue;
    }

    if (t.includes('POR FONTE DE RECURSOS')) {
      coletandoFontes = true;
      nf = null;
      continue;
    }

    // Linhas de fonte de recurso (sob "POR FONTE DE RECURSOS").
    if (coletandoFontes) {
      const f = raw.match(/(\d{8})\s+-(.+?)\.{2,}\s+(\d{1,3}(?:\.\d{3})*,\d{2})/);
      if (f && ugAtual) {
        ensureUg(ugAtual).fontes.push({
          codigo: f[1],
          descricao: f[2].trim(),
          valor: parseValor(f[3]),
        });
      }
      continue;
    }

    if (ehLinhaRuido(raw)) continue;

    // Dotação / ação orçamentária: " 15 122 0010 2.030 Nome da ação".
    const dot = raw.match(/^\s*(\d{1,2}\s+\d{3}\s+\d{4})\s+(\d+\.\d+)\s+(.+?)\s*$/);
    if (dot) {
      dotacaoCodigoAtual = dot[1].replace(/\s+/g, ' ').trim();
      projAtivAtual = dot[2];
      dotacaoAtual = dot[3].trim();
      nf = null;
      continue;
    }

    // Subelemento: "4.4.90.52.48 Veículos diversos" (ignora o .00 genérico).
    const sub = raw.match(/^\s*4\.4\.90\.52\.(\d{2})\s+(.+?)\s*$/);
    if (sub) {
      if (sub[1] !== '00') {
        subCodigoAtual = sub[1];
        subNomeAtual = sub[2].trim();
      }
      nf = null;
      continue;
    }

    // Início de bloco de NF: "DD/MM/YYYY  FORNECEDOR".
    const cab = raw.match(/^\s*(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s*$/);
    if (cab && !/mercadoria Nº/.test(raw)) {
      nf = {
        data: cab[1],
        fornecedor: cab[2].trim(),
        processo: '',
        numeroEmpenho: '',
        numeroNotaFiscal: '',
        numeroLiquidacao: '',
      };
      continue;
    }

    // Linha de empenho + NF: "LC 9.2026-003  09040002  mercadoria Nº 360 série 1 de 10/04/2026  10040013  46.980,00".
    const emp = raw.match(
      /^\s*(.+?)\s+(\d{6,})\s+mercadoria Nº (\S+) série (\S+) de (\d{2}\/\d{2}\/\d{4})\s+(\d{6,})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/,
    );
    if (emp) {
      const fornecedorPrev: string = nf ? nf.fornecedor : '';
      nf = {
        data: emp[5], // data da NF (emissão) — usada como data de aquisição
        fornecedor: fornecedorPrev,
        processo: emp[1].trim(),
        numeroEmpenho: emp[2],
        numeroNotaFiscal: `${emp[3]}/${emp[4]}`,
        numeroLiquidacao: emp[6],
      };
      continue;
    }

    // Item: "16,0000  UNIDAD  NOBREAK 600 VA-120V  752,00  12.032,00"
    // (pode quebrar em mais de uma linha — junta-se até achar 2 valores no fim).
    const itemIni = raw.match(/^\s*([\d.]+),\d{4}\s+UNIDAD\s+(.*)$/);
    if (itemIni) {
      if (!nf) {
        avisos.push(`Item sem NF associada ignorado: "${t.slice(0, 50)}"`);
        continue;
      }
      const quantidade = Math.round(parseValor(`${itemIni[1]},00`));
      let resto = itemIni[2];
      let guard = 0;
      while (!VL_FIM.test(resto) && i + 1 < linhas.length && guard < 8) {
        const prox = linhas[i + 1];
        const pt = prox.trim();
        // Estruturas que ENCERRAM o item (não são continuação da descrição).
        if (
          prox.startsWith(MARK_UG) ||
          /^\s*[\d.]+,\d{4}\s+UNIDAD/.test(prox) ||
          /^\s*\d{2}\/\d{2}\/\d{4}/.test(prox) ||
          /mercadoria Nº/.test(prox) ||
          pt.startsWith('TOTAL ') ||
          pt.startsWith('SUB-TOTAL') ||
          pt.includes('POR FONTE DE RECURSOS')
        ) {
          break;
        }
        i++;
        // Pula ruído de topo de página que aparece quando a descrição quebra de
        // uma página para a outra (linha em branco, separador "----", cabeçalho
        // "DOTAÇÃO ... VALOR(R$)", sub-cabeçalho "quantidade ... especificação")
        // — sem encerrar o item e sem poluir a descrição. (TOTAL/SUB-TOTAL/UG já
        // encerram acima, então não chegam aqui.)
        if (!pt || ehLinhaRuido(prox) || ehRuidoPagina(prox)) continue;
        resto = `${resto.trim()} ${pt}`;
        guard++;
      }
      const m = resto.match(VL_FIM);
      if (!m) {
        avisos.push(`Não consegui ler os valores do item: "${t.slice(0, 50)}"`);
        continue;
      }
      const valorUnitario = parseValor(m[1]);
      const valorTotal = parseValor(m[2]);
      const descricao = resto.slice(0, m.index).trim().replace(/\s+/g, ' ');

      // Ano da licitação: do processo do empenho (ex.: "LC 9.2026-003" → 2026),
      // senão do ano da NF.
      const anoProc = nf.processo.match(/(20\d{2})/);
      const anoNf = nf.data.match(/\/(\d{4})$/);
      const anoLicitacao = anoProc ? Number(anoProc[1]) : anoNf ? Number(anoNf[1]) : null;

      // Trilha contábil completa → observacoes do bem (rastreabilidade total).
      const observacoes = [
        `Importado do relatório de liquidação SIAFIC${exercicio ? ` (exercício ${exercicio})` : ''}`,
        ugAtual ? `UG: ${ugAtual}` : '',
        unidadeOrcAtual ? `Unidade orçamentária: ${unidadeOrcAtual}` : '',
        dotacaoCodigoAtual || projAtivAtual
          ? `Dotação: ${[dotacaoCodigoAtual, projAtivAtual].filter(Boolean).join(' ')}${dotacaoAtual ? ` — ${dotacaoAtual}` : ''}`
          : '',
        `Classificação: 4.4.90.52.${subCodigoAtual} ${subNomeAtual}`.trim(),
        nf.processo ? `Empenho: ${nf.processo} (nº ${nf.numeroEmpenho})` : `Empenho nº ${nf.numeroEmpenho}`,
        `Liquidação: ${nf.numeroLiquidacao}`,
        `NF: ${nf.numeroNotaFiscal}`,
        nf.fornecedor ? `Fornecedor: ${nf.fornecedor}` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      itens.push({
        ug: ugAtual,
        unidadeOrcamentaria: unidadeOrcAtual,
        dotacaoCodigo: dotacaoCodigoAtual,
        dotacao: dotacaoAtual,
        projetoAtividade: projAtivAtual,
        subelementoCodigo: subCodigoAtual,
        subelementoNome: subNomeAtual,
        descricao,
        quantidade,
        valorUnitario,
        valorTotal,
        dataAquisicao: dataIso(nf.data),
        numeroNotaFiscal: nf.numeroNotaFiscal,
        fornecedor: nf.fornecedor,
        empenhoProcesso: nf.processo,
        numeroEmpenho: nf.numeroEmpenho,
        numeroLiquidacao: nf.numeroLiquidacao,
        tipoSugerido: tipoDoSubelemento(subCodigoAtual, subNomeAtual),
        formaAquisicaoSugerida: formaDoEmpenho(nf.processo),
        numeroLicitacao: nf.processo,
        anoLicitacao,
        observacoes,
      });
    }
  }

  // Sugere origem por UG quando TODAS as fontes apontam para a mesma origem
  // (ex.: FUNDEB tem 2 fontes, ambas transferência → sugere transferencia_ente).
  for (const ug of ugsMap.values()) {
    const origens = ug.fontes.map((f) => origemDaFonte(f.descricao)).filter((o): o is string => !!o);
    const unicas = Array.from(new Set(origens));
    ug.origemRecursoSugerida = unicas.length === 1 ? unicas[0] : null;

    // Fundo: sugere só quando há um único fundo nomeado nas fontes da UG.
    const fundos = ug.fontes.map((f) => fundoDaFonte(f.descricao)).filter((f): f is string => !!f);
    const fundosUnicos = Array.from(new Set(fundos));
    ug.fundoSugerido = fundosUnicos.length === 1 ? fundosUnicos[0] : null;
  }

  return {
    exercicio,
    municipio,
    ugs: Array.from(ugsMap.values()),
    itens,
    avisos,
  };
};

// ===========================================================================
// Importação (confirmar): cria N patrimônios POR UNIDADE, em transação.
// ===========================================================================

const VALID_ORIGEM = new Set(['proprio', 'convenio', 'emenda', 'transferencia_ente', 'outro']);
const MAX_UNIDADES = 2000; // trava de segurança para um import único

// ALMOXARIFADO_LOCAL_NOME importado de ../constants/almoxarifado (no topo).

export interface ItemConfirmado {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  dataAquisicao: string; // ISO
  numeroNotaFiscal?: string | null;
  fornecedor?: string | null;
  numeroEmpenho?: string | null;
  numeroLiquidacao?: string | null;
  tipo: string;
  formaAquisicao: string;
  origemRecurso?: string | null;
  fundoRecurso?: string | null;
  numeroLicitacao?: string | null;
  anoLicitacao?: number | null;
  observacoes?: string | null;
  sectorId: string;
  setorNome: string;
  localObjeto?: string | null;
  vidaUtilAnos?: number | null;
  valorResidual?: number | null;
}

// Nome canônico do tipo/forma de um item: aparado e com fallback quando vazio
// (ou só espaços). Usado TANTO para a string gravada no bem QUANTO para a chave
// do find-or-create da referência — assim a string do bem casa exatamente com o
// nome do TipoBem/AcquisitionForm linkado, e nunca se cria referência com nome vazio.
const nomeTipo = (it: ItemConfirmado): string => (it.tipo || '').trim() || 'Não especificado';
const nomeForma = (it: ItemConfirmado): string =>
  (it.formaAquisicao || '').trim() || 'Compra';

// Assinatura natural de um bem importado, para deduplicar re-importações: o mesmo
// item de liquidação tem sempre liquidação + NF + descrição + valor + data iguais.
// Dois bens com essa assinatura no mesmo município são o MESMO item já importado
// (re-upload do relatório ou relatórios sobrepostos não devem duplicar bens).
const assinaturaImportacao = (it: ItemConfirmado, municipalityId: string) => ({
  municipalityId,
  descricao_bem: it.descricao.trim(),
  valor_aquisicao: it.valorUnitario,
  data_aquisicao: new Date(it.dataAquisicao),
  numero_nota_fiscal: it.numeroNotaFiscal ?? null,
  numero_liquidacao: it.numeroLiquidacao ?? null,
});

// Cria os patrimônios a partir dos itens revisados. Cada item explode em
// `quantidade` registros (1 por unidade física), todos com a mesma NF/empenho.
// Atômico: ou cria tudo, ou nada. A numeração é gerada uma vez e incrementada
// em memória dentro da transação (evita race/colisão).
export const importarPatrimonios = async (itens: ItemConfirmado[], actor: Actor) => {
  if (actor.role === 'superuser' && !actor.municipalityId) {
    throw new ImportacaoValidationError('Superuser deve operar no contexto de um município');
  }
  if (!itens?.length) {
    throw new ImportacaoValidationError('Nenhum item para importar');
  }

  const totalUnidades = itens.reduce((acc, it) => acc + (it.quantidade || 0), 0);
  if (totalUnidades <= 0) {
    throw new ImportacaoValidationError('A soma das quantidades deve ser maior que zero');
  }
  if (totalUnidades > MAX_UNIDADES) {
    throw new ImportacaoValidationError(
      `O lote tem ${totalUnidades} unidades — acima do limite de ${MAX_UNIDADES} por importação. Divida o relatório.`,
    );
  }

  // Valida cada item e que o setor pertence ao município.
  const setoresCache = new Map<string, { name: string; codigo: string }>(); // sectorId -> {name, codigo}
  for (const it of itens) {
    if (!it.descricao?.trim()) throw new ImportacaoValidationError('Item sem descrição');
    if (!it.sectorId) throw new ImportacaoValidationError(`Item "${it.descricao}" sem setor`);
    if (!Number.isInteger(it.quantidade) || it.quantidade < 1) {
      throw new ImportacaoValidationError(`Quantidade inválida no item "${it.descricao}"`);
    }
    if (!(it.valorUnitario >= 0)) {
      throw new ImportacaoValidationError(`Valor inválido no item "${it.descricao}"`);
    }
    if (Number.isNaN(Date.parse(it.dataAquisicao))) {
      throw new ImportacaoValidationError(`Data inválida no item "${it.descricao}"`);
    }
    if (it.origemRecurso && !VALID_ORIGEM.has(it.origemRecurso)) {
      throw new ImportacaoValidationError(`Origem de recurso inválida no item "${it.descricao}"`);
    }
    if (!setoresCache.has(it.sectorId)) {
      const setor = await prisma.sector.findUnique({
        where: { id: it.sectorId },
        select: { id: true, name: true, codigo: true, municipalityId: true },
      });
      if (!setor || (actor.role !== 'superuser' && setor.municipalityId !== actor.municipalityId)) {
        throw new ImportacaoValidationError(`Setor inválido em "${it.descricao}"`);
      }
      setoresCache.set(it.sectorId, { name: setor.name, codigo: setor.codigo });
    }
  }

  let criados: { id: string; numero_patrimonio: string }[] = [];
  let tiposCriados = 0;
  let formasCriadas = 0;
  let duplicatas = 0;
  // Importações concorrentes podem ler o mesmo "último número" e colidir no unique
  // [municipalityId, numero_patrimonio] (P2002). Em vez de falhar e pedir retry
  // manual, refazemos a transação algumas vezes — cada tentativa re-lê o maior
  // número (proximoNumeroConfiguradoTx) e recomeça do sequencial atualizado.
  const MAX_TENTATIVAS_NUMERACAO = 3;
  for (let tentativa = 1; ; tentativa++) {
  try {
  const resultadoTx = await prisma.$transaction(async (tx) => {
    // DEDUP: ignora itens cuja assinatura já existe no município (re-importação
    // do mesmo relatório ou relatórios sobrepostos não cria bens duplicados).
    // A checagem é dentro da transação para também valer contra imports
    // concorrentes idênticos.
    const itensNovos: ItemConfirmado[] = [];
    let duplicatasTx = 0;
    for (const it of itens) {
      const jaExiste = await tx.patrimonio.findFirst({
        where: assinaturaImportacao(it, actor.municipalityId!),
        select: { id: true },
      });
      if (jaExiste) duplicatasTx += 1;
      else itensNovos.push(it);
    }
    // Tudo já existia: nada a criar (mas reporta quantas duplicatas foram ignoradas).
    if (itensNovos.length === 0) {
      return { registros: [], tiposCriadosTx: 0, formasCriadasTx: 0, duplicatasTx };
    }

    // Numeração POR SETOR, no formato CONFIGURADO no sistema (NumberingPattern);
    // sem padrão configurado, usa o mesmo formato do cadastro manual
    // ({ano}{codigoSetor}{seq}) — NÃO mais o fixo "PAT...". O sequencial inicial
    // de cada setor vem do maior número existente e é incrementado em memória.
    const numeracaoBySetor = new Map<string, { prefix: string; seqLen: number; seq: number }>();
    for (const sectorId of new Set(itensNovos.map((it) => it.sectorId))) {
      const codigo = setoresCache.get(sectorId)?.codigo ?? '';
      const { prefix, seqLen, sequencial } = await proximoNumeroConfiguradoTx(tx, {
        municipalityId: actor.municipalityId,
        sectorCode: codigo,
      });
      numeracaoBySetor.set(sectorId, { prefix, seqLen, seq: sequencial });
    }
    const proximoNumero = (sectorId: string): string => {
      const n = numeracaoBySetor.get(sectorId)!;
      const numero = formatNumero(n.prefix, n.seqLen, n.seq);
      n.seq += 1;
      return numero;
    };

    // Resolve (find-or-create) o Almoxarifado de cada setor envolvido. Os bens
    // entram aqui e a secretaria distribui depois para os locais reais.
    const almoxBySetor = new Map<string, string>(); // sectorId -> localId
    for (const sectorId of new Set(itensNovos.map((it) => it.sectorId))) {
      const existente = await tx.local.findFirst({
        where: {
          sectorId,
          municipalityId: actor.municipalityId,
          name: { equals: ALMOXARIFADO_LOCAL_NOME, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (existente) {
        almoxBySetor.set(sectorId, existente.id);
      } else {
        const novo = await tx.local.create({
          data: {
            name: ALMOXARIFADO_LOCAL_NOME,
            description: 'Local de entrada dos bens importados (aguardando distribuição)',
            sectorId,
            municipalityId: actor.municipalityId!,
          },
          select: { id: true },
        });
        almoxBySetor.set(sectorId, novo.id);
      }
    }

    // Find-or-create dos TIPOS e FORMAS DE AQUISIÇÃO referenciados pelo lote.
    // Assim os valores derivados do relatório já entram nas tabelas de referência
    // (aparecem nos dropdowns do cadastro manual) e cada bem fica LINKADO via FK
    // (tipoId/acquisitionFormId) — não só na string. Match case-insensitive para
    // não duplicar um tipo/forma que já exista com grafia diferente.
    let tiposCriadosTx = 0;
    let formasCriadasTx = 0;
    const tipoIdByNome = new Map<string, string>();
    for (const nome of new Set(itensNovos.map(nomeTipo))) {
      const existente = await tx.tipoBem.findFirst({
        where: { municipalityId: actor.municipalityId, nome: { equals: nome, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existente) {
        tipoIdByNome.set(nome, existente.id);
      } else {
        const novo = await tx.tipoBem.create({
          data: {
            nome,
            descricao: 'Cadastrado automaticamente na importação de liquidação SIAFIC',
            municipalityId: actor.municipalityId!,
          },
          select: { id: true },
        });
        tipoIdByNome.set(nome, novo.id);
        tiposCriadosTx += 1;
      }
    }

    const formaIdByNome = new Map<string, string>();
    for (const nome of new Set(itensNovos.map(nomeForma))) {
      const existente = await tx.acquisitionForm.findFirst({
        where: { municipalityId: actor.municipalityId, nome: { equals: nome, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existente) {
        formaIdByNome.set(nome, existente.id);
      } else {
        const novo = await tx.acquisitionForm.create({
          data: {
            nome,
            descricao: 'Cadastrado automaticamente na importação de liquidação SIAFIC',
            municipalityId: actor.municipalityId!,
          },
          select: { id: true },
        });
        formaIdByNome.set(nome, novo.id);
        formasCriadasTx += 1;
      }
    }

    const registros: { id: string; numero_patrimonio: string }[] = [];
    for (const it of itensNovos) {
      const setorNome = setoresCache.get(it.sectorId)?.name ?? it.setorNome;
      // Usa a trilha contábil completa montada no parse; cai num texto mínimo se
      // o item vier sem ela (ex.: cadastro manual reaproveitando a função).
      const obs =
        it.observacoes?.trim() ||
        [
          it.numeroLiquidacao ? `Liquidação ${it.numeroLiquidacao}` : '',
          'Importado do relatório de liquidação SIAFIC',
        ]
          .filter(Boolean)
          .join(' — ');

      for (let u = 0; u < it.quantidade; u++) {
        const p = await tx.patrimonio.create({
          data: {
            numero_patrimonio: proximoNumero(it.sectorId),
            descricao_bem: it.descricao.trim(),
            tipo: nomeTipo(it),
            // FK p/ a tabela de referência (cadastrada/resolvida acima).
            tipoId: tipoIdByNome.get(nomeTipo(it)) ?? null,
            data_aquisicao: new Date(it.dataAquisicao),
            valor_aquisicao: it.valorUnitario,
            quantidade: 1,
            numero_nota_fiscal: it.numeroNotaFiscal ?? null,
            forma_aquisicao: nomeForma(it),
            acquisitionFormId: formaIdByNome.get(nomeForma(it)) ?? null,
            // Processo de empenho (licitação/dispensa) e ano — referência do
            // processo de aquisição do bem.
            numero_licitacao: it.numeroLicitacao ?? null,
            ano_licitacao: it.anoLicitacao ?? null,
            setor_responsavel: setorNome,
            // Tombado no almoxarifado da secretaria; a secretaria distribui depois.
            local_objeto: it.localObjeto?.trim() || ALMOXARIFADO_LOCAL_NOME,
            localId: almoxBySetor.get(it.sectorId) ?? null,
            status: 'ativo',
            situacao_bem: 'OTIMO', // bens novos
            destinacao: 'uso_especial',
            destinacaoRevisada: true,
            tipo_posse: 'proprio',
            origem_recurso: it.origemRecurso ?? null,
            fundo_recurso: it.fundoRecurso?.trim() || null,
            fornecedor: it.fornecedor ?? null,
            numero_empenho: it.numeroEmpenho ?? null,
            numero_liquidacao: it.numeroLiquidacao ?? null,
            metodo_depreciacao: 'Linear',
            vida_util_anos: it.vidaUtilAnos ?? null,
            valor_residual: it.valorResidual ?? null,
            observacoes: obs,
            municipalityId: actor.municipalityId,
            sectorId: it.sectorId,
            createdBy: actor.userId,
          },
          select: { id: true, numero_patrimonio: true },
        });
        // Registra o evento de criação por bem (aparece na aba de histórico do
        // BensView e na Análise Temporal desde o início).
        await tx.historicoEntry.create({
          data: {
            patrimonioId: p.id,
            date: new Date(),
            action: 'IMPORTAÇÃO',
            details: [
              'Bem importado do relatório de liquidação SIAFIC',
              it.numeroNotaFiscal ? `NF ${it.numeroNotaFiscal}` : '',
              it.numeroLiquidacao ? `Liquidação ${it.numeroLiquidacao}` : '',
            ]
              .filter(Boolean)
              .join(' — '),
            user: actor.userId,
          },
        });
        registros.push(p);
      }
    }

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'IMPORTAR_PATRIMONIOS_LIQUIDACAO',
        entityType: 'Patrimonio',
        entityId: registros[0].id,
        details: `Importados ${registros.length} bens do relatório de liquidação (${itensNovos.length} de ${itens.length} linhas${duplicatasTx > 0 ? `; ${duplicatasTx} já existentes ignoradas` : ''})`,
      },
    });

    return { registros, tiposCriadosTx, formasCriadasTx, duplicatasTx };
  }, {
    // Lote pode ter até MAX_UNIDADES (2000) bens, cada um com create + histórico.
    // O default de 5s da transação interativa do Prisma estouraria (P2028).
    maxWait: 15000,
    timeout: 120000,
  });
    criados = resultadoTx.registros;
    tiposCriados = resultadoTx.tiposCriadosTx;
    formasCriadas = resultadoTx.formasCriadasTx;
    duplicatas = resultadoTx.duplicatasTx;
    break; // sucesso
  } catch (err) {
    const conflitoNumeracao =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
    if (conflitoNumeracao && tentativa < MAX_TENTATIVAS_NUMERACAO) {
      logWarn('Conflito de numeração na importação — refazendo', {
        tentativa,
        municipalityId: actor.municipalityId,
      });
      continue; // re-lê o maior número e tenta novamente
    }
    if (conflitoNumeracao) {
      throw new ImportacaoValidationError(
        'Conflito de numeração após várias tentativas — tente novamente em instantes',
      );
    }
    throw err;
  }
  }

  await redisCache.deletePattern('patrimonios:*');
  // Tipos/formas cadastrados aparecem nos dropdowns no próximo carregamento
  // (as listas usam só Cache-Control HTTP de 60s, sem cache Redis a invalidar).
  logInfo('✅ Importação de patrimônios concluída', {
    total: criados.length,
    tiposCriados,
    formasCriadas,
    duplicatas,
  });
  return {
    total: criados.length,
    linhas: itens.length,
    patrimonios: criados,
    tiposCriados,
    formasCriadas,
    duplicatas,
  };
};
