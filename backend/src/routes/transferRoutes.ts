import { Router } from 'express';
import {
  listTransfers,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  getTransfer,
  deleteTransfer,
} from '../controllers/transferController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createTransferSchema,
  approveTransferSchema,
  rejectTransferSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', zodValidate({ query: paginationQuerySchema }), listTransfers);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getTransfer);

router.post(
  '/',
  authorize('admin', 'supervisor', 'usuario'),
  zodValidate({ body: createTransferSchema }),
  createTransfer,
);

router.patch(
  '/:id/approve',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: approveTransferSchema }),
  approveTransfer,
);

router.patch(
  '/:id/reject',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: rejectTransferSchema }),
  rejectTransfer,
);

router.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteTransfer,
);

export default router;
