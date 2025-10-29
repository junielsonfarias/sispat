import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { logActivity } from '../utils/activityLogger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

export { upload };

/**
 * Listar documentos
 * GET /api/documents
 */
export const listDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, type, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (type) {
      where.tipo = type;
    }
    
    if (search) {
      where.OR = [
        { titulo: { contains: search as string, mode: 'insensitive' } },
        { descricao: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.documentoGeral.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.documentoGeral.count({ where })
    ]);

    res.json({
      documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Criar documento
 * POST /api/documents
 */
export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { titulo, descricao, tipo, categoria, tags, isPublic } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Arquivo é obrigatório' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const document = await prisma.documentoGeral.create({
      data: {
        titulo,
        descricao,
        tipo,
        categoria,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        isPublic: isPublic === 'true' || isPublic === true,
        uploadedById: req.user.userId
      }
    });

    // Log da atividade
    await logActivity(req, 'CREATE', 'DOCUMENT', document.id, 'Documento criado');

    res.status(201).json(document);
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Obter documento por ID
 * GET /api/documents/:id
 */
export const getDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await prisma.documentoGeral.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!document) {
      res.status(404).json({ error: 'Documento não encontrado' });
      return;
    }

    res.json(document);
  } catch (error) {
    console.error('Erro ao obter documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Download de documento
 * GET /api/documents/:id/download
 */
export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await prisma.documentoGeral.findUnique({
      where: { id }
    });

    if (!document) {
      res.status(404).json({ error: 'Documento não encontrado' });
      return;
    }

    if (!fs.existsSync(document.filePath)) {
      res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
      return;
    }

    res.download(document.filePath, document.fileName);
  } catch (error) {
    console.error('Erro ao fazer download do documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Atualizar documento
 * PUT /api/documents/:id
 */
export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { titulo, descricao, tipo, categoria, tags, isPublic } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const document = await prisma.documentoGeral.findUnique({
      where: { id }
    });

    if (!document) {
      res.status(404).json({ error: 'Documento não encontrado' });
      return;
    }

    // Verificar se o usuário pode editar (apenas o uploader ou admin)
    if (document.uploadedById !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Sem permissão para editar este documento' });
      return;
    }

    const updatedDocument = await prisma.documentoGeral.update({
      where: { id },
      data: {
        titulo,
        descricao,
        tipo,
        categoria,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : document.tags,
        isPublic: isPublic === 'true' || isPublic === true
      }
    });

    // Log da atividade
    await logActivity(req, 'UPDATE', 'DOCUMENT', id, 'Documento atualizado');

    res.json(updatedDocument);
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Deletar documento
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const document = await prisma.documentoGeral.findUnique({
      where: { id }
    });

    if (!document) {
      res.status(404).json({ error: 'Documento não encontrado' });
      return;
    }

    // Verificar se o usuário pode deletar (apenas o uploader ou admin)
    if (document.uploadedById !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Sem permissão para deletar este documento' });
      return;
    }

    // Deletar arquivo físico
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Deletar registro do banco
    await prisma.documentoGeral.delete({
      where: { id }
    });

    // Log da atividade
    await logActivity(req, 'DELETE', 'DOCUMENT', id, 'Documento deletado');

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Listar documentos públicos
 * GET /api/documents/public
 */
export const listPublicDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isPublic: true
    };
    
    if (search) {
      where.OR = [
        { titulo: { contains: search as string, mode: 'insensitive' } },
        { descricao: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.documentoGeral.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          titulo: true,
          descricao: true,
          tipo: true,
          categoria: true,
          tags: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
          uploadedBy: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.documentoGeral.count({ where })
    ]);

    res.json({
      documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar documentos públicos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};