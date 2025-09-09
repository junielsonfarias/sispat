import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { Patrimonio } from '@/types';
import { format, isAfter, subMonths } from 'date-fns';
import {
  AlertTriangle,
  Archive,
  DollarSign,
  PlusCircle,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const UserDashboard = () => {
  const { user } = useAuth();
  const { patrimonios } = usePatrimonio();

  const userPatrimonios = useMemo(() => {
    if (!user?.sectors || user.sectors.length === 0) {
      // Fallback para o campo sector antigo
      if (!user?.sector) return [];
      return patrimonios.filter(p => p.setor_responsavel === user.sector);
    }

    // Usar os setores do usuário logado
    const userSectorNames = user.sectors.map(s => s.name);
    return patrimonios.filter(
      p => p.setor_responsavel && userSectorNames.includes(p.setor_responsavel)
    );
  }, [patrimonios, user]);

  const stats = useMemo(() => {
    const totalValue = userPatrimonios.reduce(
      (acc, p) => acc + (parseFloat(p.valor_aquisicao) || 0),
      0
    );
    const statusCounts = userPatrimonios.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<Patrimonio['status'], number>
    );
    const oneMonthAgo = subMonths(new Date(), 1);
    const addedThisMonth = userPatrimonios.filter(p =>
      isAfter(new Date(p.data_aquisicao), oneMonthAgo)
    ).length;
    const needsAttention = userPatrimonios.filter(
      p => p.situacao_bem === 'RUIM' || p.situacao_bem === 'PESSIMO'
    ).length;
    const baixadosLastMonth = userPatrimonios.filter(
      p =>
        p.status === 'baixado' &&
        p.data_baixa &&
        new Date(p.data_baixa) > oneMonthAgo
    ).length;

    return {
      total: userPatrimonios.length,
      totalValue,
      needsAttention,
      addedThisMonth,
      baixadosLastMonth,
      activePercentage:
        userPatrimonios.length > 0
          ? ((statusCounts.ativo || 0) / userPatrimonios.length) * 100
          : 0,
      maintenanceCount: statusCounts.manutencao || 0,
    };
  }, [userPatrimonios]);

  const statsCards = [
    {
      title: 'Total de Bens',
      value: stats.total.toString(),
      icon: Archive,
      color: 'text-blue-500',
      description: 'Bens no setor',
    },
    {
      title: 'Valor Total',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'text-green-500',
      description: 'Valor dos bens',
    },
    {
      title: 'Necessitam Atenção',
      value: stats.needsAttention.toString(),
      icon: AlertTriangle,
      color: 'text-yellow-500',
      description: 'Bens em situação ruim',
    },
    {
      title: 'Em Manutenção',
      value: stats.maintenanceCount.toString(),
      icon: Wrench,
      color: 'text-orange-500',
      description: 'Bens em manutenção',
    },
    {
      title: 'Adicionados Este Mês',
      value: stats.addedThisMonth.toString(),
      icon: PlusCircle,
      color: 'text-green-500',
      description: 'Novos bens',
    },
    {
      title: 'Baixados Este Mês',
      value: stats.baixadosLastMonth.toString(),
      icon: XCircle,
      color: 'text-red-500',
      description: 'Bens baixados',
    },
  ];

  const statusData = useMemo(() => {
    const counts = userPatrimonios.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return [
      {
        name: 'Ativo',
        value: counts.ativo || 0,
        fill: 'hsl(var(--chart-2))',
      },
      {
        name: 'Manutenção',
        value: counts.manutencao || 0,
        fill: 'hsl(var(--chart-3))',
      },
      {
        name: 'Inativo',
        value: counts.inativo || 0,
        fill: 'hsl(var(--muted))',
      },
      {
        name: 'Baixado',
        value: counts.baixado || 0,
        fill: 'hsl(var(--chart-4))',
      },
    ];
  }, [userPatrimonios]);

  const typesData = useMemo(() => {
    const counts = userPatrimonios.reduce(
      (acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [userPatrimonios]);

  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      subMonths(new Date(), 5 - i)
    );
    return months.map(month => {
      const monthStr = format(month, 'MMM');
      const aquisicoes = userPatrimonios.filter(
        p =>
          p.data_aquisicao &&
          format(new Date(p.data_aquisicao), 'yyyy-MM') ===
            format(month, 'yyyy-MM')
      ).length;
      const baixas = userPatrimonios.filter(
        p =>
          p.data_baixa &&
          format(new Date(p.data_baixa), 'yyyy-MM') === format(month, 'yyyy-MM')
      ).length;
      return { month: monthStr, aquisicoes, baixas };
    });
  }, [userPatrimonios]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header compacto com gradiente */}
        <div className='bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md'>
              <svg
                className='h-6 w-6 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent'>
                Dashboard do Usuário
              </h1>
              <p className='text-sm text-gray-600'>
                Visão geral dos setores:{' '}
                <span className='font-semibold text-blue-600'>
                  {user?.sectors && user.sectors.length > 0
                    ? user.sectors.map(s => s.name).join(', ')
                    : user?.sector || 'Não definido'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas modernos */}
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6'>
          {statsCards.map((card, index) => {
            const colors = [
              'from-blue-50 to-blue-100 border-blue-200',
              'from-green-50 to-green-100 border-green-200',
              'from-yellow-50 to-yellow-100 border-yellow-200',
              'from-orange-50 to-orange-100 border-orange-200',
              'from-emerald-50 to-emerald-100 border-emerald-200',
              'from-red-50 to-red-100 border-red-200',
            ];
            const iconColors = [
              'bg-blue-500',
              'bg-green-500',
              'bg-yellow-500',
              'bg-orange-500',
              'bg-emerald-500',
              'bg-red-500',
            ];

            return (
              <div
                key={card.title}
                className={`bg-gradient-to-br ${colors[index]} rounded-lg shadow-md border ${iconColors[index].replace('bg-', 'border-')} p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className='flex flex-col items-center text-center'>
                  <div
                    className={`w-10 h-10 ${iconColors[index]} rounded-lg flex items-center justify-center mb-2`}
                  >
                    <card.icon className='w-5 h-5 text-white' />
                  </div>
                  <h3 className='text-xs font-semibold text-gray-700 mb-1 leading-tight'>
                    {card.title}
                  </h3>
                  <p className='text-2xl font-bold text-gray-800'>
                    {card.value}
                  </p>
                  {card.description && (
                    <p className='text-xs text-gray-600 mt-1 leading-tight'>
                      {card.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Gráficos modernos */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <div className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden'>
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200'>
              <h2 className='text-base font-semibold text-gray-800'>
                Status dos Bens
              </h2>
              <p className='text-xs text-gray-600'>Distribuição por situação</p>
            </div>
            <div className='p-4'>
              <ChartContainer config={{}} className='h-[250px] w-full'>
                <PieChart>
                  <Tooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={statusData}
                    dataKey='value'
                    nameKey='name'
                    cx='50%'
                    cy='50%'
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ChartContainer>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden'>
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200'>
              <h2 className='text-base font-semibold text-gray-800'>
                Tipos de Bens
              </h2>
              <p className='text-xs text-gray-600'>Por categoria</p>
            </div>
            <div className='p-4'>
              <ChartContainer config={{}} className='h-[250px] w-full'>
                <BarChart
                  data={typesData}
                  layout='vertical'
                  margin={{ left: 20 }}
                >
                  <XAxis type='number' hide />
                  <YAxis
                    type='category'
                    dataKey='name'
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey='value'
                    fill='hsl(var(--chart-1))'
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          {/* Gráfico de Evolução Temporal */}
          <div className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden'>
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200'>
              <h2 className='text-base font-semibold text-gray-800'>
                Evolução dos Bens
              </h2>
              <p className='text-xs text-gray-600'>Últimos 6 meses</p>
            </div>
            <div className='p-4'>
              <ChartContainer config={{}} className='h-[250px] w-full'>
                <BarChart
                  data={evolutionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey='month' />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar
                    dataKey='aquisicoes'
                    fill='hsl(var(--chart-1))'
                    name='Aquisições'
                  />
                  <Bar
                    dataKey='baixas'
                    fill='hsl(var(--chart-2))'
                    name='Baixas'
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
