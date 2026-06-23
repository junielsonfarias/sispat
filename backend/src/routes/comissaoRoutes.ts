import { Router } from 'express';
import {
  getComissoes,
  getComissaoAlertas,
  getComissaoById,
  createComissao,
  updateComissao,
  deleteComissao,
  addComissaoMembro,
  removeComissaoMembro,
} from '../controllers/comissaoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createComissaoSchema,
  updateComissaoSchema,
  addComissaoMembroSchema,
  comissaoMembroParamsSchema,
  uuidParamSchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

// Leitura: gestores e supervisores
router.get('/', authorize('superuser', 'admin', 'supervisor'), getComissoes);
router.get('/alertas', authorize('superuser', 'admin', 'supervisor'), getComissaoAlertas);
router.get(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  getComissaoById,
);

// Escrita: governança do município (admin/superuser)
router.post(
  '/',
  authorize('superuser', 'admin'),
  zodValidate({ body: createComissaoSchema }),
  createComissao,
);
router.put(
  '/:id',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema, body: updateComissaoSchema }),
  updateComissao,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema }),
  deleteComissao,
);

// Membros
router.post(
  '/:id/membros',
  authorize('superuser', 'admin'),
  zodValidate({ params: uuidParamSchema, body: addComissaoMembroSchema }),
  addComissaoMembro,
);
router.delete(
  '/:id/membros/:membroId',
  authorize('superuser', 'admin'),
  zodValidate({ params: comissaoMembroParamsSchema }),
  removeComissaoMembro,
);

export default router;
