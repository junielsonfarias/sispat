import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useNotifications } from '@/contexts/NotificationContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const { notifications, markAllAsRead, unreadCount } = useNotifications()

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Notificações</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Todas as Notificações</h1>
        <Button
          variant="outline"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" /> Marcar todas como lidas
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {notifications.map((notification) => (
              <Link
                to={notification.link}
                key={notification.id}
                className={cn(
                  'block p-4 hover:bg-muted/50',
                  !notification.isRead && 'bg-muted',
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(notification.timestamp, "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </Link>
            ))}
            {notifications.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">
                Você não tem nenhuma notificação.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
