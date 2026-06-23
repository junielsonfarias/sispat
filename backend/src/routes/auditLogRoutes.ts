import { Router } from 'express'
import { authenticateToken, authorize } from '../middlewares/auth'
import { zodValidate } from '../middlewares/zodValidate'
import { createAuditLogSchema } from '@sispat/shared'
import {
  listAuditLogs,
  createAuditLog,
  getAuditLogStats,
  cleanupOldLogs,
} from '../controllers/auditLogController'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticateToken)

// Criar log de auditoria (todos os usuários autenticados)
router.post('/', zodValidate({ body: createAuditLogSchema }), createAuditLog)

// Listar logs (superuser, supervisores e admins)
router.get('/', authorize('superuser', 'admin', 'supervisor'), listAuditLogs)

// Estatísticas (superuser, supervisores e admins)
router.get('/stats', authorize('superuser', 'admin', 'supervisor'), getAuditLogStats)

// Limpeza de logs antigos (apenas superuser e admins)
router.delete('/cleanup', authorize('superuser', 'admin'), cleanupOldLogs)

export default router

