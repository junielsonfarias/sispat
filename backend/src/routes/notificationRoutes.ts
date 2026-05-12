import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotification,
} from '../controllers/notificationController';
import { zodValidate } from '../middlewares/zodValidate';
import { createNotificationSchema, uuidParamSchema } from '@sispat/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);

router.put(
  '/:id/mark-read',
  zodValidate({ params: uuidParamSchema }),
  markNotificationAsRead,
);

router.put('/mark-all-read', markAllNotificationsAsRead);

router.post('/', zodValidate({ body: createNotificationSchema }), createNotification);

router.delete(
  '/:id',
  zodValidate({ params: uuidParamSchema }),
  deleteNotification,
);

export default router;
