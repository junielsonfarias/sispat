/**
 * termosService — gera os dados estruturados dos termos patrimoniais (read-only),
 * para o frontend renderizar/imprimir:
 *   - carga         (Art. 14 da Lei / Art. 6 do Decreto)
 *   - incorporacao  (Art. 11 da Lei / Art. 5 do Decreto)
 *   - baixa         (Art. 25 da Lei / Art. 15 do Decreto)
 */

import { prisma } from '../config/database';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
  name?: string;
}

export type TipoTermo = 'carga' | 'incorporacao' | 'baixa';

export class TermoNotFoundError extends Error {
  constructor(message = 'Bem não encontrado') {
    super(message);
    this.name = 'TermoNotFoundError';
  }
}

export class TermoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TermoValidationError';
  }
}

const TEXTO_LEGAL: Record<TipoTermo, { titulo: string; referencia: string; corpo: string }> = {
  carga: {
    titulo: 'TERMO DE CARGA (RESPONSABILIDADE)',
    referencia: 'Art. 14 da Lei de Gestão Patrimonial / Art. 6 do Decreto',
    corpo:
      'Pelo presente termo, o agente responsável recebe o(s) bem(ns) abaixo discriminado(s), ' +
      'assumindo a responsabilidade pela sua guarda, conservação e correta utilização, nos termos da Lei.',
  },
  incorporacao: {
    titulo: 'TERMO DE INCORPORAÇÃO',
    referencia: 'Art. 11 da Lei de Gestão Patrimonial / Art. 5 do Decreto',
    corpo:
      'Fica formalizada a incorporação do bem abaixo ao acervo patrimonial do Município, ' +
      'com o correspondente registro patrimonial e reconhecimento contábil.',
  },
  baixa: {
    titulo: 'TERMO DE BAIXA PATRIMONIAL',
    referencia: 'Art. 25 da Lei de Gestão Patrimonial / Art. 15 do Decreto',
    corpo:
      'Fica formalizada a baixa do bem abaixo do acervo patrimonial do Município, ' +
      'com comunicação à Contabilidade para o respectivo registro.',
  },
};

const loadPatrimonioParaTermo = async (patrimonioId: string, actor: Actor) => {
  const p = await prisma.patrimonio.findUnique({
    where: { id: patrimonioId },
    include: {
      sector: { select: { name: true, codigo: true } },
      local: { select: { name: true } },
      municipality: { select: { name: true, state: true } },
    },
  });
  if (!p || (actor.role !== 'superuser' && p.municipalityId !== actor.municipalityId)) {
    throw new TermoNotFoundError();
  }
  return p;
};

type PatrimonioParaTermo = Awaited<ReturnType<typeof loadPatrimonioParaTermo>>;

const montarTermo = (
  tipo: TipoTermo,
  p: PatrimonioParaTermo,
  extra?: { numero?: string; emitidoEm?: Date },
) => {
  const textos = TEXTO_LEGAL[tipo];
  return {
    tipo,
    titulo: textos.titulo,
    referenciaLegal: textos.referencia,
    corpo: textos.corpo,
    numero: extra?.numero ?? null,
    emitidoEm: extra?.emitidoEm ? extra.emitidoEm.toISOString() : null,
    geradoEm: new Date().toISOString(),
    municipio: { nome: p.municipality.name, estado: p.municipality.state },
    bem: {
      numero_patrimonio: p.numero_patrimonio,
      descricao_bem: p.descricao_bem,
      tipo: p.tipo,
      marca: p.marca,
      modelo: p.modelo,
      numero_serie: p.numero_serie,
      estado_conservacao: p.situacao_bem,
      valor_aquisicao: p.valor_aquisicao,
      data_aquisicao: p.data_aquisicao,
      forma_aquisicao: p.forma_aquisicao,
      status: p.status,
      destinacao: p.destinacao,
      setor: p.sector?.name ?? p.setor_responsavel,
      setor_codigo: p.sector?.codigo ?? null,
      local: p.local?.name ?? p.local_objeto,
      responsavel: p.setor_responsavel,
    },
    // Campos específicos do termo de baixa.
    baixa:
      tipo === 'baixa'
        ? { data_baixa: p.data_baixa, motivo_baixa: p.motivo_baixa }
        : undefined,
  };
};

export const getTermo = async (tipo: TipoTermo, patrimonioId: string, actor: Actor) => {
  const p = await loadPatrimonioParaTermo(patrimonioId, actor);

  if (tipo === 'baixa' && p.status !== 'baixado') {
    throw new TermoValidationError('O termo de baixa só é válido para bens baixados');
  }

  return montarTermo(tipo, p);
};

const ACTION_TERMO_CARGA = 'TERMO_CARGA_EMITIDO';

// Número sequencial do termo de carga por município/ano: TC-AAAA-NNNN.
const gerarNumeroTermoCarga = async (municipalityId: string): Promise<string> => {
  const ano = new Date().getFullYear();
  const inicioAno = new Date(ano, 0, 1);
  const emitidosNoAno = await prisma.historicoEntry.count({
    where: {
      action: ACTION_TERMO_CARGA,
      date: { gte: inicioAno },
      patrimonio: { municipalityId },
    },
  });
  return `TC-${ano}-${String(emitidosNoAno + 1).padStart(4, '0')}`;
};

/**
 * Emite (formaliza) o termo de carga do bem — Art. 14 e Art. 34 da Lei: a
 * responsabilidade do agente consolida-se a partir da emissão/assinatura do
 * termo. Persiste a emissão em HistoricoEntry (número sequencial + data +
 * responsável) e retorna o termo com o número atribuído.
 */
export const emitirTermoCarga = async (patrimonioId: string, actor: Actor) => {
  const p = await loadPatrimonioParaTermo(patrimonioId, actor);
  if (p.status === 'baixado') {
    throw new TermoValidationError('Não é possível emitir termo de carga de um bem baixado');
  }

  const numero = await gerarNumeroTermoCarga(p.municipalityId);
  const emitidoEm = new Date();
  const responsavel = p.sector?.name ?? p.setor_responsavel;

  await prisma.historicoEntry.create({
    data: {
      patrimonioId: p.id,
      date: emitidoEm,
      action: ACTION_TERMO_CARGA,
      details: `Termo de carga ${numero} emitido — responsável: ${responsavel} (Art. 14/34)`,
      user: actor.name ?? actor.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: ACTION_TERMO_CARGA,
      entityType: 'Patrimonio',
      entityId: p.id,
      details: `Termo de carga ${numero} do bem ${p.numero_patrimonio}`,
    },
  });

  return montarTermo('carga', p, { numero, emitidoEm });
};
