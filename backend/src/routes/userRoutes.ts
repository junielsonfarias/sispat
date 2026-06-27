import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
} from '../controllers/userController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createUserSchema,
  updateUserSchema,
  resetUserPasswordSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

// Listar usuários do município é função de gestão — restrito a gestores
// (alinha com as rotas de escrita de usuário). usuario/visualizador não acessam.
router.get(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ query: paginationQuerySchema }),
  getUsers,
);

router.get(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  getUserById,
);

router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createUserSchema }),
  createUser,
);

router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateUserSchema }),
  updateUser,
);

router.post(
  '/:id/reset-password',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: resetUserPasswordSchema }),
  resetUserPassword,
);

router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteUser,
);

export default router;
