import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { NextFunction, Request, Response } from 'express';
import { logError, logWarn } from '../config/logger';
import {
  validateFileOnDisk,
  mimeMatchesDetected,
  validateDocumentOnDisk,
} from '../utils/file-validation';

// Garantir que a pasta uploads existe
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Gerar nome único: timestamp + nome original sanitizado
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    let ext = path.extname(file.originalname);

    // Se não tiver extensão, determinar pelo mimetype declarado (validado depois)
    if (!ext || ext === '') {
      const mimeToExt: { [key: string]: string } = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
      };
      ext = mimeToExt[file.mimetype] || '.bin';
    }

    let nameWithoutExt = path.basename(file.originalname, ext);

    if (
      nameWithoutExt.startsWith('blob-') ||
      nameWithoutExt.length < 3 ||
      !/^[a-zA-Z0-9]/.test(nameWithoutExt)
    ) {
      if (file.mimetype.startsWith('image/')) {
        nameWithoutExt = 'image';
      } else if (file.mimetype === 'application/pdf') {
        nameWithoutExt = 'document';
      } else {
        nameWithoutExt = 'file';
      }
    } else {
      nameWithoutExt = nameWithoutExt
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
    }

    const finalName = `${nameWithoutExt}-${uniqueSuffix}${ext}`;
    cb(null, finalName);
  },
});

// Filtro inicial — apenas pelo mimetype declarado (defesa em profundidade;
// magic bytes são validados depois em `verifyMagicBytes`).
// SVG é bloqueado explicitamente: pode conter <script> e executar JS quando
// renderizado inline.
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'image/svg+xml') {
    cb(new Error('SVG não é permitido por segurança.'));
    return;
  }
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Tipo de arquivo não permitido. Apenas imagens (JPEG, PNG, GIF, WebP) e PDF são aceitos.'));
};

// Configuração do multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max por arquivo
  },
});

// Middleware para múltiplos arquivos
export const uploadMultiple = upload.array('files', 10);

// Middleware para arquivo único
export const uploadSingle = upload.single('file');

/**
 * Remove um arquivo do disco silenciosamente.
 */
const unlinkSilently = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    logWarn('Falha ao remover arquivo inválido', { filePath, error: String(err) });
  }
};

/**
 * Middleware que roda DEPOIS do multer e valida o conteúdo real dos arquivos
 * (magic bytes). Se algum não bater com a whitelist, deleta tudo e retorna 400.
 *
 * Use em sequência:
 *   router.post('/single', uploadSingle, verifyMagicBytes, uploadFileController)
 */
export const verifyMagicBytes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...(req.files as Express.Multer.File[]));

    if (files.length === 0) {
      next();
      return;
    }

    for (const file of files) {
      const detected = await validateFileOnDisk(file.path);
      if (!detected) {
        logWarn('🚫 Upload bloqueado: magic bytes não reconhecidos', {
          filename: file.filename,
          declaredMime: file.mimetype,
          originalname: file.originalname,
        });
        files.forEach((f) => unlinkSilently(f.path));
        res.status(400).json({ error: 'Tipo de arquivo não permitido (conteúdo inválido).' });
        return;
      }
      if (!mimeMatchesDetected(file.mimetype, detected)) {
        logWarn('🚫 Upload bloqueado: mimetype declarado não bate com conteúdo', {
          filename: file.filename,
          declaredMime: file.mimetype,
          detectedMime: detected.mime,
        });
        files.forEach((f) => unlinkSilently(f.path));
        res.status(400).json({ error: 'Tipo de arquivo declarado não corresponde ao conteúdo.' });
        return;
      }
    }

    next();
  } catch (err) {
    logError('Erro ao validar magic bytes de upload', err);
    // Limpa arquivos antes de propagar — não deixa lixo no disco
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...(req.files as Express.Multer.File[]));
    files.forEach((f) => unlinkSilently(f.path));
    next(err);
  }
};

/**
 * Variante de `verifyMagicBytes` para o upload de DOCUMENTOS, que aceita
 * (além de imagens/PDF) Office moderno/legado e texto puro. Roda DEPOIS do
 * multer do documentController e valida o conteúdo contra o mimetype declarado.
 *
 *   router.post('/', upload.single('file'), verifyDocumentMagicBytes, createDocument)
 */
export const verifyDocumentMagicBytes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const collectFiles = (): Express.Multer.File[] => {
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...(req.files as Express.Multer.File[]));
    return files;
  };

  try {
    const files = collectFiles();
    if (files.length === 0) {
      next();
      return;
    }

    for (const file of files) {
      const ok = await validateDocumentOnDisk(file.path, file.mimetype);
      if (!ok) {
        logWarn('🚫 Upload de documento bloqueado: conteúdo não corresponde ao tipo declarado', {
          filename: file.filename,
          declaredMime: file.mimetype,
          originalname: file.originalname,
        });
        files.forEach((f) => unlinkSilently(f.path));
        res.status(400).json({ error: 'Tipo de arquivo não permitido (conteúdo inválido).' });
        return;
      }
    }

    next();
  } catch (err) {
    logError('Erro ao validar magic bytes de documento', err);
    collectFiles().forEach((f) => unlinkSilently(f.path));
    next(err);
  }
};
