import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Server,
  Database,
  Users,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Cpu,
  Memory,
  Network,
  Shield,
  Zap,
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    uptime: number;
  };
  application: {
    uptime: number;
    requests: number;
    errors: number;
    responseTime: number;
    activeUsers: number;
  };
  security: {
    failedLogins: number;
    blockedIPs: number;
    suspiciousActivities: number;
    lastScan: string;
  };
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  source: string;
  metadata?: any;
}

export const SystemMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // segundos

  const { isConnected, sendMessage } = useWebSocket();

  // Buscar métricas do sistema
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/system-metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro de Monitoramento',
        description: 'Falha ao buscar métricas do sistema.',
      });
    }
  };

  // Buscar alertas
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/system-alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
    }
  };

  // Buscar logs
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/system-logs?limit=100');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    }
  };

  // Atualizar todos os dados
  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchMetrics(), fetchAlerts(), fetchLogs()]);
    setIsLoading(false);
  };

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Carregar dados iniciais
  useEffect(() => {
    refreshData();
  }, []);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    if (isConnected) {
      sendMessage('join-monitoring', {});

      // Escutar atualizações de métricas
      const handleMetricsUpdate = (data: SystemMetrics) => {
        setMetrics(data);
        setLastUpdate(new Date());
      };

      // Escutar novos alertas
      const handleAlertUpdate = (data: Alert) => {
        setAlerts(prev => [data, ...prev.slice(0, 99)]); // Manter apenas 100 alertas
        toast({
          title: data.title,
          description: data.message,
          variant: data.type === 'error' ? 'destructive' : 'default',
        });
      };

      return () => {
        sendMessage('leave-monitoring', {});
      };
    }
  }, [isConnected, sendMessage]);

  // Calcular status geral do sistema
  const systemStatus = useMemo(() => {
    if (!metrics) return 'unknown';

    const criticalIssues = alerts.filter(a => a.severity === 'critical').length;
    const highIssues = alerts.filter(a => a.severity === 'high').length;
    const cpuHigh = metrics.cpu.usage > 90;
    const memoryHigh = metrics.memory.usage > 90;
    const diskHigh = metrics.disk.usage > 90;

    if (criticalIssues > 0 || cpuHigh || memoryHigh || diskHigh)
      return 'critical';
    if (highIssues > 0 || metrics.cpu.usage > 80 || metrics.memory.usage > 80)
      return 'warning';
    return 'healthy';
  }, [metrics, alerts]);

  // Formatar bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Formatar tempo
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className='h-5 w-5 text-green-600' />;
      case 'warning':
        return <AlertTriangle className='h-5 w-5 text-yellow-600' />;
      case 'critical':
        return <XCircle className='h-5 w-5 text-red-600' />;
      default:
        return <Activity className='h-5 w-5 text-gray-600' />;
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Monitoramento do Sistema</h1>
          <p className='text-muted-foreground'>
            Status em tempo real do SISPAT
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <Badge
            variant={systemStatus === 'healthy' ? 'default' : 'destructive'}
            className='flex items-center gap-2'
          >
            {getStatusIcon(systemStatus)}
            {systemStatus === 'healthy'
              ? 'Sistema Saudável'
              : systemStatus === 'warning'
                ? 'Atenção Necessária'
                : 'Crítico'}
          </Badge>
          <Button onClick={refreshData} disabled={isLoading}>
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>CPU</CardTitle>
            <Cpu className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics?.cpu.usage.toFixed(1)}%
            </div>
            <Progress value={metrics?.cpu.usage || 0} className='mt-2' />
            <p className='text-xs text-muted-foreground mt-2'>
              {metrics?.cpu.cores} cores • {metrics?.cpu.temperature}°C
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Memória</CardTitle>
            <Memory className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics?.memory.usage.toFixed(1)}%
            </div>
            <Progress value={metrics?.memory.usage || 0} className='mt-2' />
            <p className='text-xs text-muted-foreground mt-2'>
              {formatBytes(metrics?.memory.used || 0)} /{' '}
              {formatBytes(metrics?.memory.total || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Disco</CardTitle>
            <HardDrive className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics?.disk.usage.toFixed(1)}%
            </div>
            <Progress value={metrics?.disk.usage || 0} className='mt-2' />
            <p className='text-xs text-muted-foreground mt-2'>
              {formatBytes(metrics?.disk.used || 0)} /{' '}
              {formatBytes(metrics?.disk.total || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Usuários Ativos
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics?.application.activeUsers || 0}
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              {metrics?.application.requests || 0} requests/min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Detalhes */}
      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview'>Visão Geral</TabsTrigger>
          <TabsTrigger value='database'>Banco de Dados</TabsTrigger>
          <TabsTrigger value='network'>Rede</TabsTrigger>
          <TabsTrigger value='security'>Segurança</TabsTrigger>
          <TabsTrigger value='alerts'>Alertas</TabsTrigger>
          <TabsTrigger value='logs'>Logs</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5' />
                  Performance da Aplicação
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <span>Tempo de Resposta</span>
                  <span className='font-mono'>
                    {metrics?.application.responseTime || 0}ms
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span>Requests/min</span>
                  <span className='font-mono'>
                    {metrics?.application.requests || 0}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span>Taxa de Erro</span>
                  <span className='font-mono'>
                    {metrics?.application.requests
                      ? (
                          (metrics.application.errors /
                            metrics.application.requests) *
                          100
                        ).toFixed(2)
                      : 0}
                    %
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span>Uptime</span>
                  <span className='font-mono'>
                    {formatUptime(metrics?.application.uptime || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Status dos Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Server className='h-5 w-5' />
                  Status dos Serviços
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <span>WebSocket</span>
                  <Badge variant={isConnected ? 'default' : 'destructive'}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
                <div className='flex justify-between items-center'>
                  <span>Backup Scheduler</span>
                  <Badge variant='default'>Ativo</Badge>
                </div>
                <div className='flex justify-between items-center'>
                  <span>Notification Service</span>
                  <Badge variant='default'>Ativo</Badge>
                </div>
                <div className='flex justify-between items-center'>
                  <span>Analytics Engine</span>
                  <Badge variant='default'>Ativo</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='database' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Database className='h-5 w-5' />
                Métricas do Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <h4 className='font-medium'>Conexões Ativas</h4>
                  <p className='text-2xl font-bold'>
                    {metrics?.database.connections || 0}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>Queries/min</h4>
                  <p className='text-2xl font-bold'>
                    {metrics?.database.queries || 0}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>Queries Lentas</h4>
                  <p className='text-2xl font-bold text-yellow-600'>
                    {metrics?.database.slowQueries || 0}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>Uptime</h4>
                  <p className='text-2xl font-bold'>
                    {formatUptime(metrics?.database.uptime || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='network' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Network className='h-5 w-5' />
                Métricas de Rede
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <h4 className='font-medium'>Bytes Recebidos</h4>
                  <p className='text-2xl font-bold'>
                    {formatBytes(metrics?.network.bytesIn || 0)}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>Bytes Enviados</h4>
                  <p className='text-2xl font-bold'>
                    {formatBytes(metrics?.network.bytesOut || 0)}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>Conexões Ativas</h4>
                  <p className='text-2xl font-bold'>
                    {metrics?.network.connections || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='security' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                Status de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <h4 className='font-medium'>Logins Falhados</h4>
                  <p className='text-2xl font-bold text-red-600'>
                    {metrics?.security.failedLogins || 0}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>IPs Bloqueados</h4>
                  <p className='text-2xl font-bold text-orange-600'>
                    {metrics?.security.blockedIPs || 0}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>Atividades Suspeitas</h4>
                  <p className='text-2xl font-bold text-yellow-600'>
                    {metrics?.security.suspiciousActivities || 0}
                  </p>
                </div>
                <div>
                  <h4 className='font-medium'>Última Verificação</h4>
                  <p className='text-sm text-muted-foreground'>
                    {metrics?.security.lastScan
                      ? new Date(metrics.security.lastScan).toLocaleString(
                          'pt-BR'
                        )
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='alerts' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <AlertTriangle className='h-5 w-5' />
                Alertas do Sistema ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 max-h-96 overflow-y-auto'>
                {alerts.length === 0 ? (
                  <p className='text-muted-foreground text-center py-8'>
                    Nenhum alerta ativo
                  </p>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      className='flex items-start gap-3 p-3 border rounded-lg'
                    >
                      <div className='mt-1'>
                        {alert.type === 'error' && (
                          <XCircle className='h-4 w-4 text-red-600' />
                        )}
                        {alert.type === 'warning' && (
                          <AlertTriangle className='h-4 w-4 text-yellow-600' />
                        )}
                        {alert.type === 'info' && (
                          <Activity className='h-4 w-4 text-blue-600' />
                        )}
                        {alert.type === 'success' && (
                          <CheckCircle className='h-4 w-4 text-green-600' />
                        )}
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <h4 className='font-medium'>{alert.title}</h4>
                          <Badge
                            variant={
                              alert.severity === 'critical'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className='text-sm text-muted-foreground'>
                          {alert.message}
                        </p>
                        <p className='text-xs text-muted-foreground mt-1'>
                          {new Date(alert.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='logs' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='h-5 w-5' />
                Logs do Sistema ({logs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 max-h-96 overflow-y-auto'>
                {logs.length === 0 ? (
                  <p className='text-muted-foreground text-center py-8'>
                    Nenhum log disponível
                  </p>
                ) : (
                  logs.map(log => (
                    <div
                      key={log.id}
                      className='flex items-start gap-3 p-2 border rounded text-sm'
                    >
                      <div className='mt-1'>
                        {log.level === 'error' && (
                          <XCircle className='h-3 w-3 text-red-600' />
                        )}
                        {log.level === 'warn' && (
                          <AlertTriangle className='h-3 w-3 text-yellow-600' />
                        )}
                        {log.level === 'info' && (
                          <Activity className='h-3 w-3 text-blue-600' />
                        )}
                        {log.level === 'debug' && (
                          <Activity className='h-3 w-3 text-gray-600' />
                        )}
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-xs text-muted-foreground'>
                            {new Date(log.timestamp).toLocaleTimeString(
                              'pt-BR'
                            )}
                          </span>
                          <Badge variant='outline' className='text-xs'>
                            {log.source}
                          </Badge>
                          <Badge
                            variant={
                              log.level === 'error'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className='text-xs'
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className='mt-1'>{log.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer com informações de atualização */}
      <div className='text-center text-sm text-muted-foreground'>
        <p>
          Última atualização: {lastUpdate.toLocaleString('pt-BR')} • WebSocket:{' '}
          {isConnected ? 'Conectado' : 'Desconectado'} • Auto-refresh:{' '}
          {autoRefresh ? 'Ativo' : 'Inativo'}
        </p>
      </div>
    </div>
  );
};
