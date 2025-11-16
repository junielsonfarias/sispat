import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Garantir que a pasta uploads existe
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp + nome original sanitizado
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // ✅ CORREÇÃO: Obter extensão do nome original OU do mimetype
    let ext = path.extname(file.originalname);
    
    // Se não tiver extensão, determinar pelo mimetype
    if (!ext || ext === '') {
      const mimeToExt: { [key: string]: string } = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
      };
      ext = mimeToExt[file.mimetype] || '.jpg'; // Default para .jpg se não identificar
    }
    
    // ✅ CORREÇÃO: Se o nome original começar com "blob-", usar um nome genérico
    let nameWithoutExt = path.basename(file.originalname, path.extname(file.originalname));
    
    // Se o nome começar com "blob-" ou não tiver caracteres válidos, usar nome genérico
    if (nameWithoutExt.startsWith('blob-') || nameWithoutExt.length < 3) {
      // Determinar prefixo baseado no tipo
      if (file.mimetype.startsWith('image/')) {
        nameWithoutExt = 'image';
      } else if (file.mimetype === 'application/pdf') {
        nameWithoutExt = 'document';
      } else {
        nameWithoutExt = 'file';
      }
    } else {
      // Sanitizar nome original
      nameWithoutExt = nameWithoutExt
        .replace(/[^a-zA-Z0-9]/g, '-') // Sanitizar nome
        .substring(0, 50); // Limitar tamanho
    }
    
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de tipos de arquivo
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar apenas imagens e PDFs
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas imagens (JPEG, PNG, GIF, WebP) e PDF são aceitos.'));
  }
};

// Configuração do multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max por arquivo
  }
});

// Middleware para múltiplos arquivos
export const uploadMultiple = upload.array('files', 10); // Máximo 10 arquivos por vez

// Middleware para arquivo único
export const uploadSingle = upload.single('file');

