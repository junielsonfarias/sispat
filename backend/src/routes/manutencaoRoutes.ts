import { Router } from 'express'
import { authenticateToken } from '../middlewares/auth'
import {
  listManutencaoTasks,
  createManutencaoTask,
  updateManutencaoTask,
  deleteManutencaoTask,
  getManutencaoTask,
} from '../controllers/manutencaoController'
import { handleValidationErrors, manutencaoValidations } from '../middlewares/validation'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticateToken)

// CRUD completo
router.get('/', listManutencaoTasks)
router.post('/', manutencaoValidations.create, handleValidationErrors, createManutencaoTask)
router.get('/:id', manutencaoValidations.byId, handleValidationErrors, getManutencaoTask)
router.put('/:id', manutencaoValidations.update, handleValidationErrors, updateManutencaoTask)
router.delete('/:id', manutencaoValidations.byId, handleValidationErrors, deleteManutencaoTask)

export default router
