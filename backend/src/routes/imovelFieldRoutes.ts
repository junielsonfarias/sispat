import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { authorize } from '../middlewares/authorize'
import {
  listImovelFields,
  createImovelField,
  updateImovelField,
  deleteImovelField,
  reorderImovelFields,
} from '../controllers/imovelFieldController'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticate)

// Listar (todos os usuários autenticados)
router.get('/', listImovelFields)

// Criar, editar, deletar (apenas supervisores e admins)
router.post('/', authorize(['supervisor', 'admin']), createImovelField)
router.put('/:id', authorize(['supervisor', 'admin']), updateImovelField)
router.delete('/:id', authorize(['supervisor', 'admin']), deleteImovelField)
router.put('/reorder', authorize(['supervisor', 'admin']), reorderImovelFields)

export default router

