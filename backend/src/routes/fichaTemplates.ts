import { Router } from 'express'
import {
  FichaTemplateController,
  createFichaTemplateSchema,
  updateFichaTemplateSchema,
} from '../controllers/FichaTemplateController'
import { authenticateToken, authorize } from '../middlewares/auth'
import { zodValidate } from '../middlewares/zodValidate'
import { uuidParamSchema } from '@sispat/shared'

const router = Router()

// Aplicar autenticação e autorização para todas as rotas
router.use(authenticateToken)
router.use(authorize('admin', 'supervisor'))

// Rotas CRUD
router.get('/', FichaTemplateController.index)
router.get('/:id', zodValidate({ params: uuidParamSchema }), FichaTemplateController.show)
router.post(
  '/',
  zodValidate({ body: createFichaTemplateSchema }),
  FichaTemplateController.store
)
router.put(
  '/:id',
  zodValidate({ params: uuidParamSchema, body: updateFichaTemplateSchema }),
  FichaTemplateController.update
)
router.delete(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  FichaTemplateController.destroy
)

// Rotas especiais
router.patch(
  '/:id/set-default',
  zodValidate({ params: uuidParamSchema }),
  FichaTemplateController.setDefault
)
router.post(
  '/:id/duplicate',
  zodValidate({ params: uuidParamSchema }),
  FichaTemplateController.duplicate
)

export default router
