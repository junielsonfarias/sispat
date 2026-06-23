import { Router } from 'express';
import {
  getTiposBens,
  getTipoBemById,
  createTipoBem,
  updateTipoBem,
  deleteTipoBem,
} from '../controllers/tiposBensController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createTipoBemSchema,
  updateTipoBemSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  zodValidate({ query: paginationQuerySchema }),
  getTiposBens,
);

router.get(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  getTipoBemById,
);

router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createTipoBemSchema }),
  createTipoBem,
);

router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateTipoBemSchema }),
  updateTipoBem,
);

router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteTipoBem,
);

export default router;
