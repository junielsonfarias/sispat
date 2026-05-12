import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
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
router.post('/', zodValidate({ body: createManutencaoSchema }), createManutencaoTask);
router.put(
  '/:id',
  zodValidate({ params: uuidParamSchema, body: updateManutencaoSchema }),
  updateManutencaoTask,
);
router.delete('/:id', zodValidate({ params: uuidParamSchema }), deleteManutencaoTask);

export default router;
