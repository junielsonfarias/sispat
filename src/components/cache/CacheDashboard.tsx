import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCacheInvalidation,
  useCacheMonitor,
  useCacheWarmup,
} from '@/hooks/useAdvancedCache';
import {
  Activity,
  Database,
  MemoryStick,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function CacheDashboard() {
  const { stats, metrics, isMonitoring, startMonitoring, stopMonitoring } =
    useCacheMonitor();
  const {
    invalidateByTags,
    invalidateByPattern,
    clearAll,
    getStats: _getStats,
  } = useCacheInvalidation();
  const { warmup, isWarming, warmupProgress } = useCacheWarmup();

  const [invalidationTags, setInvalidationTags] = useState('');
  const [invalidationPattern, setInvalidationPattern] = useState('');
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    const cleanup = startMonitoring(5000); // Atualizar a cada 5 segundos
    return cleanup;
  }, [startMonitoring]);

  useEffect(() => {
    if (stats) {
      const timestamp = new Date().toLocaleTimeString();
      setHistoricalData(prev => {
        const newData = [
          ...prev,
          {
            time: timestamp,
            hitRate: Math.round(stats.total.hitRate * 100),
            redisHitRate: Math.round(stats.redis.hitRate * 100),
            memoryHitRate: Math.round(stats.memory.hitRate * 100),
            memoryUsage: Math.round(stats.redis.memoryUsage),
          },
        ];
        // Manter apenas os últimos 20 pontos
        return newData.slice(-20);
      });
    }
  }, [stats]);

  const handleInvalidateByTags = async () => {
    if (invalidationTags.trim()) {
      const tags = invalidationTags.split(',').map(tag => tag.trim());
      const count = await invalidateByTags(tags);
      alert(`${count} entradas invalidadas por tags`);
      setInvalidationTags('');
    }
  };

  const handleInvalidateByPattern = async () => {
    if (invalidationPattern.trim()) {
      const count = await invalidateByPattern(invalidationPattern);
      alert(`${count} entradas invalidadas por padrão`);
      setInvalidationPattern('');
    }
  };

  const handleClearAll = async () => {
    if (confirm('Tem certeza que deseja limpar todo o cache?')) {
      await clearAll();
      alert('Cache limpo com sucesso');
    }
  };

  const handleWarmup = async () => {
    // Configuração básica de aquecimento
    const warmupKeys = [
      {
        key: 'dashboard:stats',
        fetcher: async () => ({ timestamp: Date.now(), data: 'sample' }),
        options: { ttl: 300 },
      },
    ];

    await warmup(warmupKeys);
    alert('Aquecimento de cache concluído');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const _getStatusColor = (hitRate: number) => {
    if (hitRate >= 0.8) return 'text-green-600';
    if (hitRate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (hitRate: number) => {
    if (hitRate >= 0.8)
      return <TrendingUp className='h-4 w-4 text-green-600' />;
    if (hitRate >= 0.6) return <Activity className='h-4 w-4 text-yellow-600' />;
    return <TrendingDown className='h-4 w-4 text-red-600' />;
  };

  if (!stats) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='flex items-center space-x-2'>
          <RefreshCw className='h-6 w-6 animate-spin' />
          <span>Carregando estatísticas do cache...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Dashboard de Cache
          </h2>
          <p className='text-muted-foreground'>
            Monitore e gerencie o sistema de cache avançado
          </p>
        </div>

        <div className='flex items-center space-x-2'>
          <Badge
            variant={isMonitoring ? 'default' : 'secondary'}
            className='flex items-center space-x-1'
          >
            <Activity className='h-3 w-3' />
            <span>{isMonitoring ? 'Monitorando' : 'Parado'}</span>
          </Badge>

          <Button
            onClick={
              isMonitoring ? stopMonitoring : () => startMonitoring(5000)
            }
            variant='outline'
            size='sm'
          >
            {isMonitoring ? 'Parar' : 'Iniciar'} Monitoramento
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Hit Rate Total
            </CardTitle>
            {getStatusIcon(stats.total.hitRate)}
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {(stats.total.hitRate * 100).toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              {stats.total.hits} hits / {stats.total.misses} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Redis</CardTitle>
            <Database className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {(stats.redis.hitRate * 100).toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              {formatBytes(stats.redis.memoryUsage * 1024 * 1024)} em uso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Memória Local</CardTitle>
            <MemoryStick className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {(stats.memory.hitRate * 100).toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>
              {stats.memory.size} entradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Performance</CardTitle>
            <Zap className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {stats.total.hitRate > 0.8
                ? 'Ótima'
                : stats.total.hitRate > 0.6
                  ? 'Boa'
                  : 'Baixa'}
            </div>
            <p className='text-xs text-muted-foreground'>Baseado no hit rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Métricas Detalhadas */}
      <Tabs defaultValue='charts' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='charts'>Gráficos</TabsTrigger>
          <TabsTrigger value='metrics'>Métricas</TabsTrigger>
          <TabsTrigger value='management'>Gerenciamento</TabsTrigger>
        </TabsList>

        <TabsContent value='charts' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Hit Rate ao Longo do Tempo</CardTitle>
                <CardDescription>
                  Percentual de acertos no cache
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='time' />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type='monotone'
                      dataKey='hitRate'
                      stroke='#8884d8'
                      name='Total'
                      strokeWidth={2}
                    />
                    <Line
                      type='monotone'
                      dataKey='redisHitRate'
                      stroke='#82ca9d'
                      name='Redis'
                    />
                    <Line
                      type='monotone'
                      dataKey='memoryHitRate'
                      stroke='#ffc658'
                      name='Memória'
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uso de Memória Redis</CardTitle>
                <CardDescription>Memória utilizada pelo Redis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='time' />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type='monotone'
                      dataKey='memoryUsage'
                      stroke='#8884d8'
                      fill='#8884d8'
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='metrics' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Top Chaves de Cache</CardTitle>
              <CardDescription>
                Chaves mais acessadas e suas métricas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {metrics.slice(0, 10).map((metric, _index) => (
                  <div
                    key={metric.key}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div className='flex-1'>
                      <div className='font-mono text-sm font-medium truncate'>
                        {metric.key}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {metric.hits} hits / {metric.misses} misses
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm font-medium'>
                        {(
                          (metric.hits / (metric.hits + metric.misses)) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {formatBytes(metric.size)}
                      </div>
                    </div>
                  </div>
                ))}

                {metrics.length === 0 && (
                  <div className='text-center text-muted-foreground py-8'>
                    Nenhuma métrica disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='management' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Invalidação de Cache</CardTitle>
                <CardDescription>
                  Remover entradas específicas do cache
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='tags'>Invalidar por Tags</Label>
                  <div className='flex space-x-2'>
                    <Input
                      id='tags'
                      placeholder='patrimonio, user, report'
                      value={invalidationTags}
                      onChange={e => setInvalidationTags(e.target.value)}
                    />
                    <Button onClick={handleInvalidateByTags} variant='outline'>
                      <Trash2 className='h-4 w-4 mr-2' />
                      Invalidar
                    </Button>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='pattern'>Invalidar por Padrão</Label>
                  <div className='flex space-x-2'>
                    <Input
                      id='pattern'
                      placeholder='user:*'
                      value={invalidationPattern}
                      onChange={e => setInvalidationPattern(e.target.value)}
                    />
                    <Button
                      onClick={handleInvalidateByPattern}
                      variant='outline'
                    >
                      <Trash2 className='h-4 w-4 mr-2' />
                      Invalidar
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleClearAll}
                  variant='destructive'
                  className='w-full'
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Limpar Todo o Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aquecimento de Cache</CardTitle>
                <CardDescription>
                  Pré-carregar dados frequentemente acessados
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {isWarming && (
                  <div className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span>Progresso</span>
                      <span>{Math.round(warmupProgress)}%</span>
                    </div>
                    <Progress value={warmupProgress} />
                  </div>
                )}

                <Button
                  onClick={handleWarmup}
                  disabled={isWarming}
                  className='w-full'
                >
                  {isWarming ? (
                    <>
                      <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                      Aquecendo...
                    </>
                  ) : (
                    <>
                      <Zap className='h-4 w-4 mr-2' />
                      Iniciar Aquecimento
                    </>
                  )}
                </Button>

                <div className='text-xs text-muted-foreground'>
                  O aquecimento carrega dados essenciais no cache para melhorar
                  a performance
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
