import { Request, Response } from 'express'
import { prisma } from '../index'
import { z } from 'zod'

// Schemas de validação
const createFichaTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['bens', 'imoveis']),
  config: z.object({
    header: z.object({
      showLogo: z.boolean(),
      logoSize: z.enum(['small', 'medium', 'large']),
      showDate: z.boolean(),
      showSecretariat: z.boolean(),
      customTexts: z.object({
        secretariat: z.string(),
        department: z.string()
      })
    }),
    sections: z.object({
      patrimonioInfo: z.object({
        enabled: z.boolean(),
        layout: z.enum(['grid', 'list']),
        fields: z.array(z.string()),
        showPhoto: z.boolean(),
        photoSize: z.enum(['small', 'medium', 'large'])
      }),
      acquisition: z.object({
        enabled: z.boolean(),
        fields: z.array(z.string())
      }),
      location: z.object({
        enabled: z.boolean(),
        fields: z.array(z.string())
      }),
      depreciation: z.object({
        enabled: z.boolean(),
        fields: z.array(z.string())
      })
    }),
    signatures: z.object({
      enabled: z.boolean(),
      count: z.number().min(1).max(4),
      layout: z.enum(['horizontal', 'vertical']),
      labels: z.array(z.string()),
      showDates: z.boolean()
    }),
    styling: z.object({
      margins: z.object({
        top: z.number(),
        bottom: z.number(),
        left: z.number(),
        right: z.number()
      }),
      fonts: z.object({
        family: z.string(),
        size: z.number()
      })
    })
  })
})

const updateFichaTemplateSchema = createFichaTemplateSchema.partial()

export class FichaTemplateController {
  // Listar todos os templates
  static async index(req: Request, res: Response) {
    try {
      const { municipalityId } = req.user!
      
      const templates = await prisma.fichaTemplate.findMany({
        where: {
          municipalityId
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      console.log('[FichaTemplateController] Templates encontrados:', templates.length)
      console.log('[FichaTemplateController] Retornando:', JSON.stringify(templates))
      res.json(templates)
    } catch (error) {
      console.error('Erro ao listar templates:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // Obter um template específico
  static async show(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { municipalityId } = req.user!
      
      const template = await prisma.fichaTemplate.findFirst({
        where: {
          id,
          municipalityId
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' })
      }

      res.json(template)
    } catch (error) {
      console.error('Erro ao obter template:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // Criar novo template
  static async store(req: Request, res: Response) {
    try {
      const { municipalityId, userId } = req.user!
      const validatedData = createFichaTemplateSchema.parse(req.body)

      // Se for marcado como padrão, remover padrão dos outros templates do mesmo tipo
      if (req.body.isDefault) {
        await prisma.fichaTemplate.updateMany({
          where: {
            municipalityId,
            type: validatedData.type,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        })
      }

      const template = await prisma.fichaTemplate.create({
        data: {
          ...validatedData,
          municipalityId,
          createdBy: userId,
          isDefault: req.body.isDefault || false
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      res.status(201).json(template)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors
        })
      }
      console.error('Erro ao criar template:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // Atualizar template
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { municipalityId, userId } = req.user!
      const validatedData = updateFichaTemplateSchema.parse(req.body)

      // Verificar se o template existe e pertence ao município
      const existingTemplate = await prisma.fichaTemplate.findFirst({
        where: {
          id,
          municipalityId
        }
      })

      if (!existingTemplate) {
        return res.status(404).json({ error: 'Template não encontrado' })
      }

      // Se for marcado como padrão, remover padrão dos outros templates do mesmo tipo
      if (req.body.isDefault && !existingTemplate.isDefault) {
        await prisma.fichaTemplate.updateMany({
          where: {
            municipalityId,
            type: existingTemplate.type,
            isDefault: true,
            id: { not: id }
          },
          data: {
            isDefault: false
          }
        })
      }

      const template = await prisma.fichaTemplate.update({
        where: { id },
        data: {
          ...validatedData,
          updatedAt: new Date()
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      res.json(template)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors
        })
      }
      console.error('Erro ao atualizar template:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // Definir template como padrão
  static async setDefault(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { municipalityId } = req.user!
      
      // Verificar se o template existe
      const template = await prisma.fichaTemplate.findFirst({
        where: {
          id,
          municipalityId
        }
      })

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' })
      }

      // Remover padrão dos outros templates do mesmo tipo
      await prisma.fichaTemplate.updateMany({
        where: {
          municipalityId,
          type: template.type,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      })

      // Definir este template como padrão
      await prisma.fichaTemplate.update({
        where: { id },
        data: {
          isDefault: true
        }
      })

      res.json({ message: 'Template definido como padrão com sucesso' })
    } catch (error) {
      console.error('Erro ao definir template padrão:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // Deletar template
  static async destroy(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { municipalityId } = req.user!
      
      // Verificar se o template existe e pertence ao município
      const template = await prisma.fichaTemplate.findFirst({
        where: {
          id,
          municipalityId
        }
      })

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' })
      }

      // Não permitir deletar template padrão
      if (template.isDefault) {
        return res.status(400).json({ error: 'Não é possível deletar o template padrão' })
      }

      await prisma.fichaTemplate.delete({
        where: { id }
      })

      res.json({ message: 'Template deletado com sucesso' })
    } catch (error) {
      console.error('Erro ao deletar template:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // Duplicar template
  static async duplicate(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { municipalityId, userId } = req.user!
      
      const originalTemplate = await prisma.fichaTemplate.findFirst({
        where: {
          id,
          municipalityId
        }
      })

      if (!originalTemplate) {
        return res.status(404).json({ error: 'Template não encontrado' })
      }

      const duplicatedTemplate = await prisma.fichaTemplate.create({
        data: {
          name: `${originalTemplate.name} (Cópia)`,
          description: originalTemplate.description,
          type: originalTemplate.type,
          config: originalTemplate.config,
          municipalityId,
          createdBy: userId,
          isDefault: false // Cópia nunca é padrão
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      res.status(201).json(duplicatedTemplate)
    } catch (error) {
      console.error('Erro ao duplicar template:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
}
