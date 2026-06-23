import { Router } from 'express';
import {
  getFormasAquisicao,
  getFormaAquisicaoById,
  createFormaAquisicao,
  updateFormaAquisicao,
  deleteFormaAquisicao,
} from '../controllers/formasAquisicaoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createFormaAquisicaoSchema,
  updateFormaAquisicaoSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', zodValidate({ query: paginationQuerySchema }), getFormasAquisicao);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getFormaAquisicaoById);

router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ body: createFormaAquisicaoSchema }),
  createFormaAquisicao,
);

router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateFormaAquisicaoSchema }),
  updateFormaAquisicao,
);

router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteFormaAquisicao,
);

export default router;
