import { Router } from 'express';
import {
  getLocais,
  getLocalById,
  createLocal,
  updateLocal,
  deleteLocal,
} from '../controllers/locaisController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, localValidations, queryValidations } from '../middlewares/validation';
import { param } from 'express-validator';

const router = Router();

router.use(authenticateToken);

router.get('/', queryValidations.pagination, handleValidationErrors, getLocais);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  getLocalById,
);

router.post(
  '/',
  authorize('superuser', 'supervisor'),
  localValidations.create,
  handleValidationErrors,
  createLocal,
);

router.put(
  '/:id',
  authorize('superuser', 'supervisor'),
  localValidations.update,
  handleValidationErrors,
  updateLocal,
);

router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  deleteLocal,
);

export default router;
