import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
  responseTime: number;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/monitoring/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      }
    };

    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/monitoring/alerts');
        const data = await response.json();
        setAlerts(data);
      } catch (error) {
        console.error('Erro ao buscar alertas:', error);
      }
    };

    // Buscar dados iniciais
    fetchMetrics();
    fetchAlerts();
    setIsLoading(false);

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      fetchMetrics();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  const getHealthStatus = () => {
    if (!metrics) return 'unknown';

    const { cpu, memory, errorRate } = metrics;
    if (cpu > 90 || memory > 90 || errorRate > 10) return 'critical';
    if (cpu > 70 || memory > 70 || errorRate > 5) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className='p-6 bg-white rounded-lg shadow-lg'>
      <h2 className='text-2xl font-bold mb-6'>Dashboard de Monitoramento</h2>

      {/* Status Geral */}
      <div className='mb-6'>
        <div
          className={`inline-flex items-center px-4 py-2 rounded-full ${getStatusColor(getHealthStatus())}`}
        >
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              getHealthStatus() === 'healthy'
                ? 'bg-green-500'
                : getHealthStatus() === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          ></div>
          Status:{' '}
          {getHealthStatus() === 'healthy'
            ? 'Saudável'
            : getHealthStatus() === 'warning'
              ? 'Atenção'
              : 'Crítico'}
        </div>
      </div>

      {/* Métricas Principais */}
      {metrics && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <div className='bg-blue-50 p-4 rounded-lg'>
            <h3 className='text-sm font-medium text-blue-600'>CPU</h3>
            <p className='text-2xl font-bold text-blue-900'>{metrics.cpu}%</p>
          </div>
          <div className='bg-green-50 p-4 rounded-lg'>
            <h3 className='text-sm font-medium text-green-600'>Memória</h3>
            <p className='text-2xl font-bold text-green-900'>
              {metrics.memory}%
            </p>
          </div>
          <div className='bg-purple-50 p-4 rounded-lg'>
            <h3 className='text-sm font-medium text-purple-600'>
              Usuários Ativos
            </h3>
            <p className='text-2xl font-bold text-purple-900'>
              {metrics.activeUsers}
            </p>
          </div>
          <div className='bg-orange-50 p-4 rounded-lg'>
            <h3 className='text-sm font-medium text-orange-600'>
              Taxa de Erro
            </h3>
            <p className='text-2xl font-bold text-orange-900'>
              {metrics.errorRate}%
            </p>
          </div>
        </div>
      )}

      {/* Gráfico de Performance */}
      <div className='mb-6'>
        <h3 className='text-lg font-semibold mb-4'>
          Performance em Tempo Real
        </h3>
        <div className='h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart
              data={[
                { time: '00:00', cpu: 45, memory: 60, requests: 120 },
                { time: '00:05', cpu: 52, memory: 65, requests: 135 },
                { time: '00:10', cpu: 48, memory: 62, requests: 110 },
                { time: '00:15', cpu: 55, memory: 68, requests: 150 },
                { time: '00:20', cpu: 50, memory: 64, requests: 125 },
              ]}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='time' />
              <YAxis />
              <Tooltip />
              <Line
                type='monotone'
                dataKey='cpu'
                stroke='#3B82F6'
                strokeWidth={2}
              />
              <Line
                type='monotone'
                dataKey='memory'
                stroke='#10B981'
                strokeWidth={2}
              />
              <Line
                type='monotone'
                dataKey='requests'
                stroke='#F59E0B'
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas */}
      <div>
        <h3 className='text-lg font-semibold mb-4'>Alertas Recentes</h3>
        <div className='space-y-2'>
          {alerts.length === 0 ? (
            <p className='text-gray-500'>Nenhum alerta ativo</p>
          ) : (
            alerts.slice(0, 5).map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'critical'
                    ? 'border-red-500 bg-red-50'
                    : alert.severity === 'high'
                      ? 'border-orange-500 bg-orange-50'
                      : alert.severity === 'medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className='flex justify-between items-start'>
                  <div>
                    <p className='font-medium'>{alert.message}</p>
                    <p className='text-sm text-gray-600'>
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!alert.acknowledged && (
                    <span className='text-xs bg-red-100 text-red-800 px-2 py-1 rounded'>
                      Não reconhecido
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
