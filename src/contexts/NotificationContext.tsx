import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { Notification } from '@/types'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

/** Formato aceito por addNotification (suporta nomes em pt-BR do backend e en-US do frontend) */
type NotificationInput = {
  type?: Notification['type']
  tipo?: string
  title?: string
  titulo?: string
  description?: string
  mensagem?: string
  link?: string
}

/** Formato bruto retornado pelo endpoint GET /notifications */
type NotificationRaw = {
  id: string
  userId: string
  titulo?: string
  mensagem?: string
  tipo?: string
  createdAt: string
  lida?: boolean
  title?: string
  description?: string
  type?: string
  link?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: NotificationInput) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])
  const { user } = useAuth()

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    
    try {
      const notifications = await api.get<NotificationRaw[]>('/notifications')
      setAllNotifications(
        notifications.map((n): Notification => ({
          id: n.id,
          userId: n.userId,
          title: n.titulo ?? n.title ?? '',
          description: n.mensagem ?? n.description ?? '',
          type: (n.tipo ?? n.type ?? 'general') as Notification['type'],
          link: n.link ?? '',
          timestamp: new Date(n.createdAt),
          isRead: n.lida ?? false,
        })),
      )
    } catch (error) {
      // Silenciar erro se não houver notificações
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user, fetchNotifications])

  const userNotifications = useMemo(() => {
    if (!user) return []
    return allNotifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [allNotifications, user])

  const unreadCount = useMemo(
    () => userNotifications.filter((n) => !n.isRead).length,
    [userNotifications],
  )

  const addNotification = useCallback(
    async (notification: NotificationInput) => {
      if (!user) return
      
      try {
        // Converter do formato do frontend para o formato do backend
        const payload = {
          userId: user.id,
          tipo: notification.type || notification.tipo,
          titulo: notification.title || notification.titulo,
          mensagem: notification.description || notification.mensagem,
          link: notification.link || '',
      }
        
        await api.post('/notifications', payload)
        await fetchNotifications()
      } catch (error) {
        // Silenciar erro
      }
    },
    [user, fetchNotifications],
  )

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await api.put(`/notifications/${notificationId}/mark-read`)
        await fetchNotifications()
      } catch (error) {
        // Silenciar erro
      }
    },
    [fetchNotifications],
  )

  const markAllAsRead = useCallback(
    async () => {
    if (!user) return
      
      try {
        await api.put('/notifications/mark-all-read')
        await fetchNotifications()
      } catch (error) {
        // Silenciar erro
      }
    },
    [user, fetchNotifications],
  )

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
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider',
    )
  }
  return context
}
