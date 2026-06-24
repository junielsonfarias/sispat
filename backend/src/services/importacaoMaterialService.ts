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
      ug = { nome, fontes: [], origemRecursoSugerida: null };
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
      dotacaoAtual = '';
      projAtivAtual = '';
      subCodigoAtual = '';
      subNomeAtual = '';
      coletandoFontes = false;
      nf = null;
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
    const dot = raw.match(/^\s*\d{1,2}\s+\d{3}\s+\d{4}\s+(\d+\.\d+)\s+(.+?)\s*$/);
    if (dot) {
      projAtivAtual = dot[1];
      dotacaoAtual = dot[2].trim();
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
        if (!pt) continue; // pula linha em branco (quebra de página) sem encerrar
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

      itens.push({
        ug: ugAtual,
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
      });
    }
  }

  // Sugere origem por UG quando TODAS as fontes apontam para a mesma origem
  // (ex.: FUNDEB tem 2 fontes, ambas transferência → sugere transferencia_ente).
  for (const ug of ugsMap.values()) {
    const origens = ug.fontes.map((f) => origemDaFonte(f.descricao)).filter((o): o is string => !!o);
    const unicas = Array.from(new Set(origens));
    ug.origemRecursoSugerida = unicas.length === 1 ? unicas[0] : null;
  }

  return {
    exercicio,
    municipio,
    ugs: Array.from(ugsMap.values()),
    itens,
    avisos,
  };
};
