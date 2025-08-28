import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  Activity,
  Users,
  Globe,
  Clock,
  TrendingUp,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  securityAuditService,
  SecurityMetrics,
  SecuritySeverity,
  RiskAssessment,
} from '@/services/securityAudit';

export const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userRisk, setUserRisk] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Simular carregamento das métricas
      await new Promise(resolve => setTimeout(resolve, 1000));
      const data = securityAuditService.getSecurityMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    const risk = securityAuditService.assessUserRisk(userId);
    setUserRisk(risk);
  };

  const exportReport = () => {
    if (!metrics) return;

    const report = {
      generatedAt: new Date().toISOString(),
      metrics,
      timestamp: Date.now(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: SecuritySeverity) => {
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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-orange-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <RefreshCw className='w-6 h-6 animate-spin mr-2' />
        Carregando dashboard de segurança...
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className='w-4 h-4' />
        <AlertDescription>
          Erro ao carregar métricas de segurança. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Shield className='w-6 h-6' />
            Dashboard de Segurança
          </h1>
          <p className='text-muted-foreground'>
            Monitoramento e análise de eventos de segurança em tempo real
          </p>
        </div>

        <div className='flex gap-2'>
          <Button variant='outline' onClick={loadMetrics}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Atualizar
          </Button>
          <Button variant='outline' onClick={exportReport}>
            <Download className='w-4 h-4 mr-2' />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas Gerais */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total de Eventos
            </CardTitle>
            <Activity className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics.totalEvents}</div>
            <p className='text-xs text-muted-foreground'>
              Todos os eventos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Últimas 24h</CardTitle>
            <Clock className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics.eventsLast24h}</div>
            <p className='text-xs text-muted-foreground'>
              {metrics.eventsLast24h > metrics.eventsLast7d / 7 ? (
                <span className='text-red-600'>↑ Acima da média</span>
              ) : (
                <span className='text-green-600'>↓ Dentro do normal</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Usuários de Risco
            </CardTitle>
            <Users className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics.topRiskyUsers.filter(u => u.riskScore > 50).length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Usuários com risco alto/crítico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>IPs Suspeitos</CardTitle>
            <Globe className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics.topRiskyIPs.filter(ip => ip.riskScore > 30).length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Endereços IP com atividade suspeita
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Detalhes */}
      <Tabs defaultValue='events' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='events'>Eventos por Tipo</TabsTrigger>
          <TabsTrigger value='severity'>Por Severidade</TabsTrigger>
          <TabsTrigger value='users'>Usuários de Risco</TabsTrigger>
          <TabsTrigger value='ips'>IPs Suspeitos</TabsTrigger>
        </TabsList>

        <TabsContent value='events' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Eventos por Tipo</CardTitle>
              <CardDescription>
                Distribuição dos tipos de eventos de segurança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {Object.entries(metrics.eventsByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([type, count]) => (
                    <div
                      key={type}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline'>
                          {type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='w-32'>
                          <Progress
                            value={
                              (count /
                                Math.max(
                                  ...Object.values(metrics.eventsByType)
                                )) *
                              100
                            }
                          />
                        </div>
                        <span className='text-sm font-medium w-8 text-right'>
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='severity' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Eventos por Severidade</CardTitle>
              <CardDescription>
                Classificação dos eventos por nível de severidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {(
                  ['critical', 'high', 'medium', 'low'] as SecuritySeverity[]
                ).map(severity => {
                  const count = metrics.eventsBySeverity[severity] || 0;
                  const percentage =
                    metrics.totalEvents > 0
                      ? (count / metrics.totalEvents) * 100
                      : 0;

                  return (
                    <div
                      key={severity}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <Badge className={getSeverityColor(severity)}>
                          {severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='w-32'>
                          <Progress value={percentage} />
                        </div>
                        <span className='text-sm font-medium w-8 text-right'>
                          {count}
                        </span>
                        <span className='text-xs text-muted-foreground w-12 text-right'>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='users' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Usuários de Alto Risco</CardTitle>
              <CardDescription>
                Usuários com maior pontuação de risco baseada em atividades
                suspeitas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {metrics.topRiskyUsers.slice(0, 10).map(user => (
                  <div
                    key={user.userId}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div className='flex items-center gap-3'>
                      <div>
                        <p className='font-medium'>{user.userName}</p>
                        <p className='text-sm text-muted-foreground'>
                          {user.recentEvents} eventos recentes
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3'>
                      <div className='text-right'>
                        <div className='flex items-center gap-2'>
                          <Progress value={user.riskScore} className='w-20' />
                          <span className='text-sm font-medium'>
                            {user.riskScore}
                          </span>
                        </div>
                        <p
                          className={`text-xs ${getRiskLevelColor(
                            user.riskScore > 70
                              ? 'critical'
                              : user.riskScore > 50
                                ? 'high'
                                : user.riskScore > 30
                                  ? 'medium'
                                  : 'low'
                          )}`}
                        >
                          {user.riskScore > 70
                            ? 'CRÍTICO'
                            : user.riskScore > 50
                              ? 'ALTO'
                              : user.riskScore > 30
                                ? 'MÉDIO'
                                : 'BAIXO'}
                        </p>
                      </div>

                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleUserSelect(user.userId)}
                      >
                        <Eye className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='ips' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Endereços IP Suspeitos</CardTitle>
              <CardDescription>
                IPs com maior atividade suspeita ou maliciosa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {metrics.topRiskyIPs.slice(0, 10).map(ip => (
                  <div
                    key={ip.ipAddress}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div>
                      <p className='font-medium font-mono'>{ip.ipAddress}</p>
                      <p className='text-sm text-muted-foreground'>
                        {ip.recentEvents} eventos recentes
                        {ip.location && ` • ${ip.location}`}
                      </p>
                    </div>

                    <div className='flex items-center gap-2'>
                      <Progress
                        value={Math.min(ip.riskScore, 100)}
                        className='w-20'
                      />
                      <span className='text-sm font-medium'>
                        {ip.riskScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Usuário */}
      {selectedUser && userRisk && (
        <Card className='border-2 border-orange-200'>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <CardTitle>Análise de Risco - {selectedUser}</CardTitle>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setSelectedUser(null)}
              >
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <span>Pontuação de Risco:</span>
                <Badge
                  className={getSeverityColor(
                    userRisk.riskLevel === 'critical'
                      ? 'critical'
                      : userRisk.riskLevel === 'high'
                        ? 'high'
                        : userRisk.riskLevel === 'medium'
                          ? 'medium'
                          : 'low'
                  )}
                >
                  {userRisk.riskScore}/100 - {userRisk.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className='font-medium mb-2'>Fatores de Risco:</h4>
              <div className='space-y-2'>
                {userRisk.factors.map((factor, index) => (
                  <div
                    key={index}
                    className='flex justify-between items-center'
                  >
                    <span className='text-sm'>{factor.factor}</span>
                    <div className='flex items-center gap-2'>
                      <Progress value={factor.weight} className='w-20' />
                      <span className='text-xs text-muted-foreground'>
                        +{factor.weight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {userRisk.recommendations.length > 0 && (
              <div>
                <h4 className='font-medium mb-2'>Recomendações:</h4>
                <ul className='space-y-1 text-sm'>
                  {userRisk.recommendations.map((rec, index) => (
                    <li key={index} className='flex items-center gap-2'>
                      <TrendingUp className='w-3 h-3 text-blue-500' />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityDashboard;
