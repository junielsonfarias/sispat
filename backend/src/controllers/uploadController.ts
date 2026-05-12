import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';
import { prisma } from '../config/database';

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

/**
 * Verifica se um arquivo (por filename) está referenciado em alguma entidade
 * do município do usuário. Usado para evitar IDOR no delete: garante que o
 * usuário só pode apagar arquivos vinculados ao seu próprio município.
 *
 * Estratégia: como não temos tabela de Upload com metadata, validamos por
 * todas as superfícies que armazenam URLs de arquivo. Superuser bypassa.
 */
const isFileOwnedByMunicipality = async (
  filename: string,
  municipalityId: string,
): Promise<boolean> => {
  const fileUrl = `/uploads/${filename}`;

  const [patrimonio, imovel, documento, customization, municipality, user] = await Promise.all([
    prisma.patrimonio.findFirst({
      where: {
        municipalityId,
        OR: [
          { fotos: { has: fileUrl } },
          { documentos: { has: fileUrl } },
          { documentos_baixa: { has: fileUrl } },
        ],
      },
      select: { id: true },
    }),
    prisma.imovel.findFirst({
      where: {
        municipalityId,
        OR: [
          { fotos: { has: fileUrl } },
          { documentos: { has: fileUrl } },
        ],
      },
      select: { id: true },
    }),
    prisma.documento.findFirst({
      where: {
        url: { contains: filename },
        OR: [
          { patrimonio: { municipalityId } },
          { imovel: { municipalityId } },
        ],
      },
      select: { id: true },
    }),
    prisma.customization.findFirst({
      where: {
        municipalityId,
        OR: [
          { activeLogoUrl: { contains: filename } },
          { secondaryLogoUrl: { contains: filename } },
          { backgroundImageUrl: { contains: filename } },
          { backgroundVideoUrl: { contains: filename } },
          { faviconUrl: { contains: filename } },
        ],
      },
      select: { id: true },
    }),
    prisma.municipality.findFirst({
      where: { id: municipalityId, logoUrl: { contains: filename } },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { municipalityId, avatar: { contains: filename } },
      select: { id: true },
    }),
  ]);

  return Boolean(patrimonio || imovel || documento || customization || municipality || user);
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

    // Sanitização básica: rejeita nomes com path separators ou ".."
    if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      res.status(400).json({ error: 'Nome de arquivo inválido' });
      return;
    }

    const filePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Arquivo não encontrado' });
      return;
    }

    // Verificar se o arquivo está dentro da pasta uploads (path traversal)
    const uploadsDir = path.join(__dirname, '../../uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // Tenant isolation: arquivo precisa estar vinculado ao município do usuário.
    // Superuser pode apagar qualquer arquivo (operação de plataforma).
    if (user.role !== 'superuser') {
      const owned = await isFileOwnedByMunicipality(filename, user.municipalityId);
      if (!owned) {
        logWarn('🚫 Tentativa de deletar arquivo de outro município', {
          filename,
          userId: user.userId,
          municipalityId: user.municipalityId,
        });
        res.status(403).json({ error: 'Arquivo não pertence ao seu município' });
        return;
      }
    }

    // Deletar arquivo
    fs.unlinkSync(filePath);

    logInfo('🗑️ Arquivo deletado', { filename, userId: user.userId, municipalityId: user.municipalityId });

    res.json({ message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    logError('Erro ao deletar arquivo', error, { filename: req.params.filename, userId: req.user?.userId });
    res.status(500).json({
      error: 'Erro ao deletar arquivo',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};
