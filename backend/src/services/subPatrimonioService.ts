/**
 * subPatrimonioService — gerência das unidades individuais de um bem do tipo
 * kit (B2). Sub-patrimônios não têm `municipalityId` próprio; o isolamento
 * multi-tenant é feito via o patrimônio pai.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache } from '../config/redis';
import { logInfo } from '../config/logger';
import type {
  CreateSubPatrimonioInput,
  UpdateSubPatrimonioInput,
  SubPatrimonioStatus,
} from '@sispat/shared';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export class SubPatrimonioNotFoundError extends Error {
  constructor(message = 'Sub-patrimônio não encontrado') {
    super(message);
    this.name = 'SubPatrimonioNotFoundError';
  }
}

export class SubPatrimonioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubPatrimonioValidationError';
  }
}

type SubPatrimonioRow = {
  id: string;
  patrimonioId: string;
  numero: string;
  status: string;
  localizacao_especifica: string | null;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** DTO no formato que o frontend já consome (snake_case + sufixo subpatrimonio). */
export const toDto = (sp: SubPatrimonioRow) => ({
  id: sp.id,
  patrimonio_id: sp.patrimonioId,
  numero_subpatrimonio: sp.numero,
  status: sp.status as SubPatrimonioStatus,
  localizacao_especifica: sp.localizacao_especifica ?? undefined,
  observacoes: sp.observacoes ?? undefined,
  created_at: sp.createdAt,
  updated_at: sp.updatedAt,
});

/**
 * Gera o número de um sub-patrimônio: número do pai + sequencial com padding
 * (3 dígitos até 999, 4 até 9999, senão 5). Espelha `src/lib/sub-patrimonio-utils.ts`.
 */
export const generateSubPatrimonioNumber = (
  patrimonioNumero: string,
  sequencial: number,
): string => {
  const padding = sequencial <= 999 ? 3 : sequencial <= 9999 ? 4 : 5;
  return `${patrimonioNumero}-${sequencial.toString().padStart(padding, '0')}`;
};

/** Carrega o patrimônio pai aplicando o isolamento multi-tenant. */
const loadPatrimonio = async (patrimonioId: string, actor: Actor) => {
  const p = await prisma.patrimonio.findUnique({
    where: { id: patrimonioId },
    select: { id: true, numero_patrimonio: true, municipalityId: true },
  });
  if (!p || (actor.role !== 'superuser' && p.municipalityId !== actor.municipalityId)) {
    throw new SubPatrimonioNotFoundError('Patrimônio não encontrado');
  }
  return p;
};

/** Carrega um sub-patrimônio + tenant do pai (404 mascara cross-tenant). */
const loadSubComTenant = async (id: string, actor: Actor) => {
  const sub = await prisma.subPatrimonio.findUnique({
    where: { id },
    include: { patrimonio: { select: { municipalityId: true, numero_patrimonio: true } } },
  });
  if (
    !sub ||
    (actor.role !== 'superuser' && sub.patrimonio.municipalityId !== actor.municipalityId)
  ) {
    throw new SubPatrimonioNotFoundError();
  }
  return sub;
};

export const listSubPatrimonios = async (patrimonioId: string, actor: Actor) => {
  await loadPatrimonio(patrimonioId, actor);
  const subs = await prisma.subPatrimonio.findMany({
    where: { patrimonioId },
    orderBy: { numero: 'asc' },
  });
  return subs.map(toDto);
};

/** Próximo sequencial disponível para o patrimônio (maior atual + 1). */
const nextSequencial = async (
  patrimonioId: string,
  patrimonioNumero: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<number> => {
  const subs = await tx.subPatrimonio.findMany({
    where: { patrimonioId },
    select: { numero: true },
  });
  const prefix = `${patrimonioNumero}-`;
  let max = 0;
  for (const { numero } of subs) {
    const tail = numero.startsWith(prefix) ? numero.slice(prefix.length) : numero;
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
};

export const createSubPatrimonio = async (
  patrimonioId: string,
  input: CreateSubPatrimonioInput,
  actor: Actor,
) => {
  const parent = await loadPatrimonio(patrimonioId, actor);

  const created = await prisma.$transaction(async (tx) => {
    const seq = await nextSequencial(patrimonioId, parent.numero_patrimonio, tx);
    return tx.subPatrimonio.create({
      data: {
        patrimonioId,
        numero: generateSubPatrimonioNumber(parent.numero_patrimonio, seq),
        status: input.status ?? 'ativo',
        localizacao_especifica: input.localizacao_especifica ?? null,
        observacoes: input.observacoes ?? null,
      },
    });
  });

  await redisCache.delete(`patrimonio:${patrimonioId}`);
  logInfo('✅ Sub-patrimônio criado', { id: created.id, patrimonioId });
  return toDto(created);
};

export const updateSubPatrimonio = async (
  id: string,
  input: UpdateSubPatrimonioInput,
  actor: Actor,
) => {
  const sub = await loadSubComTenant(id, actor);

  const data: Prisma.SubPatrimonioUpdateInput = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.localizacao_especifica !== undefined)
    data.localizacao_especifica = input.localizacao_especifica ?? null;
  if (input.observacoes !== undefined) data.observacoes = input.observacoes ?? null;

  const updated = await prisma.subPatrimonio.update({ where: { id }, data });
  await redisCache.delete(`patrimonio:${sub.patrimonioId}`);
  return toDto(updated);
};

export const deleteSubPatrimonio = async (id: string, actor: Actor) => {
  const sub = await loadSubComTenant(id, actor);
  await prisma.subPatrimonio.delete({ where: { id } });
  await redisCache.delete(`patrimonio:${sub.patrimonioId}`);
  logInfo('🗑️ Sub-patrimônio excluído', { id, patrimonioId: sub.patrimonioId });
};

export const bulkUpdateStatus = async (
  patrimonioId: string,
  ids: string[],
  status: SubPatrimonioStatus,
  actor: Actor,
) => {
  await loadPatrimonio(patrimonioId, actor);
  // Escopa a atualização ao patrimônio pai: ids de outro bem são ignorados.
  const result = await prisma.subPatrimonio.updateMany({
    where: { id: { in: ids }, patrimonioId },
    data: { status },
  });
  await redisCache.delete(`patrimonio:${patrimonioId}`);
  return result.count;
};
