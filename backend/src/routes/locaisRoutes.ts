import { Router } from 'express';
import {
  getLocais,
  getLocalById,
  createLocal,
  updateLocal,
  deleteLocal,
} from '../controllers/locaisController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createLocalSchema,
  updateLocalSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  zodValidate({ query: paginationQuerySchema }),
  getLocais,
);

router.get(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  getLocalById,
);

router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createLocalSchema }),
  createLocal,
);

router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateLocalSchema }),
  updateLocal,
);

router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteLocal,
);

export default router;
