import { Router } from 'express';
import { uploadFile, uploadMultipleFiles, deleteFile } from '../controllers/uploadController';
import { uploadSingle, uploadMultiple, verifyMagicBytes } from '../middlewares/uploadMiddleware';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Upload de arquivo único — multer salva → valida magic bytes → controller
router.post('/single', uploadSingle, verifyMagicBytes, uploadFile);

// Upload de múltiplos arquivos
router.post('/multiple', uploadMultiple, verifyMagicBytes, uploadMultipleFiles);

// Deletar arquivo
router.delete('/:filename', deleteFile);

export default router;

