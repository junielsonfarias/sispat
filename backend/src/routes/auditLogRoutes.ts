import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { authorize } from '../middlewares/authorize'
import {
  listAuditLogs,
  createAuditLog,
  getAuditLogStats,
  cleanupOldLogs,
} from '../controllers/auditLogController'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticate)

// Criar log de auditoria (todos os usuários autenticados)
router.post('/', createAuditLog)

// Listar logs (apenas supervisores e admins)
router.get('/', authorize(['supervisor', 'admin']), listAuditLogs)

// Estatísticas (apenas supervisores e admins)
router.get('/stats', authorize(['supervisor', 'admin']), getAuditLogStats)

// Limpeza de logs antigos (apenas admins)
router.delete('/cleanup', authorize(['admin']), cleanupOldLogs)

export default router

