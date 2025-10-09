import { Router } from 'express';
import {
  getInventarios,
  getInventarioById,
  createInventario,
  updateInventario,
  deleteInventario,
} from '../controllers/inventarioController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/inventarios
 * @desc Obter todos os inventários
 * @access Private
 */
router.get('/', getInventarios);

/**
 * @route GET /api/inventarios/:id
 * @desc Obter inventário por ID
 * @access Private
 */
router.get('/:id', getInventarioById);

/**
 * @route POST /api/inventarios
 * @desc Criar novo inventário
 * @access Private
 */
router.post('/', createInventario);

/**
 * @route PUT /api/inventarios/:id
 * @desc Atualizar inventário
 * @access Private
 */
router.put('/:id', updateInventario);

/**
 * @route DELETE /api/inventarios/:id
 * @desc Deletar inventário
 * @access Superuser/Supervisor
 */
router.delete('/:id', authorize('superuser', 'supervisor'), deleteInventario);

export default router;


