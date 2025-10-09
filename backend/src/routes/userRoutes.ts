import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// GET /api/users - Listar usuários
router.get('/', getUsers);

// GET /api/users/:id - Buscar usuário por ID
router.get('/:id', getUserById);

// POST /api/users - Criar usuário (apenas admin/superuser)
router.post('/', authorize('superuser'), createUser);

// PUT /api/users/:id - Atualizar usuário (apenas admin/superuser)
router.put('/:id', authorize('superuser'), updateUser);

// DELETE /api/users/:id - Deletar usuário (apenas superuser)
router.delete('/:id', authorize('superuser'), deleteUser);

export default router;
