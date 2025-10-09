import { Router } from 'express';
import {
  listPatrimonios,
  getPatrimonio,
  getByNumero,
  createPatrimonio,
  updatePatrimonio,
  deletePatrimonio,
  addNote,
  registrarBaixaPatrimonio,
} from '../controllers/patrimonioController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Todas as rotas requerem autenticação
 */
router.use(authenticateToken);

/**
 * @route GET /api/patrimonios
 * @desc Listar patrimônios com filtros
 * @access Private (All authenticated users)
 */
router.get('/', listPatrimonios);

/**
 * @route GET /api/patrimonios/sync
 * @desc Sincronizar patrimônios (retorna lista atualizada)
 * @access Private (All authenticated users)
 */
router.get('/sync', listPatrimonios);

/**
 * @route GET /api/patrimonios/numero/:numero
 * @desc Buscar patrimônio por número
 * @access Private
 */
router.get('/numero/:numero', getByNumero);

/**
 * @route GET /api/patrimonios/:id
 * @desc Obter patrimônio por ID
 * @access Private
 */
router.get('/:id', getPatrimonio);

/**
 * @route POST /api/patrimonios
 * @desc Criar patrimônio
 * @access Private (Admin, Supervisor, Usuario)
 */
router.post('/', authorize('superuser', 'supervisor', 'usuario'), createPatrimonio);

/**
 * @route PUT /api/patrimonios/:id
 * @desc Atualizar patrimônio
 * @access Private (Admin, Supervisor, Usuario)
 */
router.put('/:id', authorize('superuser', 'supervisor', 'usuario'), updatePatrimonio);

/**
 * @route DELETE /api/patrimonios/:id
 * @desc Deletar patrimônio
 * @access Private (Admin, Superuser only)
 */
router.delete('/:id', authorize('superuser', 'supervisor'), deletePatrimonio);

/**
 * @route POST /api/patrimonios/:id/notes
 * @desc Adicionar observação ao patrimônio
 * @access Private (All authenticated users)
 */
router.post('/:id/notes', addNote);

/**
 * @route POST /api/patrimonios/:id/baixa
 * @desc Registrar baixa de patrimônio
 * @access Private (Admin, Supervisor, Usuario)
 */
router.post('/:id/baixa', authorize('superuser', 'supervisor', 'usuario'), registrarBaixaPatrimonio);

export default router;

