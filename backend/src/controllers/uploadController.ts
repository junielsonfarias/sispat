import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    municipalityId: string;
  };
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

    console.log('✅ Arquivo salvo:', {
      filename: req.file.filename,
      path: req.file.path,
      url: fileUrl,
      size: req.file.size,
      type: req.file.mimetype,
    });

    res.json(fileMetadata);
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    
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

    console.log(`✅ ${files.length} arquivo(s) salvo(s)`);

    res.json({ files: filesMetadata });
  } catch (error) {
    console.error('Erro ao fazer upload múltiplo:', error);
    
    // Remover arquivos em caso de erro
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach(file => {
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

    console.log('🗑️ Arquivo deletado:', filename);

    res.json({ message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({ 
      error: 'Erro ao deletar arquivo',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

