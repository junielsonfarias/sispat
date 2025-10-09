import { Request, Response } from 'express'
import { prisma } from '../index'
import { logInfo, logError } from '../config/logger'

/**
 * Listar tarefas de manutenção
 * GET /api/manutencoes
 */
export const listManutencaoTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, tipo, imovelId, patrimonioId } = req.query

    const where: any = {}

    if (status) where.status = status
    if (tipo) where.tipo = tipo
    if (imovelId) where.imovelId = imovelId
    if (patrimonioId) where.patrimonioId = patrimonioId

    const tasks = await prisma.manutencaoTask.findMany({
      where,
      orderBy: { dataPrevista: 'asc' },
      include: {
        patrimonio: {
          select: {
            id: true,
            numero_patrimonio: true,
            descricao_bem: true,
          },
        },
        imovel: {
          select: {
            id: true,
            numero_patrimonio: true,
            denominacao: true,
          },
        },
      },
    })

    logInfo('Maintenance tasks listed', {
      userId: req.user?.id,
      count: tasks.length,
      filters: where,
    })

    res.json(tasks)
  } catch (error) {
    logError('Failed to list maintenance tasks', error, { userId: req.user?.id })
    res.status(500).json({ error: 'Erro ao listar tarefas de manutenção' })
  }
}

/**
 * Criar tarefa de manutenção
 * POST /api/manutencoes
 */
export const createManutencaoTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patrimonioId,
      imovelId,
      tipo,
      titulo,
      descricao,
      prioridade,
      responsavel,
      dataPrevista,
      custo,
      observacoes,
    } = req.body

    const task = await prisma.manutencaoTask.create({
      data: {
        patrimonioId: patrimonioId || null,
        imovelId: imovelId || null,
        tipo,
        titulo,
        descricao,
        prioridade,
        status: 'pendente',
        responsavel: responsavel || null,
        dataPrevista: new Date(dataPrevista),
        custo: custo || null,
        observacoes: observacoes || null,
      },
      include: {
        patrimonio: {
          select: {
            numero_patrimonio: true,
            descricao_bem: true,
          },
        },
        imovel: {
          select: {
            numero_patrimonio: true,
            denominacao: true,
          },
        },
      },
    })

    logInfo('Maintenance task created', {
      userId: req.user?.id,
      taskId: task.id,
      titulo: task.titulo,
    })

    res.status(201).json(task)
  } catch (error) {
    logError('Failed to create maintenance task', error, { userId: req.user?.id })
    res.status(500).json({ error: 'Erro ao criar tarefa de manutenção' })
  }
}

/**
 * Atualizar tarefa de manutenção
 * PUT /api/manutencoes/:id
 */
export const updateManutencaoTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const updates = req.body

    // Converter datas se necessário
    if (updates.dataPrevista) {
      updates.dataPrevista = new Date(updates.dataPrevista)
    }
    if (updates.dataConclusao) {
      updates.dataConclusao = new Date(updates.dataConclusao)
    }

    const task = await prisma.manutencaoTask.update({
      where: { id },
      data: updates,
      include: {
        patrimonio: true,
        imovel: true,
      },
    })

    logInfo('Maintenance task updated', {
      userId: req.user?.id,
      taskId: task.id,
      updates: Object.keys(updates),
    })

    res.json(task)
  } catch (error) {
    logError('Failed to update maintenance task', error, {
      userId: req.user?.id,
      taskId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao atualizar tarefa de manutenção' })
  }
}

/**
 * Deletar tarefa de manutenção
 * DELETE /api/manutencoes/:id
 */
export const deleteManutencaoTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await prisma.manutencaoTask.delete({
      where: { id },
    })

    logInfo('Maintenance task deleted', {
      userId: req.user?.id,
      taskId: id,
    })

    res.json({ message: 'Tarefa de manutenção excluída com sucesso' })
  } catch (error) {
    logError('Failed to delete maintenance task', error, {
      userId: req.user?.id,
      taskId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao excluir tarefa de manutenção' })
  }
}

/**
 * Obter tarefa por ID
 * GET /api/manutencoes/:id
 */
export const getManutencaoTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const task = await prisma.manutencaoTask.findUnique({
      where: { id },
      include: {
        patrimonio: true,
        imovel: true,
      },
    })

    if (!task) {
      res.status(404).json({ error: 'Tarefa não encontrada' })
      return
    }

    res.json(task)
  } catch (error) {
    logError('Failed to get maintenance task', error, {
      userId: req.user?.id,
      taskId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao buscar tarefa de manutenção' })
  }
}

