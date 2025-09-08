import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';
import { generateId } from '@/lib/utils';
import { Notification } from '@/types';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>
  ) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  // Callback para receber notificações do WebSocket
  const handleWebSocketNotification = useCallback(
    (data: any) => {
      const newNotification: Notification = {
        id: generateId(),
        type: data.type || 'info',
        title: data.title,
        message: data.message,
        userId: user?.id || '',
        timestamp: new Date(),
        isRead: false,
        data: data.data,
      };
      setAllNotifications(prev => {
        const updated = [...prev, newNotification];
        localStorage.setItem('sispat_notifications', JSON.stringify(updated));
        return updated;
      });
    },
    [user]
  );

  // Usar WebSocket para notificações
  const { markNotificationRead: wsMarkNotificationRead } =
    useWebSocketNotifications(handleWebSocketNotification);

  useEffect(() => {
    const stored = localStorage.getItem('sispat_notifications');
    if (stored) {
      setAllNotifications(
        JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }))
      );
    }
  }, []);

  const persist = (newNotifications: Notification[]) => {
    localStorage.setItem(
      'sispat_notifications',
      JSON.stringify(newNotifications)
    );
    setAllNotifications(newNotifications);
  };

  const userNotifications = useMemo(() => {
    if (!user) return [];
    return allNotifications
      .filter(n => n.userId === user.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allNotifications, user]);

  const unreadCount = useMemo(
    () => userNotifications.filter(n => !n.isRead).length,
    [userNotifications]
  );

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        timestamp: new Date(),
        isRead: false,
      };
      persist([...allNotifications, newNotification]);
    },
    [allNotifications]
  );

  const markAsRead = useCallback(
    (notificationId: string) => {
      const newNotifications = allNotifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      persist(newNotifications);

      // Sincronizar com WebSocket
      wsMarkNotificationRead(notificationId);
    },
    [allNotifications, wsMarkNotificationRead]
  );

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    const newNotifications = allNotifications.map(n =>
      n.userId === user.id ? { ...n, isRead: true } : n
    );
    persist(newNotifications);
  }, [allNotifications, user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: userNotifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};
