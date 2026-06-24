/**
 * desfazimentoService — desfazimento de bens inservíveis (Art. 24 da Lei /
 * Art. 13-14 do Decreto). Ao CONCLUIR, dá baixa no patrimônio (Art. 25).
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache } from '../config/redis';
import { logInfo } from '../config/logger';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export class DesfazimentoNotFoundError extends Error {
  constructor(message = 'Desfazimento não encontrado') {
    super(message);
    this.name = 'DesfazimentoNotFoundError';
  }
}

export class DesfazimentoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesfazimentoValidationError';
  }
}

// Estados em que o bem não pode entrar em desfazimento / ser baixado.
const STATUS_BLOQUEADO = ['baixado', 'emprestado', 'em_transferencia'];

// Modalidades de desfazimento que TRANSFEREM A PROPRIEDADE (alienação). Exigem
// que o bem seja dominical — bens de uso comum/especial são inalienáveis sem
// desafetação prévia (Lei art. 6 §1, 22 e 23). Inutilização (destruição de bem
// irrecuperável) NÃO é alienação e dispensa desafetação.
const MODALIDADES_ALIENACAO = ['doacao', 'leilao', 'permuta', 'cessao', 'transferencia'];

const assertDesafetadoParaAlienacao = (modalidade: string, destinacao: string) => {
  if (MODALIDADES_ALIENACAO.includes(modalidade) && destinacao !== 'dominical') {
    const origem =
      destinacao === 'nao_classificado' ? 'destinação não classificada' : 'uso comum/especial';
    throw new DesfazimentoValidationError(
      `Bem de ${origem} não pode ser alienado por ${modalidade} sem desafetação prévia (Art. 22 e 23). ` +
        `Realize a desafetação do bem (torná-lo dominical) antes de prosseguir.`,
    );
  }
};

// Art. 23 da Lei / Art. 14 do Decreto: a alienação exige avaliação prévia (laudo
// de valor justo). Modalidades de alienação não podem ser instruídas sem o valor
// de avaliação. Inutilização (destruição de irrecuperável) dispensa avaliação.
const assertAvaliacaoParaAlienacao = (modalidade: string, valorAvaliacao?: number | null) => {
  if (MODALIDADES_ALIENACAO.includes(modalidade) && (valorAvaliacao == null || valorAvaliacao <= 0)) {
    throw new DesfazimentoValidationError(
      `A alienação por ${modalidade} exige avaliação prévia do bem (Art. 23 da Lei / Art. 14 do Decreto). ` +
        `Informe o valor de avaliação (> 0) antes de prosseguir.`,
    );
  }
};

const loadPatrimonio = async (patrimonioId: string, actor: Actor) => {
  const p = await prisma.patrimonio.findUnique({
    where: { id: patrimonioId },
    select: {
      id: true,
      status: true,
      numero_patrimonio: true,
      municipalityId: true,
      destinacao: true,
    },
  });
  if (!p || (actor.role !== 'superuser' && p.municipalityId !== actor.municipalityId)) {
    throw new DesfazimentoNotFoundError('Patrimônio não encontrado');
  }
  return p;
};

interface ListQuery {
  page?: string;
  limit?: string;
  status?: string;
  classificacao?: string;
}

export const listDesfazimentos = async (query: ListQuery, actor: Actor) => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit ?? '50', 10) || 50));

  const where: Prisma.DesfazimentoWhereInput = {};
  if (actor.role !== 'superuser') where.municipalityId = actor.municipalityId;
  if (query.status) where.status = query.status as Prisma.DesfazimentoWhereInput['status'];
  if (query.classificacao)
    where.classificacao = query.classificacao as Prisma.DesfazimentoWhereInput['classificacao'];

  const [desfazimentos, total] = await Promise.all([
    prisma.desfazimento.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        comissao: { select: { id: true, tipo: true, portariaNumero: true } },
        patrimonio: { select: { id: true, numero_patrimonio: true, descricao_bem: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.desfazimento.count({ where }),
  ]);

  return { desfazimentos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getDesfazimentoById = async (id: string, actor: Actor) => {
  const d = await prisma.desfazimento.findUnique({
    where: { id },
    include: {
      comissao: { select: { id: true, tipo: true, status: true, portariaNumero: true } },
      patrimonio: { select: { id: true, numero_patrimonio: true, descricao_bem: true, status: true } },
    },
  });
  if (!d) throw new DesfazimentoNotFoundError();
  if (actor.role !== 'superuser' && d.municipalityId !== actor.municipalityId) {
    throw new DesfazimentoNotFoundError();
  }
  return d;
};

const validateComissao = async (comissaoId: string, actor: Actor) => {
  const c = await prisma.comissao.findUnique({
    where: { id: comissaoId },
    select: { id: true, municipalityId: true },
  });
  if (!c || (actor.role !== 'superuser' && c.municipalityId !== actor.municipalityId)) {
    throw new DesfazimentoValidationError('Comissão inválida');
  }
};

// Valida a comissão para um PROCESSO de desfazimento: além do tenant, exige o
// tipo correto e status ativo (Art. 14 do Decreto / Art. 19, IV da Lei). Usada
// na criação em lote para falhar cedo, e não só na conclusão.
const validateComissaoParaDesfazimento = async (comissaoId: string, actor: Actor) => {
  const c = await prisma.comissao.findUnique({
    where: { id: comissaoId },
    select: { id: true, municipalityId: true, tipo: true, status: true },
  });
  if (!c || (actor.role !== 'superuser' && c.municipalityId !== actor.municipalityId)) {
    throw new DesfazimentoValidationError('Comissão inválida');
  }
  if (c.tipo !== 'desfazimento_desafetacao') {
    throw new DesfazimentoValidationError(
      'A comissão vinculada deve ser do tipo "desfazimento_desafetacao" (Art. 19, IV).',
    );
  }
  if (c.status !== 'ativa') {
    throw new DesfazimentoValidationError(
      'A Comissão de Desfazimento e Desafetação vinculada não está ativa — designe/renove antes de prosseguir.',
    );
  }
};

export interface CreateDesfazimentoInput {
  patrimonioId: string;
  classificacao: string;
  modalidade: string;
  valorAvaliacao?: number | null;
  justificativa: string;
  laudo?: string | null;
  comissaoId?: string | null;
  observacoes?: string | null;
}

export const createDesfazimento = async (input: CreateDesfazimentoInput, actor: Actor) => {
  const patrimonio = await loadPatrimonio(input.patrimonioId, actor);
  if (patrimonio.status === 'baixado') {
    throw new DesfazimentoValidationError('Patrimônio já está baixado');
  }
  // Art. 22/23: alienar exige bem dominical (desafetação prévia).
  assertDesafetadoParaAlienacao(input.modalidade, patrimonio.destinacao);
  // Art. 23/14 Decreto: alienar exige avaliação prévia.
  assertAvaliacaoParaAlienacao(input.modalidade, input.valorAvaliacao);
  if (input.comissaoId) await validateComissao(input.comissaoId, actor);

  const emAndamento = await prisma.desfazimento.findFirst({
    where: { patrimonioId: input.patrimonioId, status: 'em_andamento' },
    select: { id: true },
  });
  if (emAndamento) {
    throw new DesfazimentoValidationError('Já existe um desfazimento em andamento para este bem');
  }

  const created = await prisma.desfazimento.create({
    data: {
      patrimonioId: input.patrimonioId,
      classificacao: input.classificacao as Prisma.DesfazimentoCreateInput['classificacao'],
      modalidade: input.modalidade as Prisma.DesfazimentoCreateInput['modalidade'],
      valorAvaliacao: input.valorAvaliacao ?? null,
      justificativa: input.justificativa,
      laudo: input.laudo ?? null,
      comissaoId: input.comissaoId ?? null,
      observacoes: input.observacoes ?? null,
      municipalityId: actor.municipalityId,
      createdBy: actor.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'CREATE_DESFAZIMENTO',
      entityType: 'Desfazimento',
      entityId: created.id,
      details: `Desfazimento iniciado (${created.classificacao}/${created.modalidade}) para ${patrimonio.numero_patrimonio}`,
    },
  });

  logInfo('✅ Desfazimento criado', { id: created.id });
  return created;
};

export interface CreateDesfazimentoLoteInput {
  bens: { patrimonioId: string; valorAvaliacao?: number | null }[];
  classificacao: string;
  modalidade: string;
  justificativa: string;
  laudo?: string | null;
  comissaoId?: string | null;
  observacoes?: string | null;
}

// Desfazimento em LOTE (Art. 24): um processo/comissão para vários bens da mesma
// classificação e modalidade. O valor de avaliação é POR bem. Atômico: valida
// todos antes; ou cria todos, ou nenhum.
export const createDesfazimentoLote = async (input: CreateDesfazimentoLoteInput, actor: Actor) => {
  if (!input.bens?.length) {
    throw new DesfazimentoValidationError('Informe ao menos um bem para o lote');
  }

  // Defesa em profundidade: os novos registros gravam actor.municipalityId. Um
  // superuser fora do contexto de um município geraria registros com tenant nulo.
  if (actor.role === 'superuser' && !actor.municipalityId) {
    throw new DesfazimentoValidationError(
      'Superuser deve operar no contexto de um município para criar desfazimentos em lote',
    );
  }

  // Sem bens repetidos no lote.
  const ids = new Set<string>();
  for (const b of input.bens) {
    if (ids.has(b.patrimonioId)) {
      throw new DesfazimentoValidationError('Há bens repetidos no lote');
    }
    ids.add(b.patrimonioId);
  }

  // Se uma comissão é informada já na abertura do lote, ela deve ser do tipo e
  // status que a conclusão exigirá (Art. 14 do Decreto / Art. 19, IV) — bloqueia
  // guardar uma comissão que seria rejeitada na conclusão.
  if (input.comissaoId) await validateComissaoParaDesfazimento(input.comissaoId, actor);

  // Valida CADA bem antes da transação (tenant, status, desafetação, avaliação, duplicata).
  const validados: { patrimonioId: string; valorAvaliacao: number | null }[] = [];
  for (const b of input.bens) {
    const patrimonio = await loadPatrimonio(b.patrimonioId, actor);
    if (patrimonio.status === 'baixado') {
      throw new DesfazimentoValidationError(`Patrimônio ${patrimonio.numero_patrimonio} já está baixado`);
    }
    assertDesafetadoParaAlienacao(input.modalidade, patrimonio.destinacao);
    assertAvaliacaoParaAlienacao(input.modalidade, b.valorAvaliacao);

    const emAndamento = await prisma.desfazimento.findFirst({
      where: { patrimonioId: b.patrimonioId, status: 'em_andamento' },
      select: { id: true },
    });
    if (emAndamento) {
      throw new DesfazimentoValidationError(
        `Já existe um desfazimento em andamento para o bem ${patrimonio.numero_patrimonio}`,
      );
    }
    validados.push({ patrimonioId: b.patrimonioId, valorAvaliacao: b.valorAvaliacao ?? null });
  }

  const desfazimentos = await prisma.$transaction(async (tx) => {
    const registros = [];
    for (const v of validados) {
      const d = await tx.desfazimento.create({
        data: {
          patrimonioId: v.patrimonioId,
          classificacao: input.classificacao as Prisma.DesfazimentoCreateInput['classificacao'],
          modalidade: input.modalidade as Prisma.DesfazimentoCreateInput['modalidade'],
          valorAvaliacao: v.valorAvaliacao,
          justificativa: input.justificativa,
          laudo: input.laudo ?? null,
          comissaoId: input.comissaoId ?? null,
          observacoes: input.observacoes ?? null,
          municipalityId: actor.municipalityId,
          createdBy: actor.userId,
        },
      });
      registros.push(d);
    }
    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'CREATE_DESFAZIMENTO_LOTE',
        entityType: 'Desfazimento',
        entityId: registros[0].id,
        details: `Desfazimento em lote (${registros.length} bens) — ${input.classificacao}/${input.modalidade}`,
      },
    });
    return registros;
  });

  logInfo('✅ Desfazimento em lote criado', { total: desfazimentos.length });
  return { total: desfazimentos.length, desfazimentos };
};

export interface UpdateDesfazimentoInput {
  classificacao?: string;
  modalidade?: string;
  valorAvaliacao?: number | null;
  justificativa?: string;
  laudo?: string | null;
  comissaoId?: string | null;
  observacoes?: string | null;
}

export const updateDesfazimento = async (
  id: string,
  input: UpdateDesfazimentoInput,
  actor: Actor,
) => {
  const existing = await getDesfazimentoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new DesfazimentoValidationError('Apenas desfazimentos em andamento podem ser editados');
  }
  if (input.comissaoId) await validateComissao(input.comissaoId, actor);

  // Art. 23: ao mudar modalidade/avaliação, revalida a exigência de avaliação
  // prévia (senão dava para abrir como inutilização e trocar p/ leilão zerando o
  // valor). A desafetação prévia é reexigida na conclusão (com a destinação atual
  // do bem). Usa o valor efetivo (novo se informado, senão o existente).
  if (input.modalidade !== undefined || input.valorAvaliacao !== undefined) {
    const modalidade = input.modalidade ?? existing.modalidade;
    const valorAvaliacao =
      input.valorAvaliacao !== undefined ? input.valorAvaliacao : existing.valorAvaliacao;
    assertAvaliacaoParaAlienacao(modalidade, valorAvaliacao);
  }

  const data: Prisma.DesfazimentoUpdateInput = {};
  if (input.classificacao !== undefined)
    data.classificacao = input.classificacao as Prisma.DesfazimentoUpdateInput['classificacao'];
  if (input.modalidade !== undefined)
    data.modalidade = input.modalidade as Prisma.DesfazimentoUpdateInput['modalidade'];
  if (input.valorAvaliacao !== undefined) data.valorAvaliacao = input.valorAvaliacao;
  if (input.justificativa !== undefined) data.justificativa = input.justificativa;
  if (input.laudo !== undefined) data.laudo = input.laudo;
  if (input.observacoes !== undefined) data.observacoes = input.observacoes;
  if (input.comissaoId !== undefined) {
    data.comissao = input.comissaoId
      ? { connect: { id: input.comissaoId } }
      : { disconnect: true };
  }

  return prisma.desfazimento.update({ where: { id }, data });
};

// Conclui o desfazimento: baixa o patrimônio (Art. 25), em transação.
export const concluirDesfazimento = async (id: string, actor: Actor) => {
  const existing = await getDesfazimentoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new DesfazimentoValidationError('Este desfazimento não está em andamento');
  }

  // Art. 14 do Decreto / Art. 19, IV da Lei: o desfazimento se conclui mediante
  // processo instruído com laudo de classificação da Comissão de Desfazimento e
  // Desafetação. A comissão pode ser associada depois da abertura, mas a
  // conclusão (que baixa o bem) exige a comissão correta e em exercício.
  if (!existing.comissaoId || !existing.comissao) {
    throw new DesfazimentoValidationError(
      'A conclusão do desfazimento exige a Comissão de Desfazimento e Desafetação ' +
        '(Art. 14 do Decreto / Art. 19, IV da Lei). Associe uma comissão antes de concluir.',
    );
  }
  if (existing.comissao.tipo !== 'desfazimento_desafetacao') {
    throw new DesfazimentoValidationError(
      'A comissão vinculada deve ser do tipo "desfazimento_desafetacao" para concluir (Art. 19, IV).',
    );
  }
  if (existing.comissao.status !== 'ativa') {
    throw new DesfazimentoValidationError(
      'A Comissão de Desfazimento e Desafetação vinculada não está ativa — designe/renove antes de concluir.',
    );
  }

  const patrimonio = await loadPatrimonio(existing.patrimonioId, actor);
  if (STATUS_BLOQUEADO.includes(patrimonio.status)) {
    throw new DesfazimentoValidationError(
      `Não é possível baixar um bem com status "${patrimonio.status}"`,
    );
  }
  // Art. 22/23: revalida no momento da alienação (a modalidade pode ter mudado
  // via update). Tanto a desafetação prévia quanto a avaliação prévia são
  // reexigidas aqui — este é o ato terminal (baixa), o ponto sem retorno.
  assertDesafetadoParaAlienacao(existing.modalidade, patrimonio.destinacao);
  assertAvaliacaoParaAlienacao(existing.modalidade, existing.valorAvaliacao);

  const result = await prisma.$transaction(async (tx) => {
    await tx.patrimonio.update({
      where: { id: existing.patrimonioId },
      data: {
        status: 'baixado',
        data_baixa: new Date(),
        motivo_baixa: `Desfazimento (${existing.modalidade}): ${existing.justificativa}`,
      },
    });

    await tx.historicoEntry.create({
      data: {
        patrimonioId: existing.patrimonioId,
        date: new Date(),
        action: 'DESFAZIMENTO',
        details: `Baixa por desfazimento — inservível ${existing.classificacao}, modalidade ${existing.modalidade}`,
        user: actor.userId,
      },
    });

    const updated = await tx.desfazimento.update({
      where: { id },
      data: { status: 'concluido', dataConclusao: new Date() },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'CONCLUDE_DESFAZIMENTO',
        entityType: 'Desfazimento',
        entityId: id,
        details: `Desfazimento concluído — ${patrimonio.numero_patrimonio} baixado (${existing.modalidade})`,
      },
    });

    return updated;
  });

  await redisCache.deletePattern('patrimonios:*');
  logInfo('✅ Desfazimento concluído', { id, patrimonioId: existing.patrimonioId });
  return result;
};

export const cancelarDesfazimento = async (id: string, actor: Actor) => {
  const existing = await getDesfazimentoById(id, actor);
  if (existing.status !== 'em_andamento') {
    throw new DesfazimentoValidationError('Apenas desfazimentos em andamento podem ser cancelados');
  }
  return prisma.desfazimento.update({ where: { id }, data: { status: 'cancelado' } });
};

export const deleteDesfazimento = async (id: string, actor: Actor) => {
  const existing = await getDesfazimentoById(id, actor);
  if (existing.status === 'concluido') {
    throw new DesfazimentoValidationError('Desfazimento concluído não pode ser excluído');
  }
  await prisma.desfazimento.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_DESFAZIMENTO',
      entityType: 'Desfazimento',
      entityId: id,
      details: 'Desfazimento excluído',
    },
  });
};
