import { Router } from 'express';
import {
  getLabelTemplates,
  getLabelTemplateById,
  createLabelTemplate,
  updateLabelTemplate,
  deleteLabelTemplate,
} from '../controllers/labelTemplateController';
import { authenticateToken, authorize } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/label-templates
 * @desc Obter todos os templates de etiqueta ativos
 * @access Private
 */
router.get('/', getLabelTemplates);

/**
 * @route GET /api/label-templates/:id
 * @desc Obter template por ID
 * @access Private
 */
router.get('/:id', getLabelTemplateById);

/**
 * @route POST /api/label-templates
 * @desc Criar novo template de etiqueta
 * @access Admin/Supervisor apenas
 */
router.post('/', authorize('admin', 'supervisor'), createLabelTemplate);

/**
 * @route PUT /api/label-templates/:id
 * @desc Atualizar template de etiqueta
 * @access Admin/Supervisor apenas
 */
router.put('/:id', authorize('admin', 'supervisor'), updateLabelTemplate);

/**
 * @route DELETE /api/label-templates/:id
 * @desc Deletar template de etiqueta (soft delete)
 * @access Admin/Supervisor apenas
 */
router.delete('/:id', authorize('admin', 'supervisor'), deleteLabelTemplate);

export default router;

