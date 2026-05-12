import { Router } from 'express';
import {
  getLabelTemplates,
  getLabelTemplateById,
  createLabelTemplate,
  updateLabelTemplate,
  deleteLabelTemplate,
} from '../controllers/labelTemplateController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createLabelTemplateSchema,
  updateLabelTemplateSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', zodValidate({ query: paginationQuerySchema }), getLabelTemplates);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getLabelTemplateById);

router.post(
  '/',
  authorize('admin', 'supervisor'),
  zodValidate({ body: createLabelTemplateSchema }),
  createLabelTemplate,
);

router.put(
  '/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateLabelTemplateSchema }),
  updateLabelTemplate,
);

router.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteLabelTemplate,
);

export default router;
