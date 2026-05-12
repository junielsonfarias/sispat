import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, userValidations, queryValidations } from '../middlewares/validation';
import { param } from 'express-validator';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// GET /api/users - Listar usuários
router.get('/', queryValidations.pagination, handleValidationErrors, getUsers);

// GET /api/users/:id - Buscar usuário por ID
router.get(
  '/:id',
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  getUserById,
);

// POST /api/users - Criar usuário (superuser e supervisor)
router.post(
  '/',
  authorize('superuser', 'supervisor'),
  userValidations.create,
  handleValidationErrors,
  createUser,
);

// PUT /api/users/:id - Atualizar usuário (superuser e supervisor)
router.put(
  '/:id',
  authorize('superuser', 'supervisor'),
  userValidations.update,
  handleValidationErrors,
  updateUser,
);

// DELETE /api/users/:id - Deletar usuário (superuser e supervisor)
router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  deleteUser,
);

export default router;
