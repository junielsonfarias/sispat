import { Router } from 'express';
import {
  getLocais,
  getLocalById,
  createLocal,
  updateLocal,
  deleteLocal,
} from '../controllers/locaisController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createLocalSchema,
  updateLocalSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  zodValidate({ query: paginationQuerySchema }),
  getLocais,
);

router.get(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  getLocalById,
);

// Criar/editar: o 'usuario' (Responsável Patrimonial) gerencia locais dos
// SEUS setores. A trava por setor (responsibleSectors) é reforçada no
// controller — authorize só libera o papel; não basta para o acesso ao setor.
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ body: createLocalSchema }),
  createLocal,
);

router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema, body: updateLocalSchema }),
  updateLocal,
);

// Excluir permanece restrito a admin/supervisor (ação destrutiva).
router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteLocal,
);

export default router;
