import { Router } from 'express';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import { updateSystemConfigSchema } from '@sispat/shared';
import {
  getPublicSystemConfiguration,
  getSystemConfiguration,
  updateSystemConfiguration,
} from '../controllers/systemConfigController';

const router = Router();

// Rota pública (sem autenticação) - removida pois está sendo acessada via /api/public
// router.get('/system-configuration', getPublicSystemConfiguration);

// Rotas autenticadas
router.get('/', authenticateToken, getSystemConfiguration);
router.put(
  '/',
  authenticateToken,
  authorize('admin', 'superuser'),
  zodValidate({ body: updateSystemConfigSchema }),
  updateSystemConfiguration,
);

export default router;


