import { Router } from 'express';
import {
  getLabelTemplates,
  getLabelTemplateById,
  createLabelTemplate,
  updateLabelTemplate,
  deleteLabelTemplate,
} from '../controllers/labelTemplateController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, labelTemplateValidations, queryValidations } from '../middlewares/validation';

const router = Router();

router.use(authenticateToken);

router.get('/', queryValidations.pagination, handleValidationErrors, getLabelTemplates);

router.get(
  '/:id',
  labelTemplateValidations.byId,
  handleValidationErrors,
  getLabelTemplateById,
);

router.post(
  '/',
  authorize('admin', 'supervisor'),
  labelTemplateValidations.create,
  handleValidationErrors,
  createLabelTemplate,
);

router.put(
  '/:id',
  authorize('admin', 'supervisor'),
  labelTemplateValidations.update,
  handleValidationErrors,
  updateLabelTemplate,
);

router.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  labelTemplateValidations.byId,
  handleValidationErrors,
  deleteLabelTemplate,
);

export default router;
