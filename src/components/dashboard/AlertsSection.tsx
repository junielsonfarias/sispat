import React from 'react'
import { AlertTriangle, Clock, Wrench, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Patrimonio {
  id: string
  numero_patrimonio: string
  descricao_bem: string
  status: string
  data_aquisicao?: string
  dataAquisicao?: string
}

interface AlertsSectionProps {
  patrimonios: Patrimonio[]
  stats: {
    maintenanceCount: number
    baixadosLastMonth: number
    totalCount: number
  }
}

export const AlertsSection = ({ patrimonios, stats }: AlertsSectionProps) => {
  // Patrimônios em manutenção
  const patrimoniosManutencao = patrimonios.filter(p => p.status === 'manutencao')
  
  // Patrimônios próximos da baixa (mais de 10 anos)
  const patrimoniosAntigos = patrimonios.filter(p => {
    const dataAquisicao = p.data_aquisicao || p.dataAquisicao
    if (!dataAquisicao) return false
    
    const data = new Date(dataAquisicao)
    const anos = (new Date().getTime() - data.getTime()) / (1000 * 60 * 60 * 24 * 365)
    return anos >= 10 && p.status === 'ativo'
  })

  const alerts = [
    {
      type: 'warning',
      icon: Wrench,
      title: 'Bens em Manutenção',
      count: stats.maintenanceCount,
      description: `${stats.maintenanceCount} patrimônios requerem atenção`,
      action: 'Ver Manutenções',
      href: '/patrimonios?status=manutencao',
      variant: 'default' as const,
    },
    {
      type: 'info',
      icon: Clock,
      title: 'Bens Antigos',
      count: patrimoniosAntigos.length,
      description: `${patrimoniosAntigos.length} patrimônios com mais de 10 anos`,
      action: 'Revisar',
      href: '/relatorios?filter=antigos',
      variant: 'outline' as const,
    },
    {
      type: 'destructive',
      icon: Package,
      title: 'Baixas Recentes',
      count: stats.baixadosLastMonth,
      description: `${stats.baixadosLastMonth} bens baixados este mês`,
      action: 'Ver Baixas',
      href: '/relatorios?filter=baixas',
      variant: 'destructive' as const,
    },
  ].filter(alert => alert.count > 0)

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            Alertas e Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <AlertTriangle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-300">
              Nenhum alerta no momento. Todos os patrimônios estão em ordem!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          Alertas e Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon
          return (
            <div 
              key={index} 
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                      {alert.title}
                    </h4>
                    <Badge variant={alert.variant} className="text-xs">
                      {alert.count}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {alert.description}
                  </p>
                </div>
              </div>
              <Button 
                variant={alert.variant} 
                size="sm" 
                asChild
                className="text-xs sm:text-sm whitespace-nowrap"
              >
                <a href={alert.href}>{alert.action}</a>
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
