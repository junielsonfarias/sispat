import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { logActivity } from '../utils/activityLogger';

/**
 * Listar transferências
 * GET /api/transfers
 */
export const listTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, sector } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (sector) {
      where.OR = [
        { setorOrigem: sector },
        { setorDestino: sector }
      ];
    }

    const [transfers, total] = await Promise.all([
      prisma.transferencia.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          patrimonio: {
            select: {
              id: true,
              numero_patrimonio: true,
              descricao: true,
              sectorId: true,
              localId: true
            }
          }
        }
      }),
      prisma.transferencia.count({ where })
    ]);

    res.json({
      transfers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar transferências:', error);
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
        descricao_bem: patrimonio.descricao,
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

    res.status(201).json(transfer);
  } catch (error) {
    console.error('Erro ao criar transferência:', error);
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

    res.json(updatedTransfer);
  } catch (error) {
    console.error('Erro ao aprovar transferência:', error);
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

    res.json(updatedTransfer);
  } catch (error) {
    console.error('Erro ao rejeitar transferência:', error);
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
            descricao: true,
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
    console.error('Erro ao obter transferência:', error);
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

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
