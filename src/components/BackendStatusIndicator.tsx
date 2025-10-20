import React from 'react'
import { useBackendStatus } from '@/hooks/useBackendStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

export const BackendStatusIndicator: React.FC = () => {
  const { isOnline, isLoading, lastChecked, checkBackendStatus } = useBackendStatus()

  const formatLastChecked = () => {
    if (!lastChecked) return 'Nunca verificado'
    
    const now = new Date()
    const diff = now.getTime() - lastChecked.getTime()
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s atrás`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`
    return `${Math.floor(seconds / 3600)}h atrás`
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
        
        <Badge variant={isOnline ? "default" : "destructive"}>
          {isOnline ? 'Backend Online' : 'Backend Offline'}
        </Badge>
      </div>
      
      <span className="text-xs text-gray-500">
        Última verificação: {formatLastChecked()}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={checkBackendStatus}
        disabled={isLoading}
        className="h-6 px-2"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}
