import { Request, Response } from 'express'
import { prisma } from '../index'
import { logInfo, logError } from '../config/logger'

/**
 * Listar campos personalizados de imóveis
 * GET /api/imovel-fields
 */
export const listImovelFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const { active } = req.query

    // ✅ MULTI-TENANT: filtrar por município (superuser vê todos)
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = req.user?.municipalityId
    if (!isSuperuser && !municipalityId) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }

    const where: any = isSuperuser ? {} : { municipalityId }
    if (active !== undefined) {
      where.isActive = active === 'true'
    }

    const fields = await prisma.imovelCustomField.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    })

    logInfo('Imovel fields listed', {
      userId: req.user?.userId,
      count: fields.length,
    })

    res.json(fields)
  } catch (error) {
    logError('Failed to list imovel fields', error, { userId: req.user?.userId })
    res.status(500).json({ error: 'Erro ao listar campos personalizados' })
  }
}

/**
 * Criar campo personalizado
 * POST /api/imovel-fields
 */
export const createImovelField = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      label,
      type,
      required,
      defaultValue,
      options,
      placeholder,
      helpText,
      validationRules,
      displayOrder,
      isSystem,
    } = req.body

    // ✅ MULTI-TENANT: derivar do token; superuser pode informar no body
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = isSuperuser
      ? (req.body.municipalityId ?? req.user?.municipalityId)
      : req.user?.municipalityId
    if (!municipalityId) {
      res.status(isSuperuser ? 400 : 401).json({
        error: isSuperuser ? 'municipalityId é obrigatório' : 'Não autenticado',
      })
      return
    }

    const field = await prisma.imovelCustomField.create({
      data: {
        name,
        label,
        type,
        required: required || false,
        defaultValue: defaultValue || null,
        options: options ? JSON.stringify(options) : null,
        placeholder: placeholder || null,
        helpText: helpText || null,
        validationRules: validationRules ? JSON.stringify(validationRules) : null,
        displayOrder: displayOrder || 0,
        isActive: true,
        isSystem: isSystem || false,
        municipalityId,
      },
    })

    logInfo('Imovel field created', {
      userId: req.user?.userId,
      fieldId: field.id,
      name: field.name,
    })

    res.status(201).json(field)
  } catch (error) {
    logError('Failed to create imovel field', error, { userId: req.user?.userId })
    res.status(500).json({ error: 'Erro ao criar campo personalizado' })
  }
}

/**
 * Atualizar campo personalizado
 * PUT /api/imovel-fields/:id
 */
export const updateImovelField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // ✅ MULTI-TENANT: derivar do token (superuser bypassa)
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = req.user?.municipalityId
    if (!isSuperuser && !municipalityId) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }

    // ✅ IDOR: garantir que o campo pertence ao município antes de alterar
    const existing = await prisma.imovelCustomField.findFirst({
      where: isSuperuser ? { id } : { id, municipalityId },
    })
    if (!existing) {
      // 404 (não vaza existência cross-tenant)
      res.status(404).json({ error: 'Campo personalizado não encontrado' })
      return
    }

    // ✅ MASS-ASSIGNMENT: whitelist explícita — nunca aceitar municipalityId/id do body
    const body = req.body ?? {}
    const ALLOWED_FIELDS = [
      'name',
      'label',
      'type',
      'required',
      'defaultValue',
      'options',
      'placeholder',
      'helpText',
      'validationRules',
      'displayOrder',
      'isActive',
      'isSystem',
    ] as const

    const updates: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    // Serializar arrays/objetos para JSON se necessário
    if (updates.options && Array.isArray(updates.options)) {
      updates.options = JSON.stringify(updates.options)
    }
    if (updates.validationRules && typeof updates.validationRules === 'object') {
      updates.validationRules = JSON.stringify(updates.validationRules)
    }

    const field = await prisma.imovelCustomField.update({
      where: { id },
      data: updates,
    })

    logInfo('Imovel field updated', {
      userId: req.user?.userId,
      fieldId: field.id,
      updates: Object.keys(updates),
    })

    res.json(field)
  } catch (error) {
    logError('Failed to update imovel field', error, {
      userId: req.user?.userId,
      fieldId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao atualizar campo personalizado' })
  }
}

/**
 * Deletar campo personalizado
 * DELETE /api/imovel-fields/:id
 */
export const deleteImovelField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // ✅ MULTI-TENANT: derivar do token (superuser bypassa)
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = req.user?.municipalityId
    if (!isSuperuser && !municipalityId) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }

    // ✅ IDOR: garantir que o campo pertence ao município antes de excluir
    const field = await prisma.imovelCustomField.findFirst({
      where: isSuperuser ? { id } : { id, municipalityId },
    })
    if (!field) {
      // 404 (não vaza existência cross-tenant)
      res.status(404).json({ error: 'Campo personalizado não encontrado' })
      return
    }

    // Verificar se é campo do sistema
    if (field.isSystem) {
      res.status(400).json({ error: 'Campos do sistema não podem ser excluídos' })
      return
    }

    await prisma.imovelCustomField.delete({
      where: { id },
    })

    logInfo('Imovel field deleted', {
      userId: req.user?.userId,
      fieldId: id,
    })

    res.json({ message: 'Campo personalizado excluído com sucesso' })
  } catch (error) {
    logError('Failed to delete imovel field', error, {
      userId: req.user?.userId,
      fieldId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao excluir campo personalizado' })
  }
}

/**
 * Reordenar campos
 * PUT /api/imovel-fields/reorder
 */
export const reorderImovelFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fieldOrders } = req.body // Array de { id, displayOrder }

    if (!Array.isArray(fieldOrders)) {
      res.status(400).json({ error: 'fieldOrders deve ser um array' })
      return
    }

    // ✅ MULTI-TENANT: derivar do token (superuser bypassa)
    const isSuperuser = req.user?.role === 'superuser'
    const municipalityId = req.user?.municipalityId
    if (!isSuperuser && !municipalityId) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }

    // ✅ IDOR: escopar cada update por município — ids de outro tenant não casam
    // o where e não são alterados (updateMany por id+municipalityId).
    await prisma.$transaction(
      fieldOrders.map(({ id, displayOrder }) =>
        prisma.imovelCustomField.updateMany({
          where: isSuperuser ? { id } : { id, municipalityId },
          data: { displayOrder },
        })
      )
    )

    logInfo('Imovel fields reordered', {
      userId: req.user?.userId,
      count: fieldOrders.length,
    })

    res.json({ message: 'Campos reordenados com sucesso' })
  } catch (error) {
    logError('Failed to reorder imovel fields', error, { userId: req.user?.userId })
    res.status(500).json({ error: 'Erro ao reordenar campos' })
  }
}

