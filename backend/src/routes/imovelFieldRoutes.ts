import { Router } from 'express'
import { authenticateToken, authorize } from '../middlewares/auth'
import { zodValidate } from '../middlewares/zodValidate'
import {
  createImovelFieldSchema,
  updateImovelFieldSchema,
  reorderImovelFieldsSchema,
  uuidParamSchema,
} from '@sispat/shared'
import {
  listImovelFields,
  createImovelField,
  updateImovelField,
  deleteImovelField,
  reorderImovelFields,
} from '../controllers/imovelFieldController'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticateToken)

// Listar (todos os usuários autenticados)
router.get('/', listImovelFields)

// Criar, editar, deletar (apenas supervisores e admins)
router.post(
  '/',
  authorize('supervisor', 'admin'),
  zodValidate({ body: createImovelFieldSchema }),
  createImovelField
)

// IMPORTANTE: '/reorder' precisa vir ANTES de '/:id', senão o Express casa
// "reorder" como :id e a validação de UUID rejeita a requisição.
router.put(
  '/reorder',
  authorize('supervisor', 'admin'),
  zodValidate({ body: reorderImovelFieldsSchema }),
  reorderImovelFields
)

router.put(
  '/:id',
  authorize('supervisor', 'admin'),
  zodValidate({ params: uuidParamSchema, body: updateImovelFieldSchema }),
  updateImovelField
)

router.delete(
  '/:id',
  authorize('supervisor', 'admin'),
  zodValidate({ params: uuidParamSchema }),
  deleteImovelField
)

export default router

