import { Router } from 'express';
import {
  createEmprestimo,
  devolverEmprestimo,
  getEmprestimo,
  listEmprestimos,
} from '../controllers/emprestimoController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, emprestimoValidations, queryValidations } from '../middlewares/validation';

const router = Router();

router.use(authenticateToken);

router.get('/', queryValidations.pagination, handleValidationErrors, listEmprestimos);

router.get('/:id', emprestimoValidations.byId, handleValidationErrors, getEmprestimo);

router.post(
  '/',
  authorize('admin', 'supervisor', 'usuario'),
  emprestimoValidations.create,
  handleValidationErrors,
  createEmprestimo,
);

router.post(
  '/:id/devolver',
  authorize('admin', 'supervisor', 'usuario'),
  emprestimoValidations.devolver,
  handleValidationErrors,
  devolverEmprestimo,
);

export default router;
