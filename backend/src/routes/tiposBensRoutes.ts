import { Router } from 'express';
import {
  getTiposBens,
  getTipoBemById,
  createTipoBem,
  updateTipoBem,
  deleteTipoBem,
} from '../controllers/tiposBensController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, tipoBemValidations, queryValidations } from '../middlewares/validation';
import { param } from 'express-validator';

const router = Router();

router.use(authenticateToken);

router.get('/', queryValidations.pagination, handleValidationErrors, getTiposBens);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  getTipoBemById,
);

router.post(
  '/',
  authorize('superuser', 'supervisor'),
  tipoBemValidations.create,
  handleValidationErrors,
  createTipoBem,
);

router.put(
  '/:id',
  authorize('superuser', 'supervisor'),
  tipoBemValidations.update,
  handleValidationErrors,
  updateTipoBem,
);

router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  deleteTipoBem,
);

export default router;
