import { Request, Response } from 'express'
import { prisma } from '../index'
import { logInfo, logError } from '../config/logger'
import { logActivity } from '../utils/activityLogger'

/**
 * Listar transferências
 * GET /api/transferencias
 */
export const listTransferencias = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '50' } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    // Filtro de status
    if (status) {
      where.status = status
    }

    // Buscar transferências
    const [transferencias, total] = await Promise.all([
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
            },
          },
        },
      }),
      prisma.transferencia.count({ where }),
    ])

    logInfo('Transferencias listed', {
      userId: req.user?.userId,
      count: transferencias.length,
    })

    res.json({
      transferencias,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    logError('Failed to list transferencias', error as Error, {
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Erro ao listar transferências' })
  }
}

/**
 * Buscar transferência por ID
 * GET /api/transferencias/:id
 */
export const getTransferenciaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const transferencia = await prisma.transferencia.findUnique({
      where: { id },
      include: {
        patrimonio: true,
      },
    })

    if (!transferencia) {
      res.status(404).json({ error: 'Transferência não encontrada' })
      return
    }

    res.json(transferencia)
  } catch (error) {
    logError('Failed to get transferencia', error as Error, {
      userId: req.user?.userId,
      transferenciaId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao buscar transferência' })
  }
}

/**
 * Criar transferência
 * POST /api/transferencias
 */
export const createTransferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patrimonioId,
      setorOrigem,
      setorDestino,
      localOrigem,
      localDestino,
      motivo,
      responsavelOrigem,
      responsavelDestino,
      observacoes,
    } = req.body

    // Validações
    if (!patrimonioId || !setorOrigem || !setorDestino || !motivo) {
      res.status(400).json({
        error: 'Patrimônio, setor origem, setor destino e motivo são obrigatórios',
      })
      return
    }

    // Buscar patrimônio
    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id: patrimonioId },
      select: {
        numero_patrimonio: true,
        descricao_bem: true,
      },
    })

    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' })
      return
    }

    // Criar transferência
    const transferencia = await prisma.transferencia.create({
      data: {
        patrimonioId,
        numero_patrimonio: patrimonio.numero_patrimonio,
        descricao_bem: patrimonio.descricao_bem,
        setorOrigem,
        setorDestino,
        localOrigem: localOrigem || '',
        localDestino: localDestino || '',
        motivo,
        dataTransferencia: new Date(),
        responsavelOrigem: responsavelOrigem || req.user?.email || '',
        responsavelDestino: responsavelDestino || '',
        status: 'pendente',
        observacoes,
      },
      include: {
        patrimonio: true,
      },
    })

    // ✅ v2.0.7: Log de auditoria com IP automático
    await logActivity(req, 'TRANSFERENCIA_CREATE', 'transferencia', transferencia.id, {
      patrimonioId,
      setorOrigem,
      setorDestino,
    })

    logInfo('Transferencia created', {
      userId: req.user?.userId,
      transferenciaId: transferencia.id,
      patrimonioId,
    })

    res.status(201).json(transferencia)
  } catch (error) {
    logError('Failed to create transferencia', error as Error, {
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Erro ao criar transferência' })
  }
}

/**
 * Aprovar transferência
 * PUT /api/transferencias/:id/aprovar
 */
export const aprovarTransferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { comentarios } = req.body

    // Apenas supervisor e admin podem aprovar
    if (!['supervisor', 'admin', 'superuser'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Sem permissão para aprovar transferências' })
      return
    }

    // Buscar transferência
    const transferencia = await prisma.transferencia.findUnique({
      where: { id },
    })

    if (!transferencia) {
      res.status(404).json({ error: 'Transferência não encontrada' })
      return
    }

    if (transferencia.status !== 'pendente') {
      res.status(400).json({ error: 'Transferência já foi processada' })
      return
    }

    // Buscar setor destino
    const setorDestino = await prisma.sector.findFirst({
      where: { name: transferencia.setorDestino },
    })

    if (!setorDestino) {
      res.status(404).json({ error: 'Setor destino não encontrado' })
      return
    }

    // Atualizar em transação
    const [updatedTransferencia, updatedPatrimonio] = await prisma.$transaction([
      // Atualizar status da transferência
      prisma.transferencia.update({
        where: { id },
        data: {
          status: 'aprovada',
          observacoes: comentarios || transferencia.observacoes,
        },
      }),
      
      // Atualizar setor do patrimônio
      prisma.patrimonio.update({
        where: { id: transferencia.patrimonioId },
        data: {
          sectorId: setorDestino.id,
          setor_responsavel: transferencia.setorDestino,
          updatedBy: req.user!.userId,
        },
      }),
      
      // Criar entrada no histórico
      prisma.historicoEntry.create({
        data: {
          patrimonioId: transferencia.patrimonioId,
          action: 'Transferência Aprovada',
          details: `Transferido de ${transferencia.setorOrigem} para ${transferencia.setorDestino}. Motivo: ${transferencia.motivo}`,
          user: req.user!.email,
          origem: transferencia.setorOrigem,
          destino: transferencia.setorDestino,
        },
      }),
    ])

    // ✅ v2.0.7: Log de auditoria com IP automático
    await logActivity(req, 'TRANSFERENCIA_APPROVE', 'transferencia', id, {
      patrimonioId: transferencia.patrimonioId,
      setorDestino: transferencia.setorDestino,
    })

    logInfo('Transferencia approved', {
      userId: req.user?.userId,
      transferenciaId: id,
    })

    res.json({
      transferencia: updatedTransferencia,
      patrimonio: updatedPatrimonio,
    })
  } catch (error) {
    logError('Failed to approve transferencia', error as Error, {
      userId: req.user?.userId,
      transferenciaId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao aprovar transferência' })
  }
}

/**
 * Rejeitar transferência
 * PUT /api/transferencias/:id/rejeitar
 */
export const rejeitarTransferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { comentarios } = req.body

    // Apenas supervisor e admin podem rejeitar
    if (!['supervisor', 'admin', 'superuser'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Sem permissão para rejeitar transferências' })
      return
    }

    const transferencia = await prisma.transferencia.update({
      where: { id },
      data: {
        status: 'rejeitada',
        observacoes: comentarios,
      },
    })

    // ✅ v2.0.7: Log de auditoria com IP automático
    await logActivity(req, 'TRANSFERENCIA_REJECT', 'transferencia', id, { comentarios })

    logInfo('Transferencia rejected', {
      userId: req.user?.userId,
      transferenciaId: id,
    })

    res.json(transferencia)
  } catch (error) {
    logError('Failed to reject transferencia', error as Error, {
      userId: req.user?.userId,
      transferenciaId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao rejeitar transferência' })
  }
}


