import { Router } from 'express';
import {
  listPatrimonios,
  getPatrimonio,
  getByNumero,
  gerarNumeroPatrimonial,
  createPatrimonio,
  updatePatrimonio,
  deletePatrimonio,
  addNote,
  registrarBaixaPatrimonio,
} from '../controllers/patrimonioController';
import { authenticateToken, authorize } from '../middlewares/auth';
import { handleValidationErrors, patrimonioValidations, queryValidations } from '../middlewares/validation';
import { param, body } from 'express-validator';

const router = Router();

router.use(authenticateToken);

/**
 * @route GET /api/patrimonios
 * @desc Listar patrimônios com filtros
 */
router.get('/', queryValidations.pagination, handleValidationErrors, listPatrimonios);

/**
 * @route GET /api/patrimonios/sync
 * @desc Sincronizar patrimônios (retorna lista atualizada)
 */
router.get('/sync', queryValidations.pagination, handleValidationErrors, listPatrimonios);

/**
 * @route GET /api/patrimonios/gerar-numero
 * @desc Gerar próximo número patrimonial (DEVE VIR ANTES DE /:id)
 */
router.get('/gerar-numero', authorize('superuser', 'supervisor', 'usuario'), gerarNumeroPatrimonial);

/**
 * @route GET /api/patrimonios/numero/:numero
 * @desc Buscar patrimônio por número
 */
router.get('/numero/:numero', getByNumero);

/**
 * @route GET /api/patrimonios/:id
 * @desc Obter patrimônio por ID
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  getPatrimonio,
);

/**
 * @route POST /api/patrimonios
 * @desc Criar patrimônio
 */
router.post(
  '/',
  authorize('superuser', 'supervisor', 'usuario'),
  patrimonioValidations.create,
  handleValidationErrors,
  createPatrimonio,
);

/**
 * @route PUT /api/patrimonios/:id
 * @desc Atualizar patrimônio
 */
router.put(
  '/:id',
  authorize('superuser', 'supervisor', 'usuario'),
  patrimonioValidations.update,
  handleValidationErrors,
  updatePatrimonio,
);

/**
 * @route DELETE /api/patrimonios/:id
 * @desc Deletar patrimônio
 */
router.delete(
  '/:id',
  authorize('superuser', 'supervisor'),
  [param('id').isUUID().withMessage('ID deve ser um UUID válido')],
  handleValidationErrors,
  deletePatrimonio,
);

/**
 * @route POST /api/patrimonios/:id/notes
 * @desc Adicionar observação ao patrimônio
 */
router.post(
  '/:id/notes',
  [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('text').isString().isLength({ min: 1, max: 2000 }).withMessage('Texto da nota é obrigatório (1 a 2000 caracteres)'),
  ],
  handleValidationErrors,
  addNote,
);

/**
 * @route POST /api/patrimonios/:id/baixa
 * @desc Registrar baixa de patrimônio
 */
router.post(
  '/:id/baixa',
  authorize('superuser', 'supervisor', 'usuario'),
  [
    param('id').isUUID().withMessage('ID deve ser um UUID válido'),
    body('data_baixa').optional().isISO8601().withMessage('Data de baixa deve ser uma data válida'),
    body('motivo_baixa').optional().isString().isLength({ max: 500 }).withMessage('Motivo deve ter no máximo 500 caracteres'),
    body('documentos_baixa').optional().isArray().withMessage('Documentos de baixa deve ser um array'),
  ],
  handleValidationErrors,
  registrarBaixaPatrimonio,
);

export default router;
