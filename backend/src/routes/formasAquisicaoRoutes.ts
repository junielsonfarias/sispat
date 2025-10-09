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
 * @access Superuser/Supervisor
 */
router.post('/', authorize('superuser', 'supervisor'), createFormaAquisicao);

/**
 * @route PUT /api/formas-aquisicao/:id
 * @desc Atualizar forma de aquisição
 * @access Superuser/Supervisor
 */
router.put('/:id', authorize('superuser', 'supervisor'), updateFormaAquisicao);

/**
 * @route DELETE /api/formas-aquisicao/:id
 * @desc Deletar forma de aquisição
 * @access Superuser only
 */
router.delete('/:id', authorize('superuser'), deleteFormaAquisicao);

export default router;


