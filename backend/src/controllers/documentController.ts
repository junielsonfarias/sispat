import { Request, Response } from 'express'
import { prisma } from '../index'
import { logInfo, logError } from '../config/logger'
import { logActivity } from '../utils/activityLogger'

/**
 * Listar documentos de um patrimônio
 * GET /api/documentos?patrimonioId=xxx
 */
export const listDocumentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patrimonioId, imovelId } = req.query

    const where: any = {}

    if (patrimonioId) {
      where.patrimonioId = patrimonioId as string
    }

    if (imovelId) {
      where.imovelId = imovelId as string
    }

    const documentos = await prisma.documento.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({ documentos })
  } catch (error) {
    logError('Failed to list documents', error as Error, {
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Erro ao listar documentos' })
  }
}

/**
 * Buscar documento por ID
 * GET /api/documentos/:id
 */
export const getDocumentoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const documento = await prisma.documento.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!documento) {
      res.status(404).json({ error: 'Documento não encontrado' })
      return
    }

    res.json(documento)
  } catch (error) {
    logError('Failed to get document', error as Error, {
      userId: req.user?.userId,
      documentId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao buscar documento' })
  }
}

/**
 * Criar documento
 * POST /api/documentos
 */
export const createDocumento = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patrimonioId,
      imovelId,
      name,
      type,
      url,
      fileSize,
      description,
    } = req.body

    // Validações
    if (!name || !type || !url) {
      res.status(400).json({
        error: 'Nome, tipo e URL são obrigatórios',
      })
      return
    }

    if (!patrimonioId && !imovelId) {
      res.status(400).json({
        error: 'patrimonioId ou imovelId é obrigatório',
      })
      return
    }

    // Criar documento
    const documento = await prisma.documento.create({
      data: {
        patrimonioId,
        imovelId,
        name,
        type,
        url,
        fileSize,
        description,
        uploadedBy: req.user!.userId,
        uploadedAt: new Date(),
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // ✅ v2.0.7: Log de auditoria com IP automático
    await logActivity(req, 'DOCUMENT_CREATE', 'document', documento.id, {
      name,
      type,
      patrimonioId,
      imovelId,
    })

    logInfo('Document created', {
      userId: req.user?.userId,
      documentId: documento.id,
    })

    res.status(201).json(documento)
  } catch (error) {
    logError('Failed to create document', error as Error, {
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Erro ao criar documento' })
  }
}

/**
 * Atualizar documento
 * PUT /api/documentos/:id
 */
export const updateDocumento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const documento = await prisma.documento.update({
      where: { id },
      data: {
        name,
        description,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // ✅ v2.0.7: Log de auditoria com IP automático
    await logActivity(req, 'DOCUMENT_UPDATE', 'document', id, { name, description })

    logInfo('Document updated', {
      userId: req.user?.userId,
      documentId: id,
    })

    res.json(documento)
  } catch (error) {
    logError('Failed to update document', error as Error, {
      userId: req.user?.userId,
      documentId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao atualizar documento' })
  }
}

/**
 * Deletar documento
 * DELETE /api/documentos/:id
 */
export const deleteDocumento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await prisma.documento.delete({
      where: { id },
    })

    // ✅ v2.0.7: Log de auditoria com IP automático
    await logActivity(req, 'DOCUMENT_DELETE', 'document', id, { deletedAt: new Date() })

    logInfo('Document deleted', {
      userId: req.user?.userId,
      documentId: id,
    })

    res.json({ message: 'Documento deletado com sucesso' })
  } catch (error) {
    logError('Failed to delete document', error as Error, {
      userId: req.user?.userId,
      documentId: req.params.id,
    })
    res.status(500).json({ error: 'Erro ao deletar documento' })
  }
}


