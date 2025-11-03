import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotification,
} from '../controllers/notificationController';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

/**
 * @route GET /api/notifications
 * @desc Listar notificações do usuário
 * @access Private
 */
router.get('/', getNotifications);

/**
 * @route PUT /api/notifications/:id/mark-read
 * @desc Marcar notificação como lida
 * @access Private
 */
router.put('/:id/mark-read', markNotificationAsRead);

/**
 * @route PUT /api/notifications/mark-all-read
 * @desc Marcar todas as notificações como lidas
 * @access Private
 */
router.put('/mark-all-read', markAllNotificationsAsRead);

/**
 * @route POST /api/notifications
 * @desc Criar notificação
 * @access Private
 */
router.post('/', createNotification);

/**
 * @route DELETE /api/notifications/:id
 * @desc Deletar notificação
 * @access Private
 */
router.delete('/:id', deleteNotification);

export default router;


