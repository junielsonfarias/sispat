import { Router } from 'express';
import {
  getConciliacoes,
  getConciliacaoById,
  createConciliacao,
  recalcularConciliacao,
  deleteConciliacao,
  getAlertaDepreciacao,
} from '../controllers/conciliacaoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import { createConciliacaoSchema, uuidParamSchema } from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

// Conciliação contábil é governança/contabilidade do município.
router.get('/', authorize('superuser', 'admin', 'supervisor'), getConciliacoes);
// Alerta de bens sem parâmetros de depreciação (qualidade de cadastro).
// Antes de '/:id' para não ser capturado como id.
router.get(
  '/alertas/depreciacao',
  authorize('superuser', 'admin', 'supervisor'),
  getAlertaDepreciacao,
);
router.get(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  getConciliacaoById,
);
router.post(
  '/',
  authorize('superuser', 'admin'),
  zodValidate({ body: createConciliacaoSchema }),
  createConciliacao,
);
router.post(
  '/:id/recalcular',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema }),
  recalcularConciliacao,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema }),
  deleteConciliacao,
);

export default router;
