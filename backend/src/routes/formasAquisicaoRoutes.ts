import { Router } from 'express';
import {
  getFormasAquisicao,
  getFormaAquisicaoById,
  createFormaAquisicao,
  updateFormaAquisicao,
  deleteFormaAquisicao,
} from '../controllers/formasAquisicaoController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/formas-aquisicao
 * @desc Obter todas as formas de aquisição
 * @access Private
 */
router.get('/', getFormasAquisicao);

/**
 * @route GET /api/formas-aquisicao/:id
 * @desc Obter forma de aquisição por ID
 * @access Private
 */
router.get('/:id', getFormaAquisicaoById);

/**
 * @route POST /api/formas-aquisicao
 * @desc Criar nova forma de aquisição
 * @access Admin/Gestor
 */
router.post('/', authorize('admin', 'gestor'), createFormaAquisicao);

/**
 * @route PUT /api/formas-aquisicao/:id
 * @desc Atualizar forma de aquisição
 * @access Admin/Gestor
 */
router.put('/:id', authorize('admin', 'gestor'), updateFormaAquisicao);

/**
 * @route DELETE /api/formas-aquisicao/:id
 * @desc Deletar forma de aquisição
 * @access Admin only
 */
router.delete('/:id', authorize('admin'), deleteFormaAquisicao);

export default router;


