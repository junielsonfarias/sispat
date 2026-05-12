import { Router } from 'express';
import {
  getFormasAquisicao,
  getFormaAquisicaoById,
  createFormaAquisicao,
  updateFormaAquisicao,
  deleteFormaAquisicao,
} from '../controllers/formasAquisicaoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, formaAquisicaoValidations, queryValidations } from '../middlewares/validation';

const router = Router();

router.use(authenticateToken);

router.get('/', queryValidations.pagination, handleValidationErrors, getFormasAquisicao);

router.get(
  '/:id',
  formaAquisicaoValidations.byId,
  handleValidationErrors,
  getFormaAquisicaoById,
);

router.post(
  '/',
  authorize('superuser', 'supervisor'),
  formaAquisicaoValidations.create,
  handleValidationErrors,
  createFormaAquisicao,
);

router.put(
  '/:id',
  authorize('superuser', 'supervisor'),
  formaAquisicaoValidations.update,
  handleValidationErrors,
  updateFormaAquisicao,
);

router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  formaAquisicaoValidations.byId,
  handleValidationErrors,
  deleteFormaAquisicao,
);

export default router;
