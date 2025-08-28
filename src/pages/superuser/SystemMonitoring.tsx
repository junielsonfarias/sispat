import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { useEffect, useState } from 'react'

interface PerformanceStats {
  cpu: number
  memory: number
  disk: number
  network: number
  uptime: number
  activeConnections: number
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  score: number
  issues: string[]
}

interface ErrorLog {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  source: string
}

export default function SystemMonitoring() {
  const { user } = useAuth()
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchSystemData = async () => {
    try {
      setIsLoading(true)
      
      // Buscar dados de performance
      const performanceResponse = await api.get<PerformanceStats>('/system/performance')
      setPerformanceStats(performanceResponse)
      
      // Buscar saúde do sistema
      const healthResponse = await api.get<SystemHealth>('/system/health')
      setSystemHealth(healthResponse)
      
      // Buscar logs de erro
      const logsResponse = await api.get<ErrorLog[]>('/system/error-logs')
      setErrorLogs(logsResponse)
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao buscar dados do sistema:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = () => {
    void fetchSystemData()
  }

  useEffect(() => {
    void fetchSystemData()
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(() => {
      void fetchSystemData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getHealthText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Saudável'
      case 'warning':
        return 'Atenção'
      case 'critical':
        return 'Crítico'
      default:
        return 'Desconhecido'
    }
  }

  if (!user || user.role !== 'superuser') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Acesso negado. Apenas superusuários podem acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoramento do Sistema</h1>
          <p className="text-gray-600">Acompanhe o desempenho e saúde do sistema em tempo real</p>
        </div>
        <Button onClick={refreshData} disabled={isLoading}>
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {lastUpdate && (
        <p className="text-sm text-gray-500">
          Última atualização: {lastUpdate.toLocaleString('pt-BR')}
        </p>
      )}

      {/* Saúde do Sistema */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Saúde do Sistema
              <Badge className={getHealthColor(systemHealth.status)}>
                {getHealthText(systemHealth.status)}
              </Badge>
            </CardTitle>
            <CardDescription>
              Score geral: {systemHealth.score.toFixed(1)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={systemHealth.score} className="mb-4" />
            {systemHealth.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Problemas identificados:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {systemHealth.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas de Performance */}
      {performanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>CPU</CardTitle>
              <CardDescription>Uso do processador</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceStats.cpu.toFixed(1)}%</div>
              <Progress value={performanceStats.cpu} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memória</CardTitle>
              <CardDescription>Uso da memória RAM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceStats.memory.toFixed(1)}%</div>
              <Progress value={performanceStats.memory} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disco</CardTitle>
              <CardDescription>Uso do armazenamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceStats.disk.toFixed(1)}%</div>
              <Progress value={performanceStats.disk} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rede</CardTitle>
              <CardDescription>Atividade de rede</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceStats.network.toFixed(1)} MB/s</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tempo Ativo</CardTitle>
              <CardDescription>Tempo desde o último reinício</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.floor(performanceStats.uptime / 3600)}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conexões Ativas</CardTitle>
              <CardDescription>Usuários conectados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceStats.activeConnections}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs de Erro */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Erro Recentes</CardTitle>
          <CardDescription>Últimos erros e avisos do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {errorLogs.length === 0 ? (
            <p className="text-gray-500">Nenhum erro recente encontrado.</p>
          ) : (
            <div className="space-y-4">
              {errorLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Badge
                    variant={log.level === 'error' ? 'destructive' : log.level === 'warning' ? 'secondary' : 'default'}
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{log.message}</p>
                    <p className="text-sm text-gray-500">
                      {log.source} • {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
