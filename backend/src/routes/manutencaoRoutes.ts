import { Router } from 'express';
import { authenticateToken, authorize } from '../middlewares/auth';
import {
  listManutencaoTasks,
  createManutencaoTask,
  updateManutencaoTask,
  deleteManutencaoTask,
  getManutencaoTask,
} from '../controllers/manutencaoController';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createManutencaoSchema,
  updateManutencaoSchema,
  uuidParamSchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', listManutencaoTasks);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getManutencaoTask);
router.post(
  '/',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ body: createManutencaoSchema }),
  createManutencaoTask,
);
router.put(
  '/:id',
  authorize('superuser', 'admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema, body: updateManutencaoSchema }),
  updateManutencaoTask,
);
router.delete(
  '/:id',
  authorize('superuser', 'admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteManutencaoTask,
);

export default router;
