import { Router } from 'express';
import {
  listTransfers,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  getTransfer,
  deleteTransfer
} from '../controllers/transferController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Todas as rotas requerem autenticação
 */
router.use(authenticateToken);

/**
 * @route GET /api/transfers
 * @desc Listar transferências
 * @access Private (All authenticated users)
 */
router.get('/', listTransfers);

/**
 * @route GET /api/transfers/:id
 * @desc Obter transferência por ID
 * @access Private (All authenticated users)
 */
router.get('/:id', getTransfer);

/**
 * @route POST /api/transfers
 * @desc Criar transferência
 * @access Private (admin, supervisor, usuario)
 */
router.post('/', authorize('admin', 'supervisor', 'usuario'), createTransfer);

/**
 * @route PATCH /api/transfers/:id/approve
 * @desc Aprovar transferência
 * @access Private (admin, supervisor)
 */
router.patch('/:id/approve', authorize('admin', 'supervisor'), approveTransfer);

/**
 * @route PATCH /api/transfers/:id/reject
 * @desc Rejeitar transferência
 * @access Private (admin, supervisor)
 */
router.patch('/:id/reject', authorize('admin', 'supervisor'), rejectTransfer);

/**
 * @route DELETE /api/transfers/:id
 * @desc Deletar transferência
 * @access Private (admin, supervisor)
 */
router.delete('/:id', authorize('admin', 'supervisor'), deleteTransfer);

export default router;
