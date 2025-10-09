import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import {
  listManutencaoTasks,
  createManutencaoTask,
  updateManutencaoTask,
  deleteManutencaoTask,
  getManutencaoTask,
} from '../controllers/manutencaoController'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticate)

// CRUD completo
router.get('/', listManutencaoTasks)
router.post('/', createManutencaoTask)
router.get('/:id', getManutencaoTask)
router.put('/:id', updateManutencaoTask)
router.delete('/:id', deleteManutencaoTask)

export default router

