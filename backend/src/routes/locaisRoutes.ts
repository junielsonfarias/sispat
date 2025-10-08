import { Router } from 'express';
import {
  getLocais,
  getLocalById,
  createLocal,
  updateLocal,
  deleteLocal,
} from '../controllers/locaisController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/locais
 * @desc Obter todos os locais (pode filtrar por setorId via query)
 * @access Private
 */
router.get('/', getLocais);

/**
 * @route GET /api/locais/:id
 * @desc Obter local por ID
 * @access Private
 */
router.get('/:id', getLocalById);

/**
 * @route POST /api/locais
 * @desc Criar novo local
 * @access Admin/Gestor
 */
router.post('/', authorize('admin', 'gestor'), createLocal);

/**
 * @route PUT /api/locais/:id
 * @desc Atualizar local
 * @access Admin/Gestor
 */
router.put('/:id', authorize('admin', 'gestor'), updateLocal);

/**
 * @route DELETE /api/locais/:id
 * @desc Deletar local
 * @access Admin only
 */
router.delete('/:id', authorize('admin'), deleteLocal);

export default router;


