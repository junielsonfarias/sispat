import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCacheInvalidation } from '@/hooks/useAdvancedCache';
import { useReportPreGeneration } from '@/hooks/useReportCache';
import { cacheInvalidationService } from '@/services/cache/cacheInvalidationService';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface CacheMetric {
  key: string;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  lastAccess: Date;
  ttl: number;
}

interface CacheStats {
  redis: {
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
  };
  memory: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  total: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

interface InvalidationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
}

export function CacheMonitoringDashboard() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [_cacheMetrics, _setCacheMetrics] = useState<CacheMetric[]>([]);
  const [invalidationRules, setInvalidationRules] = useState<
    InvalidationRule[]
  >([]);
  const [invalidationStats, setInvalidationStats] = useState<any>(null);
  const [preGenerationStats, setPreGenerationStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { invalidateByTags, invalidateByPattern, clearAll, getStats } =
    useCacheInvalidation();
  const { getStats: getPreGenStats, cleanup } = useReportPreGeneration();

  // Carregar dados iniciais
  useEffect(() => {
    loadDashboardData();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      // Carregar estatísticas de cache
      const stats = await getStats();
      setCacheStats(stats);

      // Carregar regras de invalidação
      const rules = cacheInvalidationService.getRules();
      setInvalidationRules(rules);

      // Carregar estatísticas de invalidação
      const invStats = cacheInvalidationService.getStats();
      setInvalidationStats(invStats);

      // Carregar estatísticas de pré-geração
      const preStats = await getPreGenStats();
      setPreGenerationStats(preStats);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvalidateByTags = async (tags: string[]) => {
    try {
      const invalidated = await invalidateByTags(tags);
      alert(`${invalidated} entradas invalidadas`);
      loadDashboardData();
    } catch (error) {
      console.error('Erro ao invalidar por tags:', error);
      alert('Erro ao invalidar cache');
    }
  };

  const handleInvalidateByPattern = async (pattern: string) => {
    try {
      const invalidated = await invalidateByPattern(pattern);
      alert(`${invalidated} entradas invalidadas`);
      loadDashboardData();
    } catch (error) {
      console.error('Erro ao invalidar por padrão:', error);
      alert('Erro ao invalidar cache');
    }
  };

  const handleClearAll = async () => {
    if (confirm('Tem certeza que deseja limpar todo o cache?')) {
      try {
        await clearAll();
        alert('Cache limpo com sucesso');
        loadDashboardData();
      } catch (error) {
        console.error('Erro ao limpar cache:', error);
        alert('Erro ao limpar cache');
      }
    }
  };

  const toggleRule = (ruleId: string) => {
    cacheInvalidationService.toggleRule(ruleId);
    loadDashboardData();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && !cacheStats) {
    return (
      <div className='flex items-center justify-center h-64'>
        <RefreshCw className='h-8 w-8 animate-spin' />
        <span className='ml-2'>Carregando dados do cache...</span>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold'>Monitoramento de Cache</h1>
          <p className='text-gray-600'>
            Última atualização: {lastRefresh.toLocaleString()}
          </p>
        </div>
        <div className='flex space-x-2'>
          <Button onClick={loadDashboardData} variant='outline'>
            <RefreshCw className='h-4 w-4 mr-2' />
            Atualizar
          </Button>
          <Button onClick={handleClearAll} variant='destructive'>
            <Trash2 className='h-4 w-4 mr-2' />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      {cacheStats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Hit Rate Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatPercentage(cacheStats.total.hitRate)}
              </div>
              <Progress
                value={cacheStats.total.hitRate * 100}
                className='mt-2'
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Redis Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatPercentage(cacheStats.redis.hitRate)}
              </div>
              <p className='text-xs text-gray-500 mt-1'>
                Uso: {formatBytes(cacheStats.redis.memoryUsage * 1024 * 1024)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Memory Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatPercentage(cacheStats.memory.hitRate)}
              </div>
              <p className='text-xs text-gray-500 mt-1'>
                Tamanho: {formatBytes(cacheStats.memory.size)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total de Acessos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {(
                  cacheStats.total.hits + cacheStats.total.misses
                ).toLocaleString()}
              </div>
              <p className='text-xs text-gray-500 mt-1'>
                Hits: {cacheStats.total.hits} | Misses:{' '}
                {cacheStats.total.misses}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview'>Visão Geral</TabsTrigger>
          <TabsTrigger value='invalidation'>Invalidação</TabsTrigger>
          <TabsTrigger value='pregeneration'>Pré-geração</TabsTrigger>
          <TabsTrigger value='actions'>Ações</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value='overview' className='space-y-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Performance Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Alertas de Performance</CardTitle>
                <CardDescription>Indicadores de saúde do cache</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                {cacheStats && (
                  <>
                    {cacheStats.total.hitRate < 0.7 && (
                      <Alert>
                        <AlertTriangle className='h-4 w-4' />
                        <AlertTitle>Hit Rate Baixo</AlertTitle>
                        <AlertDescription>
                          Hit rate total está em{' '}
                          {formatPercentage(cacheStats.total.hitRate)}.
                          Considere ajustar TTL ou estratégias de cache.
                        </AlertDescription>
                      </Alert>
                    )}

                    {cacheStats.redis.memoryUsage > 100 && (
                      <Alert>
                        <AlertTriangle className='h-4 w-4' />
                        <AlertTitle>Uso Alto de Memória Redis</AlertTitle>
                        <AlertDescription>
                          Redis está usando{' '}
                          {formatBytes(
                            cacheStats.redis.memoryUsage * 1024 * 1024
                          )}
                          . Considere limpeza ou aumento de recursos.
                        </AlertDescription>
                      </Alert>
                    )}

                    {cacheStats.total.hitRate >= 0.8 && (
                      <Alert>
                        <CheckCircle className='h-4 w-4' />
                        <AlertTitle>Performance Excelente</AlertTitle>
                        <AlertDescription>
                          Cache operando com hit rate de{' '}
                          {formatPercentage(cacheStats.total.hitRate)}.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas de Invalidação */}
            {invalidationStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Invalidação</CardTitle>
                  <CardDescription>
                    Atividade do sistema de invalidação
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='flex justify-between'>
                    <span>Regras Ativas:</span>
                    <Badge variant='secondary'>
                      {invalidationStats.activeRules}/
                      {invalidationStats.totalRules}
                    </Badge>
                  </div>

                  <div className='flex justify-between'>
                    <span>Total de Invalidações:</span>
                    <span className='font-medium'>
                      {invalidationStats.totalInvalidations.toLocaleString()}
                    </span>
                  </div>

                  <div className='flex justify-between'>
                    <span>Tempo Médio:</span>
                    <span className='font-medium'>
                      {invalidationStats.averageInvalidationTime.toFixed(1)}ms
                    </span>
                  </div>

                  {invalidationStats.lastInvalidation && (
                    <div className='flex justify-between'>
                      <span>Última Invalidação:</span>
                      <span className='text-sm text-gray-500'>
                        {new Date(
                          invalidationStats.lastInvalidation
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Invalidação */}
        <TabsContent value='invalidation' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Regras de Invalidação</CardTitle>
              <CardDescription>
                Gerenciar regras automáticas de invalidação de cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {invalidationRules.map(rule => (
                  <div
                    key={rule.id}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div className='flex-1'>
                      <div className='flex items-center space-x-2'>
                        <h4 className='font-medium'>{rule.name}</h4>
                        <Badge
                          variant='secondary'
                          className={getPriorityColor(rule.priority)}
                        >
                          {rule.priority}
                        </Badge>
                        {rule.enabled ? (
                          <Badge variant='default'>
                            <CheckCircle className='h-3 w-3 mr-1' />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant='secondary'>
                            <XCircle className='h-3 w-3 mr-1' />
                            Inativa
                          </Badge>
                        )}
                      </div>
                      <p className='text-sm text-gray-600 mt-1'>
                        {rule.description}
                      </p>
                    </div>

                    <Button
                      size='sm'
                      variant={rule.enabled ? 'outline' : 'default'}
                      onClick={() => toggleRule(rule.id)}
                    >
                      {rule.enabled ? 'Desabilitar' : 'Habilitar'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pré-geração */}
        <TabsContent value='pregeneration' className='space-y-4'>
          {preGenerationStats && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Configurações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {preGenerationStats.activeConfigs}/
                    {preGenerationStats.totalConfigs}
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>Ativas / Total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Taxa de Sucesso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {preGenerationStats.successfulRuns > 0
                      ? formatPercentage(
                          preGenerationStats.successfulRuns /
                            (preGenerationStats.successfulRuns +
                              preGenerationStats.failedRuns)
                        )
                      : '0%'}
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>
                    {preGenerationStats.successfulRuns} sucessos /{' '}
                    {preGenerationStats.failedRuns} falhas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Próxima Execução
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-sm font-bold'>
                    {preGenerationStats.nextRunTime
                      ? new Date(
                          preGenerationStats.nextRunTime
                        ).toLocaleString()
                      : 'Não agendada'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab: Ações */}
        <TabsContent value='actions' className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Invalidação Manual</CardTitle>
                <CardDescription>
                  Invalidar cache por tags ou padrões
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='space-y-2'>
                  <Button
                    className='w-full'
                    onClick={() => handleInvalidateByTags(['patrimonio'])}
                  >
                    Invalidar Cache de Patrimônio
                  </Button>

                  <Button
                    className='w-full'
                    onClick={() => handleInvalidateByTags(['dashboard'])}
                  >
                    Invalidar Cache de Dashboard
                  </Button>

                  <Button
                    className='w-full'
                    onClick={() => handleInvalidateByTags(['report'])}
                  >
                    Invalidar Cache de Relatórios
                  </Button>

                  <Button
                    className='w-full'
                    onClick={() => handleInvalidateByPattern('user:*')}
                  >
                    Invalidar Cache de Usuários
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manutenção</CardTitle>
                <CardDescription>
                  Operações de limpeza e otimização
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <Button className='w-full' onClick={() => cleanup()}>
                  <Trash2 className='h-4 w-4 mr-2' />
                  Limpar Relatórios Expirados
                </Button>

                <Button
                  className='w-full'
                  onClick={() => handleInvalidateByPattern('expired:*')}
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Limpar Cache Expirado
                </Button>

                <Button
                  className='w-full'
                  variant='outline'
                  onClick={loadDashboardData}
                >
                  <Zap className='h-4 w-4 mr-2' />
                  Aquecer Cache Principal
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
