import { useState } from 'react'
import { Bell, Check, X, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useNotifications } from '@/contexts/NotificationContext'
import { useWebSocket } from '@/hooks/useWebSocket'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { isConnected, isConnecting } = useWebSocket()

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
      case 'alert':
        return '🚨'
      case 'info':
        return 'ℹ️'
      default:
        return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'error':
      case 'alert':
        return 'text-red-600'
      case 'info':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {/* Indicador de status da conexão */}
          <div className="absolute -bottom-1 -right-1">
            {isConnecting ? (
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            ) : isConnected ? (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-red-500" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Notificações</h4>
            {!isConnected && (
              <WifiOff className="h-4 w-4 text-red-500" title="Desconectado" />
            )}
            {isConnecting && (
              <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" title="Conectando..." />
            )}
            {isConnected && (
              <Wifi className="h-4 w-4 text-green-500" title="Conectado" />
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <Bell className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Nenhuma notificação</p>
              <p className="text-xs text-gray-400 mt-1">
                {!isConnected 
                  ? 'Conecte-se para receber notificações em tempo real'
                  : 'Novas notificações aparecerão aqui'
                }
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50',
                      !notification.isRead && 'bg-blue-50 border-l-4 border-l-blue-500'
                    )}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className={cn(
                          'text-sm font-medium truncate',
                          getNotificationColor(notification.type)
                        )}>
                          {notification.title}
                        </h5>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                        
                        {!notification.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            Nova
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < notifications.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {unreadCount} não lida{unreadCount !== 1 ? 's' : ''} de {notifications.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
