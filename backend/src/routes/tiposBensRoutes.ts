import { Router } from 'express';
import {
  getTiposBens,
  getTipoBemById,
  createTipoBem,
  updateTipoBem,
  deleteTipoBem,
} from '../controllers/tiposBensController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/tipos-bens
 * @desc Obter todos os tipos de bens
 * @access Private
 */
router.get('/', getTiposBens);

/**
 * @route GET /api/tipos-bens/:id
 * @desc Obter tipo de bem por ID
 * @access Private
 */
router.get('/:id', getTipoBemById);

/**
 * @route POST /api/tipos-bens
 * @desc Criar novo tipo de bem
 * @access Admin/Supervisor
 */
router.post('/', authorize('superuser', 'supervisor'), createTipoBem);

/**
 * @route PUT /api/tipos-bens/:id
 * @desc Atualizar tipo de bem
 * @access Admin/Supervisor
 */
router.put('/:id', authorize('superuser', 'supervisor'), updateTipoBem);

/**
 * @route DELETE /api/tipos-bens/:id
 * @desc Deletar tipo de bem
 * @access Admin only
 */
router.delete('/:id', authorize('superuser'), deleteTipoBem);

export default router;


