import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getCustomization,
  getPublicCustomization,
  saveCustomization,
  resetCustomization,
} from '../controllers/customizationController';

const router = Router();

// Buscar customização pública (sem autenticação - para tela de login)
router.get('/public', getPublicCustomization);

// Buscar customização (autenticado)
router.get('/', authenticateToken, getCustomization);

// Salvar customização (autenticado)
router.put('/', authenticateToken, saveCustomization);

// Resetar customização (autenticado)
router.post('/reset', authenticateToken, resetCustomization);

export default router;

