import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { handleValidationErrors, customizationValidations } from '../middlewares/validation';
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

// Salvar customização (autenticado).
// O controller faz a validação crítica (whitelist + isSafeUrl). Esta camada
// rejeita payloads grossos cedo.
router.put(
  '/',
  authenticateToken,
  customizationValidations.save,
  handleValidationErrors,
  saveCustomization,
);

// Resetar customização (autenticado)
router.post('/reset', authenticateToken, resetCustomization);

export default router;
