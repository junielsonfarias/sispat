import { Router } from 'express';
import {
  listImoveis,
  getImovel,
  getByNumero,
  createImovel,
  updateImovel,
  deleteImovel,
} from '../controllers/imovelController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Todas as rotas requerem autenticação
 */
router.use(authenticateToken);

/**
 * @route GET /api/imoveis
 * @desc Listar imóveis com filtros
 * @access Private (All authenticated users)
 */
router.get('/', listImoveis);

/**
 * @route GET /api/imoveis/numero/:numero
 * @desc Buscar imóvel por número
 * @access Private
 */
router.get('/numero/:numero', getByNumero);

/**
 * @route GET /api/imoveis/:id
 * @desc Obter imóvel por ID
 * @access Private
 */
router.get('/:id', getImovel);

/**
 * @route POST /api/imoveis
 * @desc Criar imóvel
 * @access Private (Admin, Supervisor, Usuario)
 */
router.post('/', authorize('superuser', 'admin', 'supervisor', 'usuario'), createImovel);

/**
 * @route PUT /api/imoveis/:id
 * @desc Atualizar imóvel
 * @access Private (Admin, Supervisor, Usuario)
 */
router.put('/:id', authorize('superuser', 'admin', 'supervisor', 'usuario'), updateImovel);

/**
 * @route DELETE /api/imoveis/:id
 * @desc Deletar imóvel
 * @access Private (Admin, Superuser only)
 */
router.delete('/:id', authorize('superuser', 'admin'), deleteImovel);

export default router;

