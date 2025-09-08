import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  DetectionStats,
  IntrusionAlert,
  IntrusionRule,
  intrusionDetectionService,
} from '@/services/intrusionDetection';
import {
  Activity,
  AlertTriangle,
  Ban,
  Bug,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Globe,
  RefreshCw,
  Settings,
  Shield,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export const IntrusionDetectionDashboard: React.FC = () => {
  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [alerts, setAlerts] = useState<IntrusionAlert[]>([]);
  const [rules, setRules] = useState<IntrusionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // segundos

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simular carregamento dos dados
      await new Promise(resolve => setTimeout(resolve, 500));

      const detectionStats = intrusionDetectionService.getDetectionStats();
      const activeAlerts = intrusionDetectionService.getActiveAlerts();
      const allRules = intrusionDetectionService.getRules();

      setStats(detectionStats);
      setAlerts(activeAlerts);
      setRules(allRules);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = (alertId: string) => {
    intrusionDetectionService.resolveAlert(
      alertId,
      'admin',
      'Resolvido via dashboard'
    );
    loadDashboardData();

    toast({
      title: 'Alerta resolvido',
      description: 'O alerta foi marcado como resolvido',
    });
  };

  const handleMarkFalsePositive = (alertId: string) => {
    intrusionDetectionService.markFalsePositive(
      alertId,
      'admin',
      'Falso positivo via dashboard'
    );
    loadDashboardData();

    toast({
      title: 'Falso positivo',
      description: 'O alerta foi marcado como falso positivo',
    });
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    intrusionDetectionService.toggleRule(ruleId, enabled);
    setRules(
      rules.map(rule => (rule.id === ruleId ? { ...rule, enabled } : rule))
    );

    toast({
      title: enabled ? 'Regra ativada' : 'Regra desativada',
      description: `A regra foi ${enabled ? 'ativada' : 'desativada'} com sucesso`,
    });
  };

  const handleUnblockIP = (ip: string) => {
    intrusionDetectionService.unblockIP(ip);
    toast({
      title: 'IP desbloqueado',
      description: `O IP ${ip} foi desbloqueado`,
    });
  };

  const exportAlerts = () => {
    const data = {
      alerts,
      stats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intrusion-alerts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className='w-4 h-4 text-red-500' />;
      case 'resolved':
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      case 'false_positive':
        return <XCircle className='w-4 h-4 text-gray-500' />;
      default:
        return <Clock className='w-4 h-4 text-yellow-500' />;
    }
  };

  if (loading && !stats) {
    return (
      <div className='flex items-center justify-center p-8'>
        <RefreshCw className='w-6 h-6 animate-spin mr-2' />
        Carregando dashboard de detecção de intrusão...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Shield className='w-6 h-6' />
            Detecção de Intrusão
          </h1>
          <p className='text-muted-foreground'>
            Monitore e responda a atividades suspeitas em tempo real
          </p>
        </div>

        <div className='flex gap-2 items-center'>
          <div className='flex items-center gap-2'>
            <Label>Auto-refresh</Label>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            {autoRefresh && (
              <Input
                type='number'
                value={refreshInterval}
                onChange={e =>
                  setRefreshInterval(parseInt(e.target.value) || 30)
                }
                className='w-16 text-xs'
                min='10'
                max='300'
              />
            )}
          </div>
          <Button variant='outline' onClick={exportAlerts}>
            <Download className='w-4 h-4 mr-2' />
            Exportar
          </Button>
          <Button variant='outline' onClick={loadDashboardData}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Eventos (24h)
              </CardTitle>
              <Activity className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.totalEvents}</div>
              <p className='text-xs text-muted-foreground'>
                Eventos detectados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Alertas Ativos
              </CardTitle>
              <AlertTriangle className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-red-600'>
                {alerts.length}
              </div>
              <p className='text-xs text-muted-foreground'>Requerem atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                IPs Bloqueados
              </CardTitle>
              <Ban className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.blockedIPs}</div>
              <p className='text-xs text-muted-foreground'>
                Endereços bloqueados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Taxa de Precisão
              </CardTitle>
              <Eye className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-600'>
                {stats.alertsGenerated > 0
                  ? Math.round(
                      ((stats.alertsGenerated - stats.falsePositives) /
                        stats.alertsGenerated) *
                        100
                    )
                  : 100}
                %
              </div>
              <p className='text-xs text-muted-foreground'>
                Alertas verdadeiros
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts críticos */}
      {alerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Alert variant='destructive'>
          <AlertTriangle className='w-4 h-4' />
          <AlertDescription>
            <strong>Atenção:</strong>{' '}
            {alerts.filter(alert => alert.severity === 'critical').length}{' '}
            alerta(s) crítico(s) detectado(s). Verifique imediatamente.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue='alerts' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='alerts'>Alertas Ativos</TabsTrigger>
          <TabsTrigger value='rules'>Regras de Detecção</TabsTrigger>
          <TabsTrigger value='threats'>Principais Ameaças</TabsTrigger>
          <TabsTrigger value='sources'>Fontes Suspeitas</TabsTrigger>
        </TabsList>

        <TabsContent value='alerts' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Alertas Ativos</CardTitle>
              <CardDescription>
                Alertas que requerem análise e resposta imediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <CheckCircle className='w-12 h-12 mx-auto mb-4 text-green-500' />
                  <p>Nenhum alerta ativo no momento</p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className='border rounded-lg p-4 space-y-3'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          {getStatusIcon(alert.status)}
                          <div>
                            <h4 className='font-medium'>{alert.rule.name}</h4>
                            <p className='text-sm text-muted-foreground'>
                              {alert.rule.description}
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center gap-2'>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className='text-xs text-muted-foreground'>
                            {alert.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
                        <div>
                          <Label className='text-xs'>IP de Origem</Label>
                          <p className='font-mono'>
                            {alert.events[0]?.ipAddress}
                          </p>
                        </div>
                        <div>
                          <Label className='text-xs'>Eventos</Label>
                          <p>{alert.events.length} ocorrência(s)</p>
                        </div>
                        <div>
                          <Label className='text-xs'>User Agent</Label>
                          <p className='truncate'>
                            {alert.events[0]?.userAgent || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {alert.status === 'active' && (
                        <div className='flex gap-2 pt-2'>
                          <Button
                            size='sm'
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            <CheckCircle className='w-3 h-3 mr-1' />
                            Resolver
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleMarkFalsePositive(alert.id)}
                          >
                            <XCircle className='w-3 h-3 mr-1' />
                            Falso Positivo
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              handleUnblockIP(alert.events[0]?.ipAddress)
                            }
                          >
                            <Ban className='w-3 h-3 mr-1' />
                            Desbloquear IP
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='rules' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Regras de Detecção</CardTitle>
              <CardDescription>
                Configure e gerencie regras de detecção de intrusão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className='flex items-center justify-between p-4 border rounded-lg'
                  >
                    <div className='flex-1'>
                      <div className='flex items-center gap-3'>
                        <h4 className='font-medium'>{rule.name}</h4>
                        <Badge className={getSeverityColor(rule.severity)}>
                          {rule.severity}
                        </Badge>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        {rule.description}
                      </p>
                      <div className='flex gap-4 text-xs text-muted-foreground mt-2'>
                        <span>Limite: {rule.threshold} eventos</span>
                        <span>Janela: {rule.timeWindow / 1000}s</span>
                        <span>Ações: {rule.actions.length}</span>
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={enabled =>
                          handleToggleRule(rule.id, enabled)
                        }
                      />
                      <Button variant='outline' size='sm'>
                        <Settings className='w-3 h-3' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='threats' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Principais Ameaças (24h)</CardTitle>
              <CardDescription>
                Tipos de ataques mais frequentes detectados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.topThreats.length > 0 ? (
                <div className='space-y-3'>
                  {stats.topThreats.map((threat, index) => (
                    <div
                      key={threat.type}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-3'>
                        <Badge variant='outline'>#{index + 1}</Badge>
                        <div>
                          <span className='font-medium'>
                            {threat.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Progress
                          value={
                            (threat.count /
                              Math.max(...stats.topThreats.map(t => t.count))) *
                            100
                          }
                          className='w-20'
                        />
                        <span className='text-sm font-medium w-8 text-right'>
                          {threat.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  <Bug className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Nenhuma ameaça detectada nas últimas 24h</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='sources' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Principais Fontes Suspeitas (24h)</CardTitle>
              <CardDescription>
                Endereços IP com maior atividade suspeita
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.topSources.length > 0 ? (
                <div className='space-y-3'>
                  {stats.topSources.map((source, index) => (
                    <div
                      key={source.ip}
                      className='flex items-center justify-between p-3 border rounded-lg'
                    >
                      <div className='flex items-center gap-3'>
                        <Badge variant='outline'>#{index + 1}</Badge>
                        <div>
                          <span className='font-mono font-medium'>
                            {source.ip}
                          </span>
                          <p className='text-xs text-muted-foreground'>
                            {intrusionDetectionService.isIPBlocked(source.ip)
                              ? 'Bloqueado'
                              : 'Ativo'}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Progress
                          value={
                            (source.count /
                              Math.max(...stats.topSources.map(s => s.count))) *
                            100
                          }
                          className='w-20'
                        />
                        <span className='text-sm font-medium w-8 text-right'>
                          {source.count}
                        </span>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleUnblockIP(source.ip)}
                          disabled={
                            !intrusionDetectionService.isIPBlocked(source.ip)
                          }
                        >
                          <Ban className='w-3 h-3' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  <Globe className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Nenhuma fonte suspeita detectada nas últimas 24h</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntrusionDetectionDashboard;
