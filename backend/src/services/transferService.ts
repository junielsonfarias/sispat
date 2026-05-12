/**
 * transferService — regras de negócio de Transferencia.
 *
 * Substitui controllers/transferController.ts. Aproveita duas mudanças do
 * Sprint 18:
 *   - Patrimonio.status virou enum PatrimonioStatus.
 *   - Transferencia.previousStatus virou coluna dedicada (antes vivia no
 *     marker `[__prev_status__:X]` em observacoes).
 */

import { Prisma, PatrimonioStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { redisCache, CacheUtils } from '../config/redis';
import { logDebug, logError, logInfo } from '../config/logger';

export interface Actor {
  userId: string;
  role: string;
  municipalityId: string;
  email: string;
}

export interface ListTransfersQuery {
  page?: string;
  limit?: string;
  status?: string;
  sector?: string;
}

// ===========================================================================
// Erros tipados
// ===========================================================================

export class TransferNotFoundError extends Error {
  constructor(message = 'Transferência não encontrada') {
    super(message);
    this.name = 'TransferNotFoundError';
  }
}

export class TransferForbiddenError extends Error {
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'TransferForbiddenError';
  }
}

export class TransferConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferConflictError';
  }
}

export class TransferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferValidationError';
  }
}

// ===========================================================================
// Helpers internos
// ===========================================================================

const tenantWhere = (actor: Actor): Prisma.TransferenciaWhereInput => {
  if (actor.role === 'superuser') return {};
  return { patrimonio: { is: { municipalityId: actor.municipalityId } } };
};

const assertSameTenant = (
  actor: Actor,
  patrimonioMunicipalityId: string,
): void => {
  if (actor.role !== 'superuser' && patrimonioMunicipalityId !== actor.municipalityId) {
    throw new TransferForbiddenError(
      'Sem permissão: transferência de outro município',
    );
  }
};

// ===========================================================================
// Listagem
// ===========================================================================

export const listTransfers = async (query: ListTransfersQuery, actor: Actor) => {
  const pageNum = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(query.limit ?? '10', 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.TransferenciaWhereInput = { ...tenantWhere(actor) };

  if (query.status) where.status = query.status;
  if (query.sector) {
    where.OR = [{ setorOrigem: query.sector }, { setorDestino: query.sector }];
  }

  const tenantKey = actor.role === 'superuser' ? 'all' : actor.municipalityId;
  const cacheKey = CacheUtils.getTransferenciasKey({
    tenant: tenantKey,
    where,
    page: pageNum,
    limit: limitNum,
  });

  let result = await redisCache.get<{ transfers: unknown[]; total: number }>(cacheKey);

  if (!result) {
    const [transfers, total] = await Promise.all([
      prisma.transferencia.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { dataTransferencia: 'desc' },
        include: {
          patrimonio: {
            select: {
              id: true,
              numero_patrimonio: true,
              descricao_bem: true,
              sectorId: true,
              localId: true,
              municipalityId: true,
              sector: { select: { id: true, name: true, codigo: true } },
              local: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.transferencia.count({ where }),
    ]);

    result = { transfers, total };
    await redisCache.set(cacheKey, result, 300);
    logDebug('✅ Cache de transferências criado', { page: pageNum, limit: limitNum });
  } else {
    logDebug('✅ Cache hit: transferências', { page: pageNum, limit: limitNum });
  }

  return {
    transfers: result.transfers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.total,
      pages: Math.ceil(result.total / limitNum),
    },
  };
};

// ===========================================================================
// Leitura por ID
// ===========================================================================

export const getTransfer = async (id: string, actor: Actor) => {
  const transfer = await prisma.transferencia.findUnique({
    where: { id },
    include: {
      patrimonio: {
        select: {
          id: true,
          numero_patrimonio: true,
          descricao_bem: true,
          sectorId: true,
          localId: true,
          municipalityId: true,
        },
      },
    },
  });

  if (!transfer) throw new TransferNotFoundError();
  // Mascara cross-tenant como 404 (não vaza existência).
  if (actor.role !== 'superuser' && transfer.patrimonio.municipalityId !== actor.municipalityId) {
    throw new TransferNotFoundError();
  }

  return transfer;
};

// ===========================================================================
// Criação — bloqueia bem (status = em_transferencia) e snapshot previousStatus.
// ===========================================================================

export interface CreateTransferInput {
  patrimonioId: string;
  setorOrigem: string;
  setorDestino: string;
  localOrigem: string;
  localDestino: string;
  motivo: string;
  dataTransferencia: string | Date;
  responsavelOrigem: string;
  responsavelDestino: string;
  observacoes?: string;
}

export const createTransfer = async (input: CreateTransferInput, actor: Actor) => {
  const patrimonio = await prisma.patrimonio.findUnique({
    where: { id: input.patrimonioId },
    include: { sector: true, local: true },
  });

  if (!patrimonio) throw new TransferNotFoundError('Patrimônio não encontrado');

  assertSameTenant(actor, patrimonio.municipalityId);

  if (patrimonio.status === PatrimonioStatus.baixado) {
    throw new TransferValidationError('Patrimônio baixado não pode ser transferido');
  }
  if (patrimonio.status === PatrimonioStatus.em_transferencia) {
    throw new TransferConflictError('Patrimônio já está em uma transferência em andamento');
  }
  if (patrimonio.status === PatrimonioStatus.emprestado) {
    throw new TransferConflictError(
      'Patrimônio está emprestado — devolva antes de transferir',
    );
  }

  const [transfer] = await prisma.$transaction([
    prisma.transferencia.create({
      data: {
        patrimonioId: input.patrimonioId,
        numero_patrimonio: patrimonio.numero_patrimonio,
        descricao_bem: patrimonio.descricao_bem,
        setorOrigem: input.setorOrigem,
        setorDestino: input.setorDestino,
        localOrigem: input.localOrigem,
        localDestino: input.localDestino,
        motivo: input.motivo,
        dataTransferencia: new Date(input.dataTransferencia),
        responsavelOrigem: input.responsavelOrigem,
        responsavelDestino: input.responsavelDestino,
        observacoes: input.observacoes,
        status: 'pendente',
        previousStatus: patrimonio.status,
      },
    }),
    prisma.patrimonio.update({
      where: { id: input.patrimonioId },
      data: {
        status: PatrimonioStatus.em_transferencia,
        updatedBy: actor.userId,
      },
    }),
  ]);

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'CREATE',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      details: 'Transferência criada',
    },
  });

  await CacheUtils.invalidateTransferencias();
  await CacheUtils.invalidatePatrimonios();
  await redisCache.delete(`patrimonio:${input.patrimonioId}`);

  logInfo('✅ Transferência criada', { transferId: transfer.id });
  return transfer;
};

// ===========================================================================
// Aprovação — move o bem para o setor/local destino e restaura status original.
// ===========================================================================

export const approveTransfer = async (
  id: string,
  observacoes: string | undefined,
  actor: Actor,
) => {
  const transfer = await prisma.transferencia.findUnique({
    where: { id },
    include: { patrimonio: { select: { id: true, municipalityId: true } } },
  });

  if (!transfer) throw new TransferNotFoundError();
  if (transfer.status !== 'pendente') {
    throw new TransferValidationError('Transferência já foi processada');
  }
  assertSameTenant(actor, transfer.patrimonio.municipalityId);

  const setorDestino = await prisma.sector.findFirst({
    where: {
      name: transfer.setorDestino,
      municipalityId: transfer.patrimonio.municipalityId,
    },
    select: { id: true },
  });
  if (!setorDestino) {
    throw new TransferNotFoundError('Setor destino não encontrado no município');
  }

  let localDestinoId: string | null = null;
  if (transfer.localDestino) {
    const local = await prisma.local.findFirst({
      where: {
        name: transfer.localDestino,
        municipalityId: transfer.patrimonio.municipalityId,
      },
      select: { id: true },
    });
    localDestinoId = local?.id ?? null;
  }

  const [updatedTransfer] = await prisma.$transaction([
    prisma.transferencia.update({
      where: { id },
      data: {
        status: 'aprovada',
        observacoes: observacoes ?? transfer.observacoes,
      },
    }),
    prisma.patrimonio.update({
      where: { id: transfer.patrimonioId },
      data: {
        sectorId: setorDestino.id,
        setor_responsavel: transfer.setorDestino,
        ...(localDestinoId
          ? { localId: localDestinoId, local_objeto: transfer.localDestino }
          : {}),
        status: transfer.previousStatus as PatrimonioStatus,
        updatedBy: actor.userId,
      },
    }),
    prisma.historicoEntry.create({
      data: {
        patrimonioId: transfer.patrimonioId,
        action: 'Transferência Aprovada',
        details: `Transferido de ${transfer.setorOrigem} para ${transfer.setorDestino}. Motivo: ${transfer.motivo}`,
        user: actor.email,
        origem: transfer.setorOrigem,
        destino: transfer.setorDestino,
      },
    }),
  ]);

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'APPROVE',
      entityType: 'TRANSFER',
      entityId: id,
      details: 'Transferência aprovada',
    },
  });

  await CacheUtils.invalidateTransferencias();
  await CacheUtils.invalidatePatrimonios();
  await redisCache.delete(`patrimonio:${transfer.patrimonioId}`);

  return updatedTransfer;
};

// ===========================================================================
// Rejeição — restaura status original sem mover o bem.
// ===========================================================================

export const rejectTransfer = async (
  id: string,
  motivo: string | undefined,
  actor: Actor,
) => {
  const transfer = await prisma.transferencia.findUnique({
    where: { id },
    include: { patrimonio: { select: { id: true, municipalityId: true } } },
  });

  if (!transfer) throw new TransferNotFoundError();
  if (transfer.status !== 'pendente') {
    throw new TransferValidationError('Transferência já foi processada');
  }
  assertSameTenant(actor, transfer.patrimonio.municipalityId);

  const [updatedTransfer] = await prisma.$transaction([
    prisma.transferencia.update({
      where: { id },
      data: {
        status: 'rejeitada',
        observacoes: motivo ?? transfer.observacoes,
      },
    }),
    prisma.patrimonio.update({
      where: { id: transfer.patrimonioId },
      data: {
        status: transfer.previousStatus as PatrimonioStatus,
        updatedBy: actor.userId,
      },
    }),
    prisma.historicoEntry.create({
      data: {
        patrimonioId: transfer.patrimonioId,
        action: 'Transferência Rejeitada',
        details: `Transferência de ${transfer.setorOrigem} para ${transfer.setorDestino} rejeitada${motivo ? `. Motivo: ${motivo}` : ''}`,
        user: actor.email,
        origem: transfer.setorOrigem,
        destino: transfer.setorDestino,
      },
    }),
  ]);

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'REJECT',
      entityType: 'TRANSFER',
      entityId: id,
      details: 'Transferência rejeitada',
    },
  });

  await CacheUtils.invalidateTransferencias();
  await CacheUtils.invalidatePatrimonios();
  await redisCache.delete(`patrimonio:${transfer.patrimonioId}`);

  return updatedTransfer;
};

// ===========================================================================
// Deleção — só pendente/rejeitada. Restaura status se estava pendente.
// ===========================================================================

export const deleteTransfer = async (id: string, actor: Actor) => {
  const transfer = await prisma.transferencia.findUnique({
    where: { id },
    include: { patrimonio: { select: { id: true, municipalityId: true } } },
  });

  if (!transfer) throw new TransferNotFoundError();
  assertSameTenant(actor, transfer.patrimonio.municipalityId);

  if (transfer.status === 'aprovada') {
    throw new TransferValidationError(
      'Não é possível deletar transferência aprovada',
    );
  }

  const wasPending = transfer.status === 'pendente';

  await prisma.$transaction([
    prisma.transferencia.delete({ where: { id } }),
    ...(wasPending
      ? [
          prisma.patrimonio.update({
            where: { id: transfer.patrimonioId },
            data: {
              status: transfer.previousStatus as PatrimonioStatus,
              updatedBy: actor.userId,
            },
          }),
        ]
      : []),
  ]);

  await prisma.activityLog.create({
    data: {
      userId: actor.userId,
      action: 'DELETE',
      entityType: 'TRANSFER',
      entityId: id,
      details: 'Transferência deletada',
    },
  });

  await CacheUtils.invalidateTransferencias();
  if (wasPending) {
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${transfer.patrimonioId}`);
  }
};
