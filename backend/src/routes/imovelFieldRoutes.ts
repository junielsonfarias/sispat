import { Router } from 'express'
import { authenticateToken, authorize } from '../middlewares/auth'
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
router.post('/', authorize('supervisor', 'admin'), createImovelField)
router.put('/:id', authorize('supervisor', 'admin'), updateImovelField)
router.delete('/:id', authorize('supervisor', 'admin'), deleteImovelField)
router.put('/reorder', authorize('supervisor', 'admin'), reorderImovelFields)

export default router

