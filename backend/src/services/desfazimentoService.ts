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
      comissao: { select: { id: true, tipo: true, portariaNumero: true } },
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

  const patrimonio = await loadPatrimonio(existing.patrimonioId, actor);
  if (STATUS_BLOQUEADO.includes(patrimonio.status)) {
    throw new DesfazimentoValidationError(
      `Não é possível baixar um bem com status "${patrimonio.status}"`,
    );
  }
  // Art. 22/23: revalida no momento da alienação (a modalidade pode ter mudado).
  assertDesafetadoParaAlienacao(existing.modalidade, patrimonio.destinacao);

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
