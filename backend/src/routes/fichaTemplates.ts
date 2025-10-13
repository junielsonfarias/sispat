import { Router } from 'express'
import { FichaTemplateController } from '../controllers/FichaTemplateController'
import { authenticateToken, authorize } from '../middlewares/auth'

const router = Router()

// Aplicar autenticação e autorização para todas as rotas
router.use(authenticateToken)
router.use(authorize('admin', 'supervisor'))

// Rotas CRUD
router.get('/', FichaTemplateController.index)
router.get('/:id', FichaTemplateController.show)
router.post('/', FichaTemplateController.store)
router.put('/:id', FichaTemplateController.update)
router.delete('/:id', FichaTemplateController.destroy)

// Rotas especiais
router.patch('/:id/set-default', FichaTemplateController.setDefault)
router.post('/:id/duplicate', FichaTemplateController.duplicate)

export default router
