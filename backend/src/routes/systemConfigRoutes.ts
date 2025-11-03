import { Router } from 'express';
import { authenticateToken, authorize } from '../middlewares/auth';
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
router.put('/', authenticateToken, authorize('admin', 'superuser'), updateSystemConfiguration);

export default router;


