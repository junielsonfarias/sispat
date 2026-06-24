import { Router } from 'express';
import {
  getDesafetacoes,
  getDesafetacaoById,
  createDesafetacao,
  createDesafetacaoLote,
  updateDesafetacao,
  concluirDesafetacao,
  cancelarDesafetacao,
  deleteDesafetacao,
  reclassificarDestinacao,
} from '../controllers/desafetacaoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createDesafetacaoSchema,
  createDesafetacaoLoteSchema,
  updateDesafetacaoSchema,
  reclassificarDestinacaoSchema,
  reclassificarParamsSchema,
  uuidParamSchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

// Leitura: todos os autenticados (visualizador inclusive)
router.get('/', getDesafetacoes);

// Reclassificação direta da destinação (revisão do acervo). Antes de /:id.
router.patch(
  '/reclassificar/:tipo/:bemId',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: reclassificarParamsSchema, body: reclassificarDestinacaoSchema }),
  reclassificarDestinacao,
);

router.get('/:id', zodValidate({ params: uuidParamSchema }), getDesafetacaoById);

// Escrita: comissão de desfazimento/desafetação — admin/supervisor/superuser
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createDesafetacaoSchema }),
  createDesafetacao,
);
// Desafetação em lote (1 base legal/parecer p/ N bens — Art. 22). Antes de /:id.
router.post(
  '/lote',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createDesafetacaoLoteSchema }),
  createDesafetacaoLote,
);
router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateDesafetacaoSchema }),
  updateDesafetacao,
);
router.post(
  '/:id/concluir',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  concluirDesafetacao,
);
router.post(
  '/:id/cancelar',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  cancelarDesafetacao,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema }),
  deleteDesafetacao,
);

export default router;
