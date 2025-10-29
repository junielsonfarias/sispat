import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Bell,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { useWebSocket } from '@/hooks/useWebSocket'

interface SystemMetrics {
  timestamp: number
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
    heapUsed: number
    heapTotal: number
  }
  database: {
    connections: number
    queries: number
    slowQueries: number
    errors: number
  }
  api: {
    requests: number
    errors: number
    avgResponseTime: number
    rateLimitHits: number
  }
  redis: {
    connected: boolean
    memory: number
    keys: number
    hitRate: number
  }
  uptime: number
}

interface ApplicationMetrics {
  users: {
    total: number
    active: number
    newToday: number
  }
  patrimonios: {
    total: number
    active: number
    baixados: number
    newToday: number
  }
  imoveis: {
    total: number
    newToday: number
  }
  transfers: {
    pending: number
    completed: number
    rejected: number
  }
  documents: {
    total: number
    newToday: number
    totalSize: number
  }
}

interface Alert {
  id: string
  alertId: string
  triggeredAt: string
  status: 'active' | 'resolved' | 'suppressed'
  message: string
}

interface MetricsSummary {
  system: SystemMetrics & {
    trends: {
      cpu: 'up' | 'down' | 'stable'
      memory: 'up' | 'down' | 'stable'
      responseTime: 'up' | 'down' | 'stable'
    }
  }
  application: ApplicationMetrics
  health: number
  timestamp: number
}

const MetricsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // WebSocket hook
  const { isConnected, isConnecting, error: wsError, requestMetrics, requestAlerts } = useWebSocket()

  const fetchMetrics = async () => {
    try {
      setRefreshing(true)
      const [summaryRes, alertsRes] = await Promise.all([
        api.get('/metrics/summary'),
        api.get('/metrics/alerts')
      ])

      setSummary(summaryRes.data.data)
      setAlerts(alertsRes.data.data.active)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao buscar métricas:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar métricas do sistema',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    
    // Atualizar métricas a cada 30 segundos (fallback)
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  // WebSocket listeners
  useEffect(() => {
    if (isConnected) {
      // Solicitar métricas e alertas via WebSocket
      requestMetrics()
      requestAlerts()
    }
  }, [isConnected, requestMetrics, requestAlerts])

  // Escutar atualizações de métricas via WebSocket
  useEffect(() => {
    if (isConnected) {
      const handleMetricsUpdate = (data: any) => {
        setSummary(data)
        setLastUpdate(new Date())
      }

      const handleAlertsUpdate = (data: any) => {
        setAlerts(data)
      }

      // Adicionar listeners (será implementado no hook)
      // useWebSocket().on('metrics:update', handleMetricsUpdate)
      // useWebSocket().on('alerts:list', handleAlertsUpdate)
    }
  }, [isConnected])

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { text: 'Excelente', color: 'bg-green-100 text-green-800' }
    if (score >= 70) return { text: 'Bom', color: 'bg-yellow-100 text-yellow-800' }
    if (score >= 50) return { text: 'Atenção', color: 'bg-orange-100 text-orange-800' }
    return { text: 'Crítico', color: 'bg-red-100 text-red-800' }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando métricas...</span>
      </div>
    )
  }

  if (!summary) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível carregar as métricas do sistema.
        </AlertDescription>
      </Alert>
    )
  }

  const healthStatus = getHealthStatus(summary.health)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Métricas</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real do sistema SISPAT 2.0
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status WebSocket */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center text-green-600">
                <Wifi className="h-4 w-4 mr-1" />
                <span className="text-sm">Tempo Real</span>
              </div>
            ) : isConnecting ? (
              <div className="flex items-center text-yellow-600">
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                <span className="text-sm">Conectando...</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-sm">Offline</span>
              </div>
            )}
          </div>

          {lastUpdate && (
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Última atualização: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <Button
            onClick={fetchMetrics}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Status de Saúde do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`text-4xl font-bold ${getHealthColor(summary.health)}`}>
                {summary.health.toFixed(0)}
              </div>
              <div>
                <div className="text-lg font-semibold">Score de Saúde</div>
                <Badge className={healthStatus.color}>
                  {healthStatus.text}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Uptime</div>
              <div className="text-lg font-semibold">
                {formatUptime(summary.system.uptime)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Alertas Ativos ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>{alert.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.triggeredAt).toLocaleString()}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="application">Aplicação</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.system.cpu.usage.toFixed(1)}%
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(summary.system.trends.cpu)}
                  <span className="ml-1">Tendência</span>
                </div>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memória</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.system.memory.percentage.toFixed(1)}%
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(summary.system.trends.memory)}
                  <span className="ml-1">
                    {formatBytes(summary.system.memory.used)} / {formatBytes(summary.system.memory.total)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.system.api.avgResponseTime.toFixed(0)}ms
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(summary.system.trends.responseTime)}
                  <span className="ml-1">Média</span>
                </div>
              </CardContent>
            </Card>

            {/* API Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requisições</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.system.api.requests.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {summary.system.api.errors} erros
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Database and Redis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Banco de Dados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Conexões:</span>
                    <span className="font-medium">{summary.system.database.connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queries:</span>
                    <span className="font-medium">{summary.system.database.queries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queries Lentas:</span>
                    <span className="font-medium text-orange-600">{summary.system.database.slowQueries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Erros:</span>
                    <span className="font-medium text-red-600">{summary.system.database.errors}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  Redis Cache
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={summary.system.redis.connected ? 'default' : 'destructive'}>
                      {summary.system.redis.connected ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Memória:</span>
                    <span className="font-medium">{formatBytes(summary.system.redis.memory)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chaves:</span>
                    <span className="font-medium">{summary.system.redis.keys.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <span className="font-medium">{summary.system.redis.hitRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="application" className="space-y-4">
          {/* Application Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{summary.application.users.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ativos:</span>
                    <span className="font-medium text-green-600">{summary.application.users.active.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Novos Hoje:</span>
                    <span className="font-medium">{summary.application.users.newToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patrimônios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Patrimônios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{summary.application.patrimonios.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ativos:</span>
                    <span className="font-medium text-green-600">{summary.application.patrimonios.active.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Baixados:</span>
                    <span className="font-medium text-gray-600">{summary.application.patrimonios.baixados.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Novos Hoje:</span>
                    <span className="font-medium">{summary.application.patrimonios.newToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Imóveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Imóveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{summary.application.imoveis.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Novos Hoje:</span>
                    <span className="font-medium">{summary.application.imoveis.newToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transferências */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Transferências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Pendentes:</span>
                    <span className="font-medium text-orange-600">{summary.application.transfers.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Concluídas:</span>
                    <span className="font-medium text-green-600">{summary.application.transfers.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rejeitadas:</span>
                    <span className="font-medium text-red-600">{summary.application.transfers.rejected}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{summary.application.documents.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Novos Hoje:</span>
                    <span className="font-medium">{summary.application.documents.newToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tamanho Total:</span>
                    <span className="font-medium">{formatBytes(summary.application.documents.totalSize)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MetricsDashboard
