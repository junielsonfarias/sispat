import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../index'
import { logInfo, logError } from '../config/logger'

/**
 * Listar tarefas de manutenção
 * GET /api/manutencoes
 */
export const listManutencaoTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, tipo, imovelId, patrimonioId } = req.query

    const where: Prisma.ManutencaoTaskWhereInput = {}

    if (status) where.status = String(status)
    if (tipo) where.tipo = String(tipo)
    if (imovelId) where.imovelId = String(imovelId)
    if (patrimonioId) where.patrimonioId = String(patrimonioId)

    // ✅ MULTI-TENANT: tarefa pertence ao município via patrimônio OU imóvel
    if (req.user?.role !== 'superuser') {
      const municipalityId = req.user?.municipalityId
      where.OR = [
        { patrimonio: { municipalityId } },
        { imovel: { municipalityId } },
      ]
    }

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
      userId: req.user?.userId,
      count: tasks.length,
      filters: where,
    })

    res.json(tasks)
  } catch (error) {
    logError('Failed to list maintenance tasks', error, { userId: req.user?.userId })
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
      status,
      responsavel,
      dataPrevista,
      custo,
      observacoes,
    } = req.body

    // Validação obrigatória — exatamente um entre patrimonioId e imovelId
    if (!patrimonioId && !imovelId) {
      res.status(400).json({ error: 'Informe patrimonioId ou imovelId' })
      return
    }
    if (patrimonioId && imovelId) {
      res.status(400).json({ error: 'Informe apenas patrimonioId OU imovelId, não ambos' })
      return
    }

    // Valida que o bem referenciado existe e pertence ao município do usuário
    if (patrimonioId) {
      const p = await prisma.patrimonio.findUnique({
        where: { id: patrimonioId },
        select: { id: true, municipalityId: true },
      })
      if (!p) {
        res.status(404).json({ error: 'Patrimônio não encontrado' })
        return
      }
      if (req.user?.role !== 'superuser' && p.municipalityId !== req.user?.municipalityId) {
        res.status(403).json({ error: 'Sem permissão para este patrimônio' })
        return
      }
    }
    if (imovelId) {
      const i = await prisma.imovel.findUnique({
        where: { id: imovelId },
        select: { id: true, municipalityId: true },
      })
      if (!i) {
        res.status(404).json({ error: 'Imóvel não encontrado' })
        return
      }
      if (req.user?.role !== 'superuser' && i.municipalityId !== req.user?.municipalityId) {
        res.status(403).json({ error: 'Sem permissão para este imóvel' })
        return
      }
    }

    if (!tipo || !titulo || !descricao || !prioridade || !dataPrevista) {
      res.status(400).json({
        error: 'Campos obrigatórios: tipo, titulo, descricao, prioridade, dataPrevista',
      })
      return
    }

    const task = await prisma.manutencaoTask.create({
      data: {
        patrimonioId: patrimonioId || null,
        imovelId: imovelId || null,
        tipo,
        titulo,
        descricao,
        prioridade,
        status: status || 'pendente',
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
      userId: req.user?.userId,
      taskId: task.id,
      titulo: task.titulo,
    })

    res.status(201).json(task)
  } catch (error) {
    logError('Failed to create maintenance task', error, { userId: req.user?.userId })
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

    // ✅ MULTI-TENANT: garantir que a tarefa pertence ao município antes de alterar
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = req.user?.municipalityId
    const existing = await prisma.manutencaoTask.findFirst({
      where: {
        id,
        ...(isSuperuser
          ? {}
          : { OR: [{ patrimonio: { municipalityId } }, { imovel: { municipalityId } }] }),
      },
      select: { id: true },
    })
    if (!existing) {
      res.status(404).json({ error: 'Tarefa não encontrada' })
      return
    }

    // ✅ Whitelist de campos atualizáveis (evita mass-assignment;
    // patrimonioId/imovelId NÃO são reatribuíveis para não cruzar tenant)
    const ALLOWED_FIELDS = [
      'tipo',
      'titulo',
      'descricao',
      'prioridade',
      'status',
      'responsavel',
      'dataPrevista',
      'dataConclusao',
      'custo',
      'observacoes',
    ] as const
    const DATE_FIELDS = new Set<string>(['dataPrevista', 'dataConclusao'])
    const updateData: Prisma.ManutencaoTaskUpdateInput = {}
    for (const field of ALLOWED_FIELDS) {
      const value = req.body[field]
      if (value === undefined) continue
      ;(updateData as Record<string, unknown>)[field] = DATE_FIELDS.has(field)
        ? new Date(value)
        : value
    }

    const task = await prisma.manutencaoTask.update({
      where: { id },
      data: updateData,
      include: {
        patrimonio: true,
        imovel: true,
      },
    })

    logInfo('Maintenance task updated', {
      userId: req.user?.userId,
      taskId: task.id,
      updates: Object.keys(updateData),
    })

    res.json(task)
  } catch (error) {
    logError('Failed to update maintenance task', error, {
      userId: req.user?.userId,
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

    // ✅ MULTI-TENANT: garantir que a tarefa pertence ao município antes de excluir
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = req.user?.municipalityId
    const existing = await prisma.manutencaoTask.findFirst({
      where: {
        id,
        ...(isSuperuser
          ? {}
          : { OR: [{ patrimonio: { municipalityId } }, { imovel: { municipalityId } }] }),
      },
      select: { id: true },
    })
    if (!existing) {
      res.status(404).json({ error: 'Tarefa não encontrada' })
      return
    }

    await prisma.manutencaoTask.delete({
      where: { id },
    })

    logInfo('Maintenance task deleted', {
      userId: req.user?.userId,
      taskId: id,
    })

    res.json({ message: 'Tarefa de manutenção excluída com sucesso' })
  } catch (error) {
    logError('Failed to delete maintenance task', error, {
      userId: req.user?.userId,
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
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = req.user?.municipalityId

    const task = await prisma.manutencaoTask.findFirst({
      where: {
        id,
        ...(isSuperuser
          ? {}
          : { OR: [{ patrimonio: { municipalityId } }, { imovel: { municipalityId } }] }),
      },
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
      userId: req.user?.userId,
      taskId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao buscar tarefa de manutenção' })
  }
}

