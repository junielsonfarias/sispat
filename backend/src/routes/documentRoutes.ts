import express from 'express'
import { authenticateToken } from '../middlewares/auth'
import {
  listDocumentos,
  getDocumentoById,
  createDocumento,
  updateDocumento,
  deleteDocumento,
} from '../controllers/documentController'

const router = express.Router()

// Todas as rotas requerem autenticação
router.use(authenticateToken)

// Listar documentos
router.get('/', listDocumentos)

// Buscar documento por ID
router.get('/:id', getDocumentoById)

// Criar documento
router.post('/', createDocumento)

// Atualizar documento
router.put('/:id', updateDocumento)

// Deletar documento
router.delete('/:id', deleteDocumento)

export default router


