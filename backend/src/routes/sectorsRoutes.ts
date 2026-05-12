import { Router } from 'express';
import {
  getSectors,
  getSectorById,
  createSector,
  updateSector,
  deleteSector,
} from '../controllers/sectorsController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createSectorSchema,
  updateSectorSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  zodValidate({ query: paginationQuerySchema }),
  getSectors,
);

router.get(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  getSectorById,
);

router.post(
  '/',
  authorize('superuser', 'supervisor'),
  zodValidate({ body: createSectorSchema }),
  createSector,
);

router.put(
  '/:id',
  authorize('superuser', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateSectorSchema }),
  updateSector,
);

router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteSector,
);

export default router;
