import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/contexts/NotificationContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Check, Wifi, WifiOff, X } from 'lucide-react';
import { useState } from 'react';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { isConnected, isConnecting } = useWebSocket();

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
      case 'alert':
        return '🚨';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
      case 'alert':
        return 'text-red-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-10 w-10 rounded-xl hover:bg-gray-100 transition-all duration-200'
          aria-label='Notificações'
        >
          <Bell className='h-5 w-5' />
          {unreadCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs font-semibold'
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {/* Indicador de status da conexão */}
          <div className='absolute -bottom-1 -right-1'>
            {isConnecting ? (
              <div className='h-2 w-2 rounded-full bg-yellow-500 animate-pulse' />
            ) : isConnected ? (
              <div className='h-2 w-2 rounded-full bg-green-500' />
            ) : (
              <div className='h-2 w-2 rounded-full bg-red-500' />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 p-0 shadow-xl border-0 bg-white/95 backdrop-blur-md'
        align='end'
      >
        <div className='flex items-center justify-between p-4 border-b border-gray-200'>
          <div className='flex items-center gap-2'>
            <h4 className='font-semibold text-gray-900'>Notificações</h4>
            {!isConnected && (
              <WifiOff className='h-4 w-4 text-red-500' title='Desconectado' />
            )}
            {isConnecting && (
              <Wifi
                className='h-4 w-4 text-yellow-500 animate-pulse'
                title='Conectando...'
              />
            )}
            {isConnected && (
              <Wifi className='h-4 w-4 text-green-500' title='Conectado' />
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleMarkAllAsRead}
              className='text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg'
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className='h-80'>
          {notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-40 text-center p-6'>
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
                <Bell className='h-8 w-8 text-gray-400' />
              </div>
              <p className='text-sm font-medium text-gray-900 mb-1'>
                Nenhuma notificação
              </p>
              <p className='text-xs text-gray-500'>
                {!isConnected
                  ? 'Conecte-se para receber notificações em tempo real'
                  : 'Novas notificações aparecerão aqui'}
              </p>
            </div>
          ) : (
            <div className='p-2'>
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-gray-50 cursor-pointer',
                      !notification.isRead &&
                        'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500 shadow-sm'
                    )}
                  >
                    <div className='flex-shrink-0 mt-1'>
                      <div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center'>
                        <span className='text-sm'>
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <h5
                          className={cn(
                            'text-sm font-semibold truncate',
                            getNotificationColor(notification.type)
                          )}
                        >
                          {notification.title}
                        </h5>
                        {!notification.isRead && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleMarkAsRead(notification.id)}
                            className='h-6 w-6 p-0 hover:bg-blue-100 rounded-full'
                          >
                            <Check className='h-3 w-3 text-blue-600' />
                          </Button>
                        )}
                      </div>

                      <p className='text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed'>
                        {notification.message}
                      </p>

                      <div className='flex items-center justify-between mt-3'>
                        <span className='text-xs text-gray-500 font-medium'>
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>

                        {!notification.isRead && (
                          <Badge
                            variant='secondary'
                            className='text-xs bg-blue-100 text-blue-700 border-0'
                          >
                            Nova
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {index < notifications.length - 1 && (
                    <Separator className='my-2 bg-gray-200' />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className='p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100'>
            <div className='flex items-center justify-between text-xs text-gray-600'>
              <span className='font-medium'>
                {unreadCount} não lida{unreadCount !== 1 ? 's' : ''} de{' '}
                {notifications.length}
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setIsOpen(false)}
                className='h-6 w-6 p-0 hover:bg-gray-200 rounded-full'
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
