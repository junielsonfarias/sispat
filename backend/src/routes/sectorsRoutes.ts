import { Router } from 'express';
import {
  getSectors,
  getSectorById,
  createSector,
  updateSector,
  deleteSector,
} from '../controllers/sectorsController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/sectors
 * @desc Obter todos os setores
 * @access Private
 */
router.get('/', getSectors);

/**
 * @route GET /api/sectors/:id
 * @desc Obter setor por ID
 * @access Private
 */
router.get('/:id', getSectorById);

/**
 * @route POST /api/sectors
 * @desc Criar novo setor
 * @access Admin only
 */
router.post('/', authorize('admin'), createSector);

/**
 * @route PUT /api/sectors/:id
 * @desc Atualizar setor
 * @access Admin only
 */
router.put('/:id', authorize('admin'), updateSector);

/**
 * @route DELETE /api/sectors/:id
 * @desc Deletar setor
 * @access Admin only
 */
router.delete('/:id', authorize('admin'), deleteSector);

export default router;


