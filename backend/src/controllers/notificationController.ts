import { Request, Response } from 'express';
import { prisma } from '../index';
import { logError, logInfo, logDebug } from '../config/logger';

/**
 * @desc    Obter notificações do usuário
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limitar a 50 notificações mais recentes
    });

    res.json(notifications);
  } catch (error) {
    logError('Erro ao buscar notificações', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
};

/**
 * @desc    Marcar notificação como lida
 * @route   PUT /api/notifications/:id/mark-read
 * @access  Private
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Verificar se a notificação pertence ao usuário
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ error: 'Notificação não encontrada' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { lida: true },
    });

    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    logError('Erro ao marcar notificação como lida', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
  }
};

/**
 * @desc    Marcar todas as notificações como lidas
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    await prisma.notification.updateMany({
      where: { userId, lida: false },
      data: { lida: true },
    });

    res.json({ message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error) {
    logError('Erro ao marcar todas as notificações como lidas', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao marcar notificações como lidas' });
  }
};

/**
 * @desc    Criar notificação
 * @route   POST /api/notifications
 * @access  Private
 */
export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, tipo, titulo, mensagem, link } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        tipo,
        titulo,
        mensagem,
        link,
      },
    });

    res.status(201).json(notification);
  } catch (error) {
    logError('Erro ao criar notificação', error);
    res.status(500).json({ error: 'Erro ao criar notificação' });
  }
};

/**
 * @desc    Deletar notificação
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Verificar se a notificação pertence ao usuário
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ error: 'Notificação não encontrada' });
      return;
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ message: 'Notificação excluída com sucesso' });
  } catch (error) {
    logError('Erro ao excluir notificação', error, { id: req.params.id });
    res.status(500).json({ error: 'Erro ao excluir notificação' });
  }
};


