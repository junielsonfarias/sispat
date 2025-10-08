import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getCustomization,
  saveCustomization,
  resetCustomization,
} from '../controllers/customizationController';

const router = Router();

// Buscar customização
router.get('/', authenticateToken, getCustomization);

// Salvar customização
router.put('/', authenticateToken, saveCustomization);

// Resetar customização
router.post('/reset', authenticateToken, resetCustomization);

export default router;

