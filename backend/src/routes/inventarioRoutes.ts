import { Router } from 'express';
import {
  getInventarios,
  getInventarioById,
  createInventario,
  updateInventario,
  deleteInventario,
} from '../controllers/inventarioController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createInventarioSchema,
  updateInventarioSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', zodValidate({ query: paginationQuerySchema }), getInventarios);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getInventarioById);
router.post('/', zodValidate({ body: createInventarioSchema }), createInventario);
router.put(
  '/:id',
  zodValidate({ params: uuidParamSchema, body: updateInventarioSchema }),
  updateInventario,
);
router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteInventario,
);

export default router;
