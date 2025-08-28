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
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

interface DashboardStats {
  totalUsers: number;
  totalPatrimonios: number;
  totalImoveis: number;
  totalMunicipalities: number;
  activeUsers: number;
  systemHealth: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

export default function SuperuserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Buscar estatísticas
      const statsResponse = await api.get<DashboardStats>(
        '/admin/dashboard/stats'
      );
      setStats(statsResponse);

      // Buscar atividades recentes
      const activityResponse = await api.get<RecentActivity[]>(
        '/admin/dashboard/activity'
      );
      setRecentActivity(activityResponse);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    void fetchDashboardData();
  };

  useEffect(() => {
    void fetchDashboardData();

    // Atualizar dados a cada 5 minutos
    const interval = setInterval(() => {
      void fetchDashboardData();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (value: number) => {
    if (value >= 80) return <Badge variant='default'>Excelente</Badge>;
    if (value >= 60) return <Badge variant='secondary'>Bom</Badge>;
    return <Badge variant='destructive'>Crítico</Badge>;
  };

  if (!user || user.role !== 'superuser') {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='text-gray-500'>
          Acesso negado. Apenas superusuários podem acessar esta página.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='text-gray-500'>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Dashboard do Superusuário</h1>
          <p className='text-gray-600'>Visão geral do sistema SISPAT</p>
        </div>
        <Button onClick={refreshData} disabled={isLoading}>
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Estatísticas Gerais */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total de Usuários
              </CardTitle>
              <Badge variant='outline'>{stats.totalUsers}</Badge>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.totalUsers}</div>
              <p className='text-xs text-muted-foreground'>
                {stats.activeUsers} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Patrimônios</CardTitle>
              <Badge variant='outline'>{stats.totalPatrimonios}</Badge>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.totalPatrimonios}</div>
              <p className='text-xs text-muted-foreground'>Bens cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Imóveis</CardTitle>
              <Badge variant='outline'>{stats.totalImoveis}</Badge>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.totalImoveis}</div>
              <p className='text-xs text-muted-foreground'>
                Imóveis cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Municípios</CardTitle>
              <Badge variant='outline'>{stats.totalMunicipalities}</Badge>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {stats.totalMunicipalities}
              </div>
              <p className='text-xs text-muted-foreground'>Municípios ativos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Saúde do Sistema */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Saúde do Sistema
              <Badge className={getHealthColor(stats.systemHealth)}>
                {stats.systemHealth}%
              </Badge>
            </CardTitle>
            <CardDescription>Status geral do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={stats.systemHealth} className='mb-4' />
            {getHealthBadge(stats.systemHealth)}
          </CardContent>
        </Card>
      )}

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>Últimas ações realizadas no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className='text-gray-500'>
              Nenhuma atividade recente encontrada.
            </p>
          ) : (
            <div className='space-y-4'>
              {recentActivity.slice(0, 10).map(activity => (
                <div
                  key={activity.id}
                  className='flex items-start gap-3 p-3 border rounded-lg'
                >
                  <Badge variant='outline'>{activity.type}</Badge>
                  <div className='flex-1'>
                    <p className='font-medium'>{activity.description}</p>
                    <p className='text-sm text-gray-500'>
                      {activity.user} •{' '}
                      {new Date(activity.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
