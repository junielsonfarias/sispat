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

    const where: any = {}
    if (active !== undefined) {
      where.isActive = active === 'true'
    }

    const fields = await prisma.imovelCustomField.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    })

    logInfo('Imovel fields listed', {
      userId: req.user?.id,
      count: fields.length,
    })

    res.json(fields)
  } catch (error) {
    logError('Failed to list imovel fields', error, { userId: req.user?.id })
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
        municipalityId: '1', // Sistema single-municipality
      },
    })

    logInfo('Imovel field created', {
      userId: req.user?.id,
      fieldId: field.id,
      name: field.name,
    })

    res.status(201).json(field)
  } catch (error) {
    logError('Failed to create imovel field', error, { userId: req.user?.id })
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
    const updates = req.body

    // Serializar arrays para JSON se necessário
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
      userId: req.user?.id,
      fieldId: field.id,
      updates: Object.keys(updates),
    })

    res.json(field)
  } catch (error) {
    logError('Failed to update imovel field', error, {
      userId: req.user?.id,
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

    // Verificar se é campo do sistema
    const field = await prisma.imovelCustomField.findUnique({
      where: { id },
    })

    if (field?.isSystem) {
      res.status(400).json({ error: 'Campos do sistema não podem ser excluídos' })
      return
    }

    await prisma.imovelCustomField.delete({
      where: { id },
    })

    logInfo('Imovel field deleted', {
      userId: req.user?.id,
      fieldId: id,
    })

    res.json({ message: 'Campo personalizado excluído com sucesso' })
  } catch (error) {
    logError('Failed to delete imovel field', error, {
      userId: req.user?.id,
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

    // Atualizar em transação
    await prisma.$transaction(
      fieldOrders.map(({ id, displayOrder }) =>
        prisma.imovelCustomField.update({
          where: { id },
          data: { displayOrder },
        })
      )
    )

    logInfo('Imovel fields reordered', {
      userId: req.user?.id,
      count: fieldOrders.length,
    })

    res.json({ message: 'Campos reordenados com sucesso' })
  } catch (error) {
    logError('Failed to reorder imovel fields', error, { userId: req.user?.id })
    res.status(500).json({ error: 'Erro ao reordenar campos' })
  }
}

