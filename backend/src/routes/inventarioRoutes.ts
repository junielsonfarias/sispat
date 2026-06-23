import { Router } from 'express';
import {
  getInventarios,
  getInventarioById,
  createInventario,
  updateInventario,
  updateInventarioItem,
  finalizeInventario,
  deleteInventario,
} from '../controllers/inventarioController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createInventarioSchema,
  updateInventarioSchema,
  updateInventarioItemSchema,
  inventarioItemParamsSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', zodValidate({ query: paginationQuerySchema }), getInventarios);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getInventarioById);
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ body: createInventarioSchema }),
  createInventario,
);
router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema, body: updateInventarioSchema }),
  updateInventario,
);
// Conferência de um item (marca encontrado/não encontrado e persiste)
router.patch(
  '/:id/items/:patrimonioId',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: inventarioItemParamsSchema, body: updateInventarioItemSchema }),
  updateInventarioItem,
);
// Finalizar inventário (conclui e marca não encontrados como extraviados)
router.post(
  '/:id/finalizar',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema }),
  finalizeInventario,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteInventario,
);

export default router;
