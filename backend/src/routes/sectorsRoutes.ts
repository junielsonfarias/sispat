import { Router } from 'express';
import {
  getSectors,
  getSectorById,
  createSector,
  updateSector,
  deleteSector,
} from '../controllers/sectorsController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, sectorValidations, queryValidations } from '../middlewares/validation';
import { param } from 'express-validator';

const router = Router();

router.use(authenticateToken);

router.get('/', queryValidations.pagination, handleValidationErrors, getSectors);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  getSectorById,
);

router.post(
  '/',
  authorize('superuser', 'supervisor'),
  sectorValidations.create,
  handleValidationErrors,
  createSector,
);

router.put(
  '/:id',
  authorize('superuser', 'supervisor'),
  sectorValidations.update,
  handleValidationErrors,
  updateSector,
);

router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  deleteSector,
);

export default router;
