import { Router } from 'express';
import {
  getDesfazimentos,
  getDesfazimentoById,
  createDesfazimento,
  updateDesfazimento,
  concluirDesfazimento,
  cancelarDesfazimento,
  deleteDesfazimento,
} from '../controllers/desfazimentoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createDesfazimentoSchema,
  updateDesfazimentoSchema,
  uuidParamSchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

// Leitura: todos os autenticados
router.get('/', getDesfazimentos);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getDesfazimentoById);

// Escrita: Comissão de Desfazimento (admin/supervisor/superuser)
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createDesfazimentoSchema }),
  createDesfazimento,
);
router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateDesfazimentoSchema }),
  updateDesfazimento,
);
router.post(
  '/:id/concluir',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  concluirDesfazimento,
);
router.post(
  '/:id/cancelar',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  cancelarDesfazimento,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema }),
  deleteDesfazimento,
);

export default router;
