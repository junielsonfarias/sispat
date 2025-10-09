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
 * @access Superuser/Supervisor
 */
router.post('/', authorize('superuser', 'supervisor'), createLocal);

/**
 * @route PUT /api/locais/:id
 * @desc Atualizar local
 * @access Superuser/Supervisor
 */
router.put('/:id', authorize('superuser', 'supervisor'), updateLocal);

/**
 * @route DELETE /api/locais/:id
 * @desc Deletar local
 * @access Superuser/Supervisor
 */
router.delete('/:id', authorize('superuser', 'supervisor'), deleteLocal);

export default router;


