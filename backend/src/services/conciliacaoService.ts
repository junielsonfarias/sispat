/**
 * conciliacaoService — conciliação físico-contábil / SIAFIC (Art. 3 II, Art. 8 V).
 *
 * O saldo CONTÁBIL é informado (origem SIAFIC). O saldo FÍSICO é calculado a
 * partir do acervo (custo histórico = soma de valor_aquisicao), por categoria.
 * A divergência (físico - contábil) define o status.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logInfo } from '../config/logger';
import { valorContabilLiquido } from '../utils/depreciation';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export class ConciliacaoNotFoundError extends Error {
  constructor(message = 'Conciliação não encontrada') {
    super(message);
    this.name = 'ConciliacaoNotFoundError';
  }
}

export class ConciliacaoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConciliacaoValidationError';
  }
}

type Categoria = 'bens_moveis' | 'bens_imoveis';

const TOLERANCIA = 0.01;

// Saldo físico = valor contábil LÍQUIDO do acervo na data de referência
// (custo - depreciação acumulada, piso no residual), para casar com o saldo do
// SIAFIC. Bens móveis excluem os baixados (já saíram do ativo). Imóveis não têm
// campos de depreciação no model, então entram pelo valor de aquisição (bruto).
export const calcularSaldoFisico = async (
  categoria: Categoria,
  municipalityId: string,
  ref: Date = new Date(),
): Promise<number> => {
  if (categoria === 'bens_moveis') {
    const bens = await prisma.patrimonio.findMany({
      where: { municipalityId, status: { not: 'baixado' } },
      select: {
        valor_aquisicao: true,
        data_aquisicao: true,
        vida_util_anos: true,
        valor_residual: true,
      },
    });
    const total = bens.reduce((acc, b) => acc + valorContabilLiquido(b, ref), 0);
    return Number(total.toFixed(2));
  }
  const agg = await prisma.imovel.aggregate({
    _sum: { valor_aquisicao: true },
    where: { municipalityId },
  });
  return agg._sum.valor_aquisicao ?? 0;
};

const statusFor = (divergencia: number): 'conciliada' | 'divergente' =>
  Math.abs(divergencia) < TOLERANCIA ? 'conciliada' : 'divergente';

interface ListQuery {
  page?: string;
  limit?: string;
  categoria?: string;
  status?: string;
}

export const listConciliacoes = async (query: ListQuery, actor: Actor) => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit ?? '50', 10) || 50));

  const where: Prisma.ConciliacaoWhereInput = {};
  if (actor.role !== 'superuser') where.municipalityId = actor.municipalityId;
  if (query.categoria) where.categoria = query.categoria as Prisma.ConciliacaoWhereInput['categoria'];
  if (query.status) where.status = query.status as Prisma.ConciliacaoWhereInput['status'];

  const [conciliacoes, total] = await Promise.all([
    prisma.conciliacao.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ competencia: 'desc' }, { categoria: 'asc' }],
    }),
    prisma.conciliacao.count({ where }),
  ]);

  return { conciliacoes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getConciliacaoById = async (id: string, actor: Actor) => {
  const c = await prisma.conciliacao.findUnique({ where: { id } });
  if (!c) throw new ConciliacaoNotFoundError();
  if (actor.role !== 'superuser' && c.municipalityId !== actor.municipalityId) {
    throw new ConciliacaoNotFoundError();
  }
  return c;
};

export interface CreateConciliacaoInput {
  competencia: string;
  dataBase: string | Date;
  categoria: Categoria;
  valorContabil: number;
  observacoes?: string | null;
}

export const createConciliacao = async (input: CreateConciliacaoInput, actor: Actor) => {
  if (actor.role === 'superuser' && !actor.municipalityId) {
    throw new ConciliacaoValidationError('Superuser deve operar no contexto de um município');
  }
  const municipalityId = actor.municipalityId;

  const existing = await prisma.conciliacao.findFirst({
    where: { municipalityId, competencia: input.competencia, categoria: input.categoria },
    select: { id: true },
  });
  if (existing) {
    throw new ConciliacaoValidationError(
      'Já existe conciliação para esta competência e categoria',
    );
  }

  // Depreciação calculada na data-base da conciliação (mesma referência do saldo contábil).
  const valorFisico = await calcularSaldoFisico(
    input.categoria,
    municipalityId,
    new Date(input.dataBase),
  );
  const divergencia = Number((valorFisico - input.valorContabil).toFixed(2));

  const created = await prisma.conciliacao.create({
    data: {
      competencia: input.competencia,
      dataBase: new Date(input.dataBase),
      categoria: input.categoria as Prisma.ConciliacaoCreateInput['categoria'],
      valorContabil: input.valorContabil,
      valorFisico,
      divergencia,
      status: statusFor(divergencia),
      observacoes: input.observacoes ?? null,
      municipalityId,
      createdBy: actor.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'CREATE_CONCILIACAO',
      entityType: 'Conciliacao',
      entityId: created.id,
      details: `Conciliação ${created.competencia}/${created.categoria} — divergência ${divergencia}`,
    },
  });

  logInfo('✅ Conciliação criada', { id: created.id, status: created.status, divergencia });
  return created;
};

// Recalcula o saldo físico (o acervo pode ter mudado desde a criação).
export const recalcularConciliacao = async (id: string, actor: Actor) => {
  const existing = await getConciliacaoById(id, actor);
  const valorFisico = await calcularSaldoFisico(
    existing.categoria as Categoria,
    existing.municipalityId,
    new Date(existing.dataBase),
  );
  const divergencia = Number((valorFisico - existing.valorContabil).toFixed(2));

  return prisma.conciliacao.update({
    where: { id },
    data: { valorFisico, divergencia, status: statusFor(divergencia) },
  });
};

export const deleteConciliacao = async (id: string, actor: Actor) => {
  await getConciliacaoById(id, actor);
  await prisma.conciliacao.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_CONCILIACAO',
      entityType: 'Conciliacao',
      entityId: id,
      details: 'Conciliação excluída',
    },
  });
};
