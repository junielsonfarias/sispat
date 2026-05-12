import { Router } from 'express';
import {
  createEmprestimo,
  devolverEmprestimo,
  getEmprestimo,
  listEmprestimos,
} from '../controllers/emprestimoController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listEmprestimos);
router.get('/:id', getEmprestimo);

router.post('/', authorize('admin', 'supervisor', 'usuario'), createEmprestimo);
router.post('/:id/devolver', authorize('admin', 'supervisor', 'usuario'), devolverEmprestimo);

export default router;
