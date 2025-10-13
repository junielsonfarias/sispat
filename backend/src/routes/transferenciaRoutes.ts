import express from 'express'
import { authenticateToken } from '../middlewares/auth'
import {
  listTransferencias,
  getTransferenciaById,
  createTransferencia,
  aprovarTransferencia,
  rejeitarTransferencia,
} from '../controllers/transferenciaController'

const router = express.Router()

// Todas as rotas requerem autenticação
router.use(authenticateToken)

// Listar transferências
router.get('/', listTransferencias)

// Buscar transferência por ID
router.get('/:id', getTransferenciaById)

// Criar transferência
router.post('/', createTransferencia)

// Aprovar transferência (apenas supervisor/admin)
router.put('/:id/aprovar', aprovarTransferencia)

// Rejeitar transferência (apenas supervisor/admin)
router.put('/:id/rejeitar', rejeitarTransferencia)

export default router


