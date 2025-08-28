import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Database,
  Clock,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Eye,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface QueryLog {
  id: string;
  query: string;
  duration: number;
  timestamp: number;
  table?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  status: 'success' | 'error';
  error?: string;
  rowsAffected?: number;
}

interface SlowQueryAlert {
  id: string;
  query: string;
  duration: number;
  threshold: number;
  timestamp: number;
  frequency: number;
  table?: string;
  suggestions?: string[];
}

interface TableStats {
  table: string;
  queryCount: number;
  avgDuration: number;
  errorRate: number;
  slowQueries: number;
}

interface DatabaseMetricsData {
  averageQueryTime: number;
  slowQueries: number;
  activeConnections: number;
  totalQueries: number;
  slowQueryLogs: QueryLog[];
  tableStats: TableStats[];
  alerts: SlowQueryAlert[];
}

// Dados mockados para demonstração
const mockData: DatabaseMetricsData = {
  averageQueryTime: 145,
  slowQueries: 3,
  activeConnections: 5,
  totalQueries: 1247,
  slowQueryLogs: [
    {
      id: '1',
      query:
        "SELECT p.*, m.nome as municipio_nome FROM patrimonio p LEFT JOIN municipio m ON p.municipio_id = m.id WHERE p.status = 'ATIVO' ORDER BY p.data_aquisicao DESC",
      duration: 2340,
      timestamp: Date.now() - 300000,
      table: 'patrimonio',
      operation: 'SELECT',
      status: 'success',
      rowsAffected: 156,
    },
    {
      id: '2',
      query:
        "UPDATE patrimonio SET valor_atual = valor_atual * 1.05 WHERE categoria_id IN (SELECT id FROM categoria WHERE tipo = 'EQUIPAMENTO')",
      duration: 1890,
      timestamp: Date.now() - 600000,
      table: 'patrimonio',
      operation: 'UPDATE',
      status: 'success',
      rowsAffected: 89,
    },
    {
      id: '3',
      query:
        'SELECT COUNT(*) as total, AVG(valor_atual) as valor_medio FROM patrimonio p JOIN municipio m ON p.municipio_id = m.id GROUP BY m.nome',
      duration: 1456,
      timestamp: Date.now() - 900000,
      table: 'patrimonio',
      operation: 'SELECT',
      status: 'success',
      rowsAffected: 12,
    },
  ],
  tableStats: [
    {
      table: 'patrimonio',
      queryCount: 456,
      avgDuration: 178,
      errorRate: 1.2,
      slowQueries: 12,
    },
    {
      table: 'municipio',
      queryCount: 234,
      avgDuration: 89,
      errorRate: 0.5,
      slowQueries: 2,
    },
    {
      table: 'categoria',
      queryCount: 189,
      avgDuration: 67,
      errorRate: 0.8,
      slowQueries: 1,
    },
    {
      table: 'usuario',
      queryCount: 167,
      avgDuration: 134,
      errorRate: 2.1,
      slowQueries: 5,
    },
    {
      table: 'log_atividade',
      queryCount: 123,
      avgDuration: 234,
      errorRate: 0.3,
      slowQueries: 8,
    },
  ],
  alerts: [
    {
      id: 'alert1',
      query:
        'SELECT * FROM patrimonio WHERE status = ? ORDER BY data_aquisicao',
      duration: 2100,
      threshold: 1000,
      timestamp: Date.now() - 180000,
      frequency: 5,
      table: 'patrimonio',
      suggestions: [
        'Evite SELECT *, especifique apenas as colunas necessárias',
        'Considere adicionar índice na coluna status',
        'Considere adicionar LIMIT para queries com ORDER BY',
      ],
    },
  ],
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function DatabaseMetrics() {
  const [data, setData] = useState<DatabaseMetricsData>(mockData);
  const [selectedQuery, setSelectedQuery] = useState<QueryLog | null>(null);
  const [showAllQueries, setShowAllQueries] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simular atualização de dados
  const refreshData = async () => {
    setIsLoading(true);
    // Em produção, fazer chamada para API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simular mudanças nos dados
    setData(prev => ({
      ...prev,
      averageQueryTime: Math.round(
        prev.averageQueryTime + (Math.random() - 0.5) * 20
      ),
      activeConnections: Math.max(
        1,
        prev.activeConnections + Math.round((Math.random() - 0.5) * 3)
      ),
      totalQueries: prev.totalQueries + Math.round(Math.random() * 10),
    }));

    setIsLoading(false);
  };

  // Dados para gráfico de duração por operação
  const operationData = data.slowQueryLogs.reduce(
    (acc, log) => {
      const existing = acc.find(item => item.operation === log.operation);
      if (existing) {
        existing.count += 1;
        existing.avgDuration = (existing.avgDuration + log.duration) / 2;
      } else {
        acc.push({
          operation: log.operation,
          count: 1,
          avgDuration: log.duration,
        });
      }
      return acc;
    },
    [] as Array<{ operation: string; count: number; avgDuration: number }>
  );

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatQuery = (query: string, maxLength: number = 60): string => {
    return query.length > maxLength
      ? `${query.substring(0, maxLength)}...`
      : query;
  };

  const getStatusColor = (
    value: number,
    thresholds: { warning: number; critical: number }
  ): string => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Métricas do Banco de Dados
          </h2>
          <p className='text-muted-foreground'>
            Monitoramento de performance e queries do PostgreSQL
          </p>
        </div>
        <Button
          onClick={refreshData}
          disabled={isLoading}
          variant='outline'
          size='sm'
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      {/* Alertas de queries lentas */}
      {data.alerts.length > 0 && (
        <div className='space-y-2'>
          {data.alerts.map(alert => (
            <Alert key={alert.id} variant='destructive'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <div className='space-y-2'>
                  <div>
                    <strong>Query Lenta Detectada:</strong>{' '}
                    {formatQuery(alert.query, 100)}
                  </div>
                  <div className='text-sm'>
                    Duração: {formatDuration(alert.duration)} | Frequência:{' '}
                    {alert.frequency}x | Tabela: {alert.table}
                  </div>
                  {alert.suggestions && (
                    <div className='text-sm'>
                      <strong>Sugestões:</strong>
                      <ul className='list-disc list-inside mt-1'>
                        {alert.suggestions
                          .slice(0, 2)
                          .map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Cards de métricas principais */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Tempo Médio</CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getStatusColor(data.averageQueryTime, { warning: 200, critical: 500 })}`}
            >
              {formatDuration(data.averageQueryTime)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Tempo médio de execução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Queries Lentas
            </CardTitle>
            <AlertTriangle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getStatusColor(data.slowQueries, { warning: 5, critical: 10 })}`}
            >
              {data.slowQueries}
            </div>
            <p className='text-xs text-muted-foreground'>Últimos 5 minutos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Conexões Ativas
            </CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{data.activeConnections}</div>
            <p className='text-xs text-muted-foreground'>Pool de conexões</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total de Queries
            </CardTitle>
            <Database className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data.totalQueries.toLocaleString()}
            </div>
            <p className='text-xs text-muted-foreground'>Últimos 5 minutos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* Gráfico de operações */}
        <Card>
          <CardHeader>
            <CardTitle>Queries por Operação</CardTitle>
            <CardDescription>
              Distribuição de queries lentas por tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={operationData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='operation' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='count' fill='#8884d8' name='Quantidade' />
                <Bar
                  dataKey='avgDuration'
                  fill='#82ca9d'
                  name='Duração Média (ms)'
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de tabelas */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Tabela</CardTitle>
            <CardDescription>Queries e tempo médio por tabela</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={data.tableStats.slice(0, 5)}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ table, queryCount }) => `${table} (${queryCount})`}
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='queryCount'
                >
                  {data.tableStats.slice(0, 5).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Queries mais lentas */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span className='flex items-center'>
              <Clock className='h-5 w-5 mr-2' />
              Queries Mais Lentas
            </span>
            <Button
              onClick={() => setShowAllQueries(!showAllQueries)}
              variant='outline'
              size='sm'
            >
              <Eye className='h-4 w-4 mr-1' />
              {showAllQueries ? 'Mostrar Menos' : 'Ver Todas'}
            </Button>
          </CardTitle>
          <CardDescription>
            Queries que excedem o threshold de performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {data.slowQueryLogs
              .slice(0, showAllQueries ? undefined : 5)
              .map(query => (
                <div
                  key={query.id}
                  className='border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors'
                  onClick={() =>
                    setSelectedQuery(
                      selectedQuery?.id === query.id ? null : query
                    )
                  }
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center space-x-2'>
                        <Badge
                          variant={
                            query.operation === 'SELECT'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {query.operation}
                        </Badge>
                        <span className='text-sm text-muted-foreground'>
                          {query.table}
                        </span>
                        <Badge
                          variant={
                            query.status === 'success'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {query.status}
                        </Badge>
                      </div>
                      <div className='mt-2 font-mono text-sm'>
                        {formatQuery(query.query, 120)}
                      </div>
                    </div>
                    <div className='text-right'>
                      <div
                        className={`text-lg font-bold ${getStatusColor(query.duration, { warning: 1000, critical: 2000 })}`}
                      >
                        {formatDuration(query.duration)}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {new Date(query.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {selectedQuery?.id === query.id && (
                    <div className='mt-4 pt-4 border-t space-y-2'>
                      <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                          <strong>Timestamp:</strong>{' '}
                          {new Date(query.timestamp).toLocaleString()}
                        </div>
                        <div>
                          <strong>Linhas Afetadas:</strong>{' '}
                          {query.rowsAffected || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <strong>Query Completa:</strong>
                        <pre className='mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto'>
                          {query.query}
                        </pre>
                      </div>
                      {query.error && (
                        <div>
                          <strong>Erro:</strong>
                          <div className='mt-1 p-2 bg-red-50 text-red-700 rounded text-sm'>
                            {query.error}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas por tabela */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <BarChart3 className='h-5 w-5 mr-2' />
            Estatísticas por Tabela
          </CardTitle>
          <CardDescription>
            Performance detalhada por tabela do banco
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left p-2'>Tabela</th>
                  <th className='text-right p-2'>Queries</th>
                  <th className='text-right p-2'>Tempo Médio</th>
                  <th className='text-right p-2'>Taxa de Erro</th>
                  <th className='text-right p-2'>Queries Lentas</th>
                </tr>
              </thead>
              <tbody>
                {data.tableStats.map(stat => (
                  <tr key={stat.table} className='border-b hover:bg-gray-50'>
                    <td className='p-2 font-medium'>{stat.table}</td>
                    <td className='p-2 text-right'>{stat.queryCount}</td>
                    <td
                      className={`p-2 text-right ${getStatusColor(stat.avgDuration, { warning: 200, critical: 500 })}`}
                    >
                      {formatDuration(stat.avgDuration)}
                    </td>
                    <td
                      className={`p-2 text-right ${getStatusColor(stat.errorRate, { warning: 2, critical: 5 })}`}
                    >
                      {stat.errorRate.toFixed(1)}%
                    </td>
                    <td
                      className={`p-2 text-right ${getStatusColor(stat.slowQueries, { warning: 5, critical: 10 })}`}
                    >
                      {stat.slowQueries}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
