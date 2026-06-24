import { Router } from 'express';
import {
  getRegularizacoes,
  getRegularizacaoById,
  createRegularizacao,
  updateRegularizacao,
  incorporarRegularizacao,
  incorporarRegularizacaoLote,
  cancelarRegularizacao,
  deleteRegularizacao,
} from '../controllers/regularizacaoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createRegularizacaoSchema,
  updateRegularizacaoSchema,
  incorporarRegularizacaoSchema,
  incorporarRegularizacaoLoteSchema,
  uuidParamSchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

// Leitura: gestores e responsáveis
router.get('/', authorize('superuser', 'admin', 'supervisor', 'usuario'), getRegularizacoes);
router.get(
  '/:id',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema }),
  getRegularizacaoById,
);

// Escrita: Comissão Especial de Regularização (admin/supervisor/superuser)
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createRegularizacaoSchema }),
  createRegularizacao,
);
router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateRegularizacaoSchema }),
  updateRegularizacao,
);
// Incorporação em lote (várias regularizações p/ mesmo setor/local/tipo).
// Antes de /:id/incorporar para não capturar "incorporar-lote" como :id.
router.post(
  '/incorporar-lote',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: incorporarRegularizacaoLoteSchema }),
  incorporarRegularizacaoLote,
);
router.post(
  '/:id/incorporar',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: incorporarRegularizacaoSchema }),
  incorporarRegularizacao,
);
router.post(
  '/:id/cancelar',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  cancelarRegularizacao,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema }),
  deleteRegularizacao,
);

export default router;
