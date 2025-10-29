import { Router } from 'express';
import {
  listDocuments,
  createDocument,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  listPublicDocuments,
  upload
} from '../controllers/documentController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

/**
 * @route GET /api/documents/public
 * @desc Listar documentos públicos
 * @access Public
 */
router.get('/public', listPublicDocuments);

/**
 * Todas as outras rotas requerem autenticação
 */
router.use(authenticateToken);

/**
 * @route GET /api/documents
 * @desc Listar documentos
 * @access Private (All authenticated users)
 */
router.get('/', listDocuments);

/**
 * @route GET /api/documents/:id
 * @desc Obter documento por ID
 * @access Private (All authenticated users)
 */
router.get('/:id', getDocument);

/**
 * @route GET /api/documents/:id/download
 * @desc Download de documento
 * @access Private (All authenticated users)
 */
router.get('/:id/download', downloadDocument);

/**
 * @route POST /api/documents
 * @desc Criar documento
 * @access Private (admin, supervisor, usuario)
 */
router.post('/', authorize('admin', 'supervisor', 'usuario'), upload.single('file'), createDocument);

/**
 * @route PUT /api/documents/:id
 * @desc Atualizar documento
 * @access Private (admin, supervisor, usuario)
 */
router.put('/:id', authorize('admin', 'supervisor', 'usuario'), updateDocument);

/**
 * @route DELETE /api/documents/:id
 * @desc Deletar documento
 * @access Private (admin, supervisor, usuario)
 */
router.delete('/:id', authorize('admin', 'supervisor', 'usuario'), deleteDocument);

export default router;