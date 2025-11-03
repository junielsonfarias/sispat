import { Request, Response } from 'express';
import { prisma } from '../index';
import { AppError } from '../middlewares/errorHandler';
import { logActivity } from '../utils/activityLogger';
import { logError, logDebug } from '../config/logger';
import { redisCache, CacheUtils } from '../config/redis';

/**
 * Listar transferências
 * GET /api/transfers
 */
export const listTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ PAGINAÇÃO: Padronizar paginação
    const { page = 1, limit = 10, status, sector } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    // Filtrar por município
    if (req.user?.municipalityId) {
      // Filtro será aplicado através da relação com patrimônio
    }
    
    if (status) {
      where.status = status;
    }
    
    if (sector) {
      where.OR = [
        { setorOrigem: sector },
        { setorDestino: sector }
      ];
    }

    // ✅ CACHE: Gerar chave de cache baseada nos filtros
    const cacheKey = CacheUtils.getTransferenciasKey({ where, page: pageNum, limit: limitNum });
    
    // Tentar obter do cache Redis primeiro
    let result = await redisCache.get<{ transfers: any[], total: number }>(cacheKey);
    
    if (!result) {
      // ✅ QUERY N+1: Include otimizado com select específico
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

      // ✅ CACHE: Armazenar no cache Redis por 5 minutos
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
 * Criar transferência
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

    // Validar se o patrimônio existe
    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id: patrimonioId },
      include: { sector: true, local: true }
    });

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // Criar transferência
    const transfer = await prisma.transferencia.create({
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
        observacoes,
        status: 'pendente'
      }
    });

    // Log da atividade
    await logActivity(req, 'CREATE', 'TRANSFER', transfer.id, 'Transferência criada');

    // ✅ CACHE: Invalidar cache de transferências após criação
    await CacheUtils.invalidateTransferencias();
    logDebug('✅ Cache de transferências invalidado após criação');

    res.status(201).json(transfer);
  } catch (error) {
    logError('Erro ao criar transferência', error, { userId: req.user?.userId, patrimonioId: req.body.patrimonioId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Aprovar transferência
 * PATCH /api/transfers/:id/approve
 */
export const approveTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;

    const transfer = await prisma.transferencia.findUnique({
      where: { id },
      include: { patrimonio: true }
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    if (transfer.status !== 'pendente') {
      res.status(400).json({ error: 'Transferência já foi processada' });
      return;
    }

    // Atualizar transferência
    const updatedTransfer = await prisma.transferencia.update({
      where: { id },
      data: {
        status: 'aprovada',
        observacoes: observacoes || transfer.observacoes
      }
    });

    // Atualizar patrimônio
    await prisma.patrimonio.update({
      where: { id: transfer.patrimonioId },
      data: {
        setor_responsavel: transfer.setorDestino,
        local_objeto: transfer.localDestino
      }
    });

    // Log da atividade
    await logActivity(req, 'UPDATE', 'TRANSFER', id, 'Transferência aprovada');

    // ✅ CACHE: Invalidar cache de transferências e patrimônios após aprovação
    await CacheUtils.invalidateTransferencias();
    await CacheUtils.invalidatePatrimonios();
    logDebug('✅ Cache de transferências e patrimônios invalidado após aprovação');

    res.json(updatedTransfer);
  } catch (error) {
    logError('Erro ao aprovar transferência', error, { transferId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Rejeitar transferência
 * PATCH /api/transfers/:id/reject
 */
export const rejectTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const transfer = await prisma.transferencia.findUnique({
      where: { id }
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    if (transfer.status !== 'pendente') {
      res.status(400).json({ error: 'Transferência já foi processada' });
      return;
    }

    // Atualizar transferência
    const updatedTransfer = await prisma.transferencia.update({
      where: { id },
      data: {
        status: 'rejeitada',
        observacoes: motivo || transfer.observacoes
      }
    });

    // Log da atividade
    await logActivity(req, 'UPDATE', 'TRANSFER', id, 'Transferência rejeitada');

    // ✅ CACHE: Invalidar cache de transferências após rejeição
    await CacheUtils.invalidateTransferencias();
    logDebug('✅ Cache de transferências invalidado após rejeição');

    res.json(updatedTransfer);
  } catch (error) {
    logError('Erro ao rejeitar transferência', error, { transferId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Obter transferência por ID
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
            localId: true
          }
        }
      }
    });

    if (!transfer) {
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
 * Deletar transferência
 * DELETE /api/transfers/:id
 */
export const deleteTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transferencia.findUnique({
      where: { id }
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada' });
      return;
    }

    if (transfer.status === 'aprovada') {
      res.status(400).json({ error: 'Não é possível deletar transferência aprovada' });
      return;
    }

    await prisma.transferencia.delete({
      where: { id }
    });

    // Log da atividade
    await logActivity(req, 'DELETE', 'TRANSFER', id, 'Transferência deletada');

    // ✅ CACHE: Invalidar cache de transferências após deleção
    await CacheUtils.invalidateTransferencias();
    logDebug('✅ Cache de transferências invalidado após deleção');

    res.status(204).send();
  } catch (error) {
    logError('Erro ao deletar transferência', error, { transferId: req.params.id, userId: req.user?.userId });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
