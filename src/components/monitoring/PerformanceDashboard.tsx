import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Database,
    Minus,
    RefreshCw,
    Server,
    TrendingDown,
    TrendingUp,
    Wifi,
    WifiOff
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { usePerformanceMetrics } from '../../hooks/monitoring/usePerformanceMetrics';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'good' | 'warning' | 'critical';
}

function MetricCard({ title, value, subtitle, icon, trend, status = 'good' }: MetricCardProps) {
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200'
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-600" />,
    down: <TrendingDown className="h-4 w-4 text-red-600" />,
    neutral: <Minus className="h-4 w-4 text-gray-600" />
  };

  return (
    <Card className={`${statusColors[status]} transition-colors duration-200`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-1">
          {trend && trendIcons[trend]}
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function PerformanceDashboard() {
  const { 
    data, 
    alerts, 
    isConnected, 
    isLoading, 
    error, 
    connect, 
    disconnect, 
    refreshMetrics 
  } = usePerformanceMetrics();

  const [historicalData, setHistoricalData] = useState<Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    responseTime: number;
    requests: number;
  }>>([]);

  // Atualizar dados históricos quando novos dados chegarem
  useEffect(() => {
    if (data) {
      const newDataPoint = {
        timestamp: new Date(data.timestamp).toLocaleTimeString(),
        cpu: Math.round(data.system.cpuUsage),
        memory: Math.round((data.system.memoryUsage / data.system.memoryTotal) * 100),
        responseTime: Math.round(data.api.averageResponseTime),
        requests: data.api.totalRequests
      };

      setHistoricalData(prev => {
        const updated = [...prev, newDataPoint];
        // Manter apenas os últimos 20 pontos
        return updated.slice(-20);
      });
    }
  }, [data]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusFromValue = (value: number, thresholds: { warning: number; critical: number }): 'good' | 'warning' | 'critical' => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'good';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Conectando ao sistema de monitoramento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento de Performance</h1>
          <p className="text-muted-foreground">
            Acompanhe métricas em tempo real do sistema SISPAT
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center space-x-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </Badge>
          <Button 
            onClick={isConnected ? disconnect : connect}
            variant={isConnected ? "outline" : "default"}
            size="sm"
          >
            {isConnected ? 'Desconectar' : 'Conectar'}
          </Button>
          <Button onClick={refreshMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{alert.type === 'critical' ? 'CRÍTICO' : 'AVISO'}:</strong> {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Erro de conexão */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Métricas principais */}
      {data && (
        <>
          {/* Cards de métricas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="CPU"
              value={`${Math.round(data.system.cpuUsage)}%`}
              subtitle="Uso do processador"
              icon={<Activity className="h-4 w-4" />}
              status={getStatusFromValue(data.system.cpuUsage, { warning: 75, critical: 90 })}
            />
            
            <MetricCard
              title="Memória"
              value={`${Math.round((data.system.memoryUsage / data.system.memoryTotal) * 100)}%`}
              subtitle={`${formatBytes(data.system.memoryUsage)} / ${formatBytes(data.system.memoryTotal)}`}
              icon={<Server className="h-4 w-4" />}
              status={getStatusFromValue((data.system.memoryUsage / data.system.memoryTotal) * 100, { warning: 80, critical: 95 })}
            />
            
            <MetricCard
              title="Tempo de Resposta"
              value={`${Math.round(data.api.averageResponseTime)}ms`}
              subtitle="Média das APIs"
              icon={<Clock className="h-4 w-4" />}
              status={getStatusFromValue(data.api.averageResponseTime, { warning: 500, critical: 1000 })}
            />
            
            <MetricCard
              title="Requisições/min"
              value={Math.round(data.api.requestsPerSecond * 60)}
              subtitle={`Taxa de erro: ${(data.api.errorRate * 100).toFixed(1)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              status={getStatusFromValue(data.api.errorRate * 100, { warning: 5, critical: 10 })}
            />
          </div>

          {/* Gráficos */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de CPU e Memória */}
            <Card>
              <CardHeader>
                <CardTitle>Recursos do Sistema</CardTitle>
                <CardDescription>CPU e Memória ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#8884d8" 
                      name="CPU (%)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#82ca9d" 
                      name="Memória (%)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Tempo de Resposta */}
            <Card>
              <CardHeader>
                <CardTitle>Performance da API</CardTitle>
                <CardDescription>Tempo de resposta médio</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#ffc658"
                      fill="#ffc658"
                      fillOpacity={0.3}
                      name="Tempo (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Métricas detalhadas */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Métricas da API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Requisições ativas:</span>
                  <span className="font-medium">{data.api.activeRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de requisições:</span>
                  <span className="font-medium">{data.api.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de erro:</span>
                  <span className={`font-medium ${data.api.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                    {(data.api.errorRate * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Req/segundo:</span>
                  <span className="font-medium">{data.api.requestsPerSecond.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Métricas do Banco */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Banco de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Conexões ativas:</span>
                  <span className="font-medium">{data.database.activeConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de queries:</span>
                  <span className="font-medium">{data.database.totalQueries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Queries lentas:</span>
                  <span className={`font-medium ${data.database.slowQueries > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {data.database.slowQueries}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tempo médio:</span>
                  <span className="font-medium">{Math.round(data.database.averageQueryTime)}ms</span>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uptime:</span>
                  <span className="font-medium">{formatUptime(data.system.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CPU:</span>
                  <span className="font-medium">{data.system.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Memória livre:</span>
                  <span className="font-medium">
                    {formatBytes(data.system.memoryTotal - data.system.memoryUsage)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="default" className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Online</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Estado sem dados */}
      {!data && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
            <Server className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-medium">Nenhum dado disponível</h3>
              <p className="text-muted-foreground">
                Conecte-se ao sistema de monitoramento para visualizar as métricas
              </p>
            </div>
            <Button onClick={connect}>
              Conectar agora
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
