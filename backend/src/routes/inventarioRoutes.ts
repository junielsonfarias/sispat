import { Router } from 'express';
import {
  getInventarios,
  getInventarioById,
  createInventario,
  updateInventario,
  deleteInventario,
} from '../controllers/inventarioController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, inventarioValidations, queryValidations } from '../middlewares/validation';
import { param } from 'express-validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/inventarios
 * @desc Obter todos os inventários
 * @access Private
 */
router.get('/', queryValidations.pagination, handleValidationErrors, getInventarios);

/**
 * @route GET /api/inventarios/:id
 * @desc Obter inventário por ID
 * @access Private
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  getInventarioById,
);

/**
 * @route POST /api/inventarios
 * @desc Criar novo inventário
 * @access Private
 */
router.post('/', inventarioValidations.create, handleValidationErrors, createInventario);

/**
 * @route PUT /api/inventarios/:id
 * @desc Atualizar inventário
 * @access Private
 */
router.put('/:id', inventarioValidations.update, handleValidationErrors, updateInventario);

/**
 * @route DELETE /api/inventarios/:id
 * @desc Deletar inventário
 * @access Superuser/Supervisor
 */
router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  deleteInventario,
);

export default router;
