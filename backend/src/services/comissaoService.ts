/**
 * comissaoService — comissões da gestão patrimonial (Art. 19 da Lei / Art. 8 do
 * Decreto Municipal). Mantém regra de tenant (municipalityId), mandato e o
 * mínimo de 3 membros (sinalizado em alertas de conformidade).
 *
 * Mesmo padrão de inventarioService: Actor puro, erros tipados, ActivityLog.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logInfo } from '../config/logger';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export class ComissaoNotFoundError extends Error {
  constructor(message = 'Comissão não encontrada') {
    super(message);
    this.name = 'ComissaoNotFoundError';
  }
}

export class ComissaoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComissaoValidationError';
  }
}

const MIN_MEMBROS = 3;

interface MembroInput {
  userId?: string | null;
  nome: string;
  matricula?: string | null;
  cargo?: string | null;
  papel?: 'presidente' | 'secretario' | 'membro';
}

interface ListQuery {
  page?: string;
  limit?: string;
  tipo?: string;
  status?: string;
  search?: string;
}

const includeMembros = {
  membros: { orderBy: { papel: 'asc' as const } },
  _count: { select: { membros: true, desafetacoes: true } },
};

export const listComissoes = async (query: ListQuery, actor: Actor) => {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit ?? '50', 10) || 50));

  const where: Prisma.ComissaoWhereInput = {};
  if (actor.role !== 'superuser') where.municipalityId = actor.municipalityId;
  if (query.tipo) where.tipo = query.tipo as Prisma.ComissaoWhereInput['tipo'];
  if (query.status) where.status = query.status as Prisma.ComissaoWhereInput['status'];
  if (query.search) {
    where.OR = [
      { nome: { contains: query.search, mode: 'insensitive' } },
      { portariaNumero: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [comissoes, total] = await Promise.all([
    prisma.comissao.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: includeMembros,
      orderBy: { mandatoFim: 'desc' },
    }),
    prisma.comissao.count({ where }),
  ]);

  return {
    comissoes,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getComissaoById = async (id: string, actor: Actor) => {
  const comissao = await prisma.comissao.findUnique({
    where: { id },
    include: { membros: { orderBy: { papel: 'asc' } } },
  });
  if (!comissao) throw new ComissaoNotFoundError();
  if (actor.role !== 'superuser' && comissao.municipalityId !== actor.municipalityId) {
    throw new ComissaoNotFoundError();
  }
  return comissao;
};

const resolveMunicipality = (actor: Actor): string => {
  if (actor.role === 'superuser' && !actor.municipalityId) {
    throw new ComissaoValidationError('Superuser deve operar no contexto de um município');
  }
  return actor.municipalityId;
};

export interface CreateComissaoInput {
  tipo: string;
  nome?: string | null;
  portariaNumero: string;
  portariaData: string | Date;
  mandatoInicio: string | Date;
  mandatoFim: string | Date;
  observacoes?: string | null;
  membros?: MembroInput[];
}

export const createComissao = async (input: CreateComissaoInput, actor: Actor) => {
  const municipalityId = resolveMunicipality(actor);

  const comissao = await prisma.$transaction(async (tx) => {
    const created = await tx.comissao.create({
      data: {
        tipo: input.tipo as Prisma.ComissaoCreateInput['tipo'],
        nome: input.nome ?? null,
        portariaNumero: input.portariaNumero,
        portariaData: new Date(input.portariaData),
        mandatoInicio: new Date(input.mandatoInicio),
        mandatoFim: new Date(input.mandatoFim),
        observacoes: input.observacoes ?? null,
        municipalityId,
        createdBy: actor.userId,
        ...(input.membros && input.membros.length > 0
          ? {
              membros: {
                create: input.membros.map((m) => ({
                  userId: m.userId ?? null,
                  nome: m.nome,
                  matricula: m.matricula ?? null,
                  cargo: m.cargo ?? null,
                  papel: (m.papel ?? 'membro') as Prisma.ComissaoMembroCreateInput['papel'],
                })),
              },
            }
          : {}),
      },
      include: { membros: true },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.userId,
        action: 'CREATE_COMISSAO',
        entityType: 'Comissao',
        entityId: created.id,
        details: `Comissão (${created.tipo}) criada — portaria ${created.portariaNumero}`,
      },
    });

    return created;
  });

  logInfo('✅ Comissão criada', { comissaoId: comissao.id, tipo: comissao.tipo });
  return comissao;
};

export interface UpdateComissaoInput {
  tipo?: string;
  nome?: string | null;
  portariaNumero?: string;
  portariaData?: string | Date;
  mandatoInicio?: string | Date;
  mandatoFim?: string | Date;
  status?: string;
  observacoes?: string | null;
}

export const updateComissao = async (id: string, input: UpdateComissaoInput, actor: Actor) => {
  await getComissaoById(id, actor); // tenant guard

  const data: Prisma.ComissaoUpdateInput = {};
  if (input.tipo !== undefined) data.tipo = input.tipo as Prisma.ComissaoUpdateInput['tipo'];
  if (input.nome !== undefined) data.nome = input.nome;
  if (input.portariaNumero !== undefined) data.portariaNumero = input.portariaNumero;
  if (input.portariaData !== undefined) data.portariaData = new Date(input.portariaData);
  if (input.mandatoInicio !== undefined) data.mandatoInicio = new Date(input.mandatoInicio);
  if (input.mandatoFim !== undefined) data.mandatoFim = new Date(input.mandatoFim);
  if (input.status !== undefined) data.status = input.status as Prisma.ComissaoUpdateInput['status'];
  if (input.observacoes !== undefined) data.observacoes = input.observacoes;

  const updated = await prisma.comissao.update({
    where: { id },
    data,
    include: { membros: { orderBy: { papel: 'asc' } } },
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'UPDATE_COMISSAO',
      entityType: 'Comissao',
      entityId: id,
      details: `Comissão ${updated.portariaNumero} atualizada`,
    },
  });

  return updated;
};

export const deleteComissao = async (id: string, actor: Actor) => {
  const existing = await getComissaoById(id, actor);
  await prisma.comissao.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE_COMISSAO',
      entityType: 'Comissao',
      entityId: id,
      details: `Comissão ${existing.portariaNumero} excluída`,
    },
  });
};

export const addMembro = async (comissaoId: string, input: MembroInput, actor: Actor) => {
  await getComissaoById(comissaoId, actor); // tenant guard
  const membro = await prisma.comissaoMembro.create({
    data: {
      comissaoId,
      userId: input.userId ?? null,
      nome: input.nome,
      matricula: input.matricula ?? null,
      cargo: input.cargo ?? null,
      papel: (input.papel ?? 'membro') as Prisma.ComissaoMembroCreateInput['papel'],
    },
  });
  return membro;
};

export const removeMembro = async (comissaoId: string, membroId: string, actor: Actor) => {
  await getComissaoById(comissaoId, actor); // tenant guard
  const membro = await prisma.comissaoMembro.findFirst({
    where: { id: membroId, comissaoId },
    select: { id: true },
  });
  if (!membro) throw new ComissaoNotFoundError('Membro não encontrado nesta comissão');
  await prisma.comissaoMembro.delete({ where: { id: membro.id } });
};

// ===========================================================================
// Alertas de conformidade (Fase 1): mandato vencendo/vencido e < 3 membros.
// ===========================================================================

export const getAlertas = async (actor: Actor, now: Date = new Date()) => {
  const where: Prisma.ComissaoWhereInput = { status: 'ativa' };
  if (actor.role !== 'superuser') where.municipalityId = actor.municipalityId;

  const comissoes = await prisma.comissao.findMany({
    where,
    include: { _count: { select: { membros: true } } },
  });

  const DIA = 24 * 60 * 60 * 1000;
  const ALERTA_DIAS = 30;

  const mandatoVencido: unknown[] = [];
  const mandatoVencendo: unknown[] = [];
  const membrosInsuficientes: unknown[] = [];

  for (const c of comissoes) {
    const diasParaFim = Math.ceil((c.mandatoFim.getTime() - now.getTime()) / DIA);
    const base = {
      id: c.id,
      tipo: c.tipo,
      portariaNumero: c.portariaNumero,
      mandatoFim: c.mandatoFim,
      diasParaFim,
      membros: c._count.membros,
    };
    if (diasParaFim < 0) mandatoVencido.push(base);
    else if (diasParaFim <= ALERTA_DIAS) mandatoVencendo.push(base);
    if (c._count.membros < MIN_MEMBROS) membrosInsuficientes.push({ ...base, minimo: MIN_MEMBROS });
  }

  return {
    mandatoVencido,
    mandatoVencendo,
    membrosInsuficientes,
    total: mandatoVencido.length + mandatoVencendo.length + membrosInsuficientes.length,
  };
};
