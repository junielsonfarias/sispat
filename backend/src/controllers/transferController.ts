import { Request, Response } from 'express';
import { prisma } from '../index';
import { logActivity } from '../utils/activityLogger';
import { logError, logDebug } from '../config/logger';
import { redisCache, CacheUtils } from '../config/redis';

/**
 * Tenant isolation para Transferencia: o model não tem municipalityId direto,
 * filtra via a relação com Patrimonio. Superuser bypassa.
 */
const tenantWhere = (
  req: Request,
): Record<string, unknown> => {
  if (req.user?.role === 'superuser' || !req.user?.municipalityId) return {};
  return { patrimonio: { is: { municipalityId: req.user.municipalityId } } };
};

/**
 * Listar transferências
 * GET /api/transfers
 */
export const listTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, sector } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Tenant isolation: filtra pela relação com patrimônio do mesmo município
    // (superuser bypassa). Cache key inclui municipalityId para não vazar entre tenants.
    const where: any = { ...tenantWhere(req) };

    if (status) {
      where.status = status;
    }

    if (sector) {
      where.OR = [
        { setorOrigem: sector },
        { setorDestino: sector }
      ];
    }

    const tenantKey = req.user?.role === 'superuser' ? 'all' : (req.user?.municipalityId ?? 'anon');
    const cacheKey = CacheUtils.getTransferenciasKey({ tenant: tenantKey, where, page: pageNum, limit: limitNum });

    let result = await redisCache.get<{ transfers: any[], total: number }>(cacheKey);

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
                sector: {
                  select: {
                    id: true,
                    name: true,
                    codigo: true
                  }
                },
                local: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }),
        prisma.transferencia.count({ where })
      ]);

      result = {
        transfers,
        total
      };

      await redisCache.set(cacheKey, result, 300);
      logDebug('✅ Cache de transferências criado', { page: pageNum, limit: limitNum });
    } else {
      logDebug('✅ Cache hit: transferências', { page: pageNum, limit: limitNum });
    }

    res.json({
      transfers: result.transfers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum)
      }
    });
  } catch (error) {
    logError('Erro ao listar transferências', error, { userId: req.user?.userId, query: req.query });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Criar transferência. Valida tenant (patrimônio do município do usuário),
 * impede dupla transferência (bem já em transferência pendente) e marca o
 * patrimônio como `em_transferencia` para bloquear edição/baixa concorrente.
 *
 * POST /api/transfers
 */
export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patrimonioId,
      setorOrigem,
      setorDestino,
      localOrigem,
      localDestino,
      motivo,
      dataTransferencia,
      responsavelOrigem,
      responsavelDestino,
      observacoes
    } = req.body;

    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id: patrimonioId },
      include: { sector: true, local: true }
    });

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // Tenant: usuário precisa ser do mesmo município (exceto superuser)
    if (
      req.user?.role !== 'superuser' &&
      patrimonio.municipalityId !== req.user?.municipalityId
    ) {
      logError('🚫 Tentativa de criar transferência cross-tenant', new Error('tenant-leak'), {
        userId: req.user?.userId,
        userMunicipality: req.user?.municipalityId,
        patrimonioMunicipality: patrimonio.municipalityId,
      });
      res.status(403).json({ error: 'Patrimônio não pertence ao seu município' });
      return;
    }

    // Estado: bem baixado não pode ser transferido; bem já em transferência também não
    if (patrimonio.status === 'baixado') {
      res.status(400).json({ error: 'Patrimônio baixado não pode ser transferido' });
      return;
    }
    if (patrimonio.status === 'em_transferencia') {
      res.status(409).json({ error: 'Patrimônio já está em uma transferência em andamento' });
      return;
    }
    if (patrimonio.status === 'emprestado') {
      res.status(409).json({ error: 'Patrimônio está emprestado — devolva antes de transferir' });
      return;
    }

    // Snapshot do status original para poder restaurar em aprovar/rejeitar/deletar
    const previousStatus = patrimonio.status;

    const [transfer] = await prisma.$transaction([
      prisma.transferencia.create({
        data: {
          patrimonioId,
          numero_patrimonio: patrimonio.numero_patrimonio,
          descricao_bem: patrimonio.descricao_bem,
          setorOrigem,
          setorDestino,
          localOrigem,
          localDestino,
          motivo,
          dataTransferencia: new Date(dataTransferencia),
          responsavelOrigem,
          responsavelDestino,
          // Guardamos o status original no campo observacoes (prefixado) só se vazio,
          // ou anexamos. Solução leve sem migration: usar prefixo machine-readable.
          observacoes: observacoes
            ? `${observacoes}\n[__prev_status__:${previousStatus}]`
            : `[__prev_status__:${previousStatus}]`,
          status: 'pendente'
        }
      }),
      prisma.patrimonio.update({
        where: { id: patrimonioId },
        data: { status: 'em_transferencia', updatedBy: req.user!.userId },
      }),
    ]);

    await logActivity(req, 'CREATE', 'TRANSFER', transfer.id, 'Transferência criada');

    await CacheUtils.invalidateTransferencias();
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${patrimonioId}`);
    logDebug('✅ Cache de transferências invalidado após criação');

    res.status(201).json(transfer);
  } catch (error) {
    logError('Erro ao criar transferência', error, { userId: req.user?.userId, patrimonioId: req.body.patrimonioId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/** Extrai o status original gravado pelo createTransfer; defaults para 'ativo'. */
const extractPreviousStatus = (observacoes?: string | null): string => {
  if (!observacoes) return 'ativo';
  const match = observacoes.match(/\[__prev_status__:([^\]]+)\]/);
  return match?.[1] ?? 'ativo';
};

const stripPreviousStatusMarker = (observacoes?: string | null): string | null => {
  if (!observacoes) return null;
  const cleaned = observacoes.replace(/\n?\[__prev_status__:[^\]]+\]/g, '').trim();
  return cleaned || null;
};

/**
 * Aprovar transferência — atualiza FKs (sectorId, localId), strings de display,
 * restaura status do patrimônio, cria entrada no histórico e registra ActivityLog.
 * Tudo em transação atômica.
 *
 * PATCH /api/transfers/:id/approve
 */
export const approveTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body ?? {};

    const transfer = await prisma.transferencia.findUnique({
      where: { id },
      include: { patrimonio: { select: { id: true, municipalityId: true } } },
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    if (transfer.status !== 'pendente') {
      res.status(400).json({ error: 'Transferência já foi processada' });
      return;
    }

    if (
      req.user?.role !== 'superuser' &&
      transfer.patrimonio.municipalityId !== req.user?.municipalityId
    ) {
      res.status(403).json({ error: 'Sem permissão: transferência de outro município' });
      return;
    }

    const setorDestino = await prisma.sector.findFirst({
      where: {
        name: transfer.setorDestino,
        municipalityId: transfer.patrimonio.municipalityId,
      },
      select: { id: true },
    });
    if (!setorDestino) {
      res.status(404).json({ error: 'Setor destino não encontrado no município' });
      return;
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

    const previousStatus = extractPreviousStatus(transfer.observacoes);
    const cleanObservacoes = stripPreviousStatusMarker(observacoes || transfer.observacoes);

    const [updatedTransfer] = await prisma.$transaction([
      prisma.transferencia.update({
        where: { id },
        data: {
          status: 'aprovada',
          observacoes: cleanObservacoes,
        },
      }),
      prisma.patrimonio.update({
        where: { id: transfer.patrimonioId },
        data: {
          sectorId: setorDestino.id,
          setor_responsavel: transfer.setorDestino,
          ...(localDestinoId ? { localId: localDestinoId, local_objeto: transfer.localDestino } : {}),
          // Restaura status original (era 'ativo' tipicamente; o create salvou na marker)
          status: previousStatus,
          updatedBy: req.user!.userId,
        },
      }),
      prisma.historicoEntry.create({
        data: {
          patrimonioId: transfer.patrimonioId,
          action: 'Transferência Aprovada',
          details: `Transferido de ${transfer.setorOrigem} para ${transfer.setorDestino}. Motivo: ${transfer.motivo}`,
          user: req.user!.email,
          origem: transfer.setorOrigem,
          destino: transfer.setorDestino,
        },
      }),
    ]);

    await logActivity(req, 'APPROVE', 'TRANSFER', id, 'Transferência aprovada');
    await CacheUtils.invalidateTransferencias();
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${transfer.patrimonioId}`);

    res.json(updatedTransfer);
  } catch (error) {
    logError('Erro ao aprovar transferência', error, { transferId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Rejeitar transferência. Restaura status do patrimônio.
 *
 * PATCH /api/transfers/:id/reject
 */
export const rejectTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const transfer = await prisma.transferencia.findUnique({
      where: { id },
      include: { patrimonio: { select: { id: true, municipalityId: true } } },
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    if (transfer.status !== 'pendente') {
      res.status(400).json({ error: 'Transferência já foi processada' });
      return;
    }

    if (
      req.user?.role !== 'superuser' &&
      transfer.patrimonio.municipalityId !== req.user?.municipalityId
    ) {
      res.status(403).json({ error: 'Sem permissão: transferência de outro município' });
      return;
    }

    const previousStatus = extractPreviousStatus(transfer.observacoes);
    const cleanObservacoes = stripPreviousStatusMarker(motivo || transfer.observacoes);

    const [updatedTransfer] = await prisma.$transaction([
      prisma.transferencia.update({
        where: { id },
        data: {
          status: 'rejeitada',
          observacoes: cleanObservacoes,
        },
      }),
      prisma.patrimonio.update({
        where: { id: transfer.patrimonioId },
        data: { status: previousStatus, updatedBy: req.user!.userId },
      }),
      prisma.historicoEntry.create({
        data: {
          patrimonioId: transfer.patrimonioId,
          action: 'Transferência Rejeitada',
          details: `Transferência de ${transfer.setorOrigem} para ${transfer.setorDestino} rejeitada${motivo ? `. Motivo: ${motivo}` : ''}`,
          user: req.user!.email,
          origem: transfer.setorOrigem,
          destino: transfer.setorDestino,
        },
      }),
    ]);

    await logActivity(req, 'REJECT', 'TRANSFER', id, 'Transferência rejeitada');
    await CacheUtils.invalidateTransferencias();
    await CacheUtils.invalidatePatrimonios();
    await redisCache.delete(`patrimonio:${transfer.patrimonioId}`);

    res.json(updatedTransfer);
  } catch (error) {
    logError('Erro ao rejeitar transferência', error, { transferId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Obter transferência por ID. Tenant check.
 * GET /api/transfers/:id
 */
export const getTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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
          }
        }
      }
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    if (
      req.user?.role !== 'superuser' &&
      transfer.patrimonio.municipalityId !== req.user?.municipalityId
    ) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    res.json(transfer);
  } catch (error) {
    logError('Erro ao obter transferência', error, { transferId: req.params.id });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Deletar transferência. Tenant check + restaura status do patrimônio
 * se a transferência ainda estava pendente.
 *
 * DELETE /api/transfers/:id
 */
export const deleteTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transferencia.findUnique({
      where: { id },
      include: { patrimonio: { select: { id: true, municipalityId: true } } },
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    if (
      req.user?.role !== 'superuser' &&
      transfer.patrimonio.municipalityId !== req.user?.municipalityId
    ) {
      res.status(403).json({ error: 'Sem permissão: transferência de outro município' });
      return;
    }

    if (transfer.status === 'aprovada') {
      res.status(400).json({ error: 'Não é possível deletar transferência aprovada' });
      return;
    }

    const wasPending = transfer.status === 'pendente';
    const previousStatus = extractPreviousStatus(transfer.observacoes);

    await prisma.$transaction([
      prisma.transferencia.delete({ where: { id } }),
      // Se ainda estava pendente, o patrimônio estava em 'em_transferencia' — restaurar.
      ...(wasPending
        ? [
            prisma.patrimonio.update({
              where: { id: transfer.patrimonioId },
              data: { status: previousStatus, updatedBy: req.user!.userId },
            }),
          ]
        : []),
    ]);

    await logActivity(req, 'DELETE', 'TRANSFER', id, 'Transferência deletada');

    await CacheUtils.invalidateTransferencias();
    if (wasPending) {
      await CacheUtils.invalidatePatrimonios();
      await redisCache.delete(`patrimonio:${transfer.patrimonioId}`);
    }
    logDebug('✅ Cache de transferências invalidado após deleção');

    res.status(204).send();
  } catch (error) {
    logError('Erro ao deletar transferência', error, { transferId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
