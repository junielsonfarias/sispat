import { Router } from 'express';
import {
  createEmprestimo,
  devolverEmprestimo,
  getEmprestimo,
  listEmprestimos,
} from '../controllers/emprestimoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  createEmprestimoSchema,
  devolverEmprestimoSchema,
  uuidParamSchema,
  paginationQuerySchema,
} from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', zodValidate({ query: paginationQuerySchema }), listEmprestimos);
router.get('/:id', zodValidate({ params: uuidParamSchema }), getEmprestimo);

router.post(
  '/',
  authorize('admin', 'supervisor', 'usuario'),
  zodValidate({ body: createEmprestimoSchema }),
  createEmprestimo,
);

router.post(
  '/:id/devolver',
  authorize('admin', 'supervisor', 'usuario'),
  zodValidate({ params: uuidParamSchema, body: devolverEmprestimoSchema }),
  devolverEmprestimo,
);

export default router;
