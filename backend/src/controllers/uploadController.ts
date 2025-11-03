import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';
import multer from 'multer';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    municipalityId: string;
  };
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// Upload de arquivo único
export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      return;
    }

    const { assetId } = req.body;
    const user = req.user;

    if (!user) {
      // Remover arquivo se não autenticado
      fs.unlinkSync(req.file.path);
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Construir URL do arquivo
    const fileUrl = `/uploads/${req.file.filename}`;

    const fileMetadata = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      asset_id: assetId || null,
      file_name: req.file.originalname,
      file_url: fileUrl,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_by: user.userId,
      created_at: new Date().toISOString(),
    };

    logInfo('✅ Arquivo salvo', {
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
      type: req.file.mimetype,
    });

    res.json(fileMetadata);
  } catch (error) {
    logError('Erro ao fazer upload', error, { userId: req.user?.userId, assetId: req.body.assetId });
    
    // Remover arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Erro ao fazer upload do arquivo',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Upload de múltiplos arquivos
export const uploadMultipleFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      return;
    }

    const { assetId } = req.body;
    const user = req.user;

    if (!user) {
      // Remover todos os arquivos se não autenticado
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const filesMetadata = files.map(file => {
      const fileUrl = `/uploads/${file.filename}`;
      
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        asset_id: assetId || null,
        file_name: file.originalname,
        file_url: fileUrl,
        file_type: file.mimetype,
        file_size: file.size,
        uploaded_by: user.userId,
        created_at: new Date().toISOString(),
      };
    });

    logInfo(`✅ ${files.length} arquivo(s) salvo(s)`, { count: files.length, userId: req.user?.userId });

    res.json({ files: filesMetadata });
  } catch (error) {
    const errorFiles = req.files as Express.Multer.File[];
    logError('Erro ao fazer upload múltiplo', error, { userId: req.user?.userId, filesCount: errorFiles?.length });
    
    // Remover arquivos em caso de erro
    if (errorFiles) {
      errorFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao fazer upload dos arquivos',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Deletar arquivo
export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const filePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Arquivo não encontrado' });
      return;
    }

    // Verificar se o arquivo está dentro da pasta uploads (segurança)
    const uploadsDir = path.join(__dirname, '../../uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // Deletar arquivo
    fs.unlinkSync(filePath);

    logInfo('🗑️ Arquivo deletado', { filename, userId: req.user?.userId });

    res.json({ message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    logError('Erro ao deletar arquivo', error, { filename: req.params.filename, userId: req.user?.userId });
    res.status(500).json({ 
      error: 'Erro ao deletar arquivo',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

