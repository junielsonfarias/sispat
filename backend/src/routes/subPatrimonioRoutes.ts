import { Router } from 'express';
import { z } from 'zod';
import {
  getSubPatrimonios,
  createSubPatrimonio,
  updateSubPatrimonio,
  deleteSubPatrimonio,
  bulkStatusSubPatrimonios,
} from '../controllers/subPatrimonioController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createSubPatrimonioSchema,
  updateSubPatrimonioSchema,
  bulkStatusSubPatrimonioSchema,
} from '@sispat/shared';

// Aninhado em /api/patrimonios/:patrimonioId/sub-patrimonios — precisa de
// mergeParams para enxergar :patrimonioId.
const router = Router({ mergeParams: true });

const parentParams = z.object({ patrimonioId: z.string().uuid() });
const subParams = z.object({
  patrimonioId: z.string().uuid(),
  id: z.string().uuid(),
});

router.use(authenticateToken);

// Leitura: todos os autenticados
router.get('/', zodValidate({ params: parentParams }), getSubPatrimonios);

// Escrita: mesmo conjunto de papéis que edita patrimônio
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: parentParams, body: createSubPatrimonioSchema }),
  createSubPatrimonio,
);
router.post(
  '/bulk-status',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: parentParams, body: bulkStatusSubPatrimonioSchema }),
  bulkStatusSubPatrimonios,
);
router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: subParams, body: updateSubPatrimonioSchema }),
  updateSubPatrimonio,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: subParams }),
  deleteSubPatrimonio,
);

export default router;
