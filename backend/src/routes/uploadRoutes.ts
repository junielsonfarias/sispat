import { Router } from 'express';
import { uploadFile, uploadMultipleFiles, deleteFile } from '../controllers/uploadController';
import { uploadSingle, uploadMultiple } from '../middlewares/uploadMiddleware';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Upload de arquivo único
router.post('/single', uploadSingle, uploadFile);

// Upload de múltiplos arquivos
router.post('/multiple', uploadMultiple, uploadMultipleFiles);

// Deletar arquivo
router.delete('/:filename', deleteFile);

export default router;

