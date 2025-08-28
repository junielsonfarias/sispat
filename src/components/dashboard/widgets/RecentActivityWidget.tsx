import { useActivityLog } from '@/contexts/ActivityLogContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatRelativeDate } from '@/lib/utils'

export const RecentActivityWidget = () => {
  const { logs } = useActivityLog()
  const recentLogs = logs.slice(0, 5)

  return (
    <div className="space-y-4">
      {recentLogs.length > 0 ? (
        recentLogs.map((log) => (
          <div key={log.id} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{log.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{log.userName}</p>
              <p className="text-sm text-muted-foreground">{log.details}</p>
            </div>
            <div className="ml-auto font-medium text-sm text-muted-foreground">
              {formatRelativeDate(log.timestamp)}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          Nenhuma atividade recente.
        </p>
      )}
    </div>
  )
}
