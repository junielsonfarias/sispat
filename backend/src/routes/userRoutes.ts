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

// POST /api/users - Criar usuário (superuser e supervisor)
router.post('/', authorize('superuser', 'supervisor'), createUser);

// PUT /api/users/:id - Atualizar usuário (superuser e supervisor)
router.put('/:id', authorize('superuser', 'supervisor'), updateUser);

// DELETE /api/users/:id - Deletar usuário (superuser e supervisor)
router.delete('/:id', authorize('superuser', 'supervisor'), deleteUser);

export default router;
