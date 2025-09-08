import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useAuth } from '@/hooks/useAuth';
import { isAfter, subMonths } from 'date-fns';
import { AlertCircle, Folder, PlusCircle, UserCheck } from 'lucide-react';
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
    if (!user?.sector) return [];
    return patrimonios.filter(p => p.setor_responsavel === user.sector);
  }, [patrimonios, user]);

  const stats = useMemo(() => {
    const oneMonthAgo = subMonths(new Date(), 1);
    const addedThisMonth = userPatrimonios.filter(p =>
      isAfter(new Date(p.data_aquisicao), oneMonthAgo)
    ).length;
    const needsAttention = userPatrimonios.filter(
      p => p.situacao_bem === 'RUIM' || p.situacao_bem === 'PESSIMO'
    ).length;

    return {
      total: userPatrimonios.length,
      responsible: userPatrimonios.length, // Simplified for now
      needsAttention,
      addedThisMonth,
    };
  }, [userPatrimonios]);

  const statsCards = [
    {
      title: 'Bens no Setor',
      value: stats.total.toString(),
      icon: Folder,
      color: 'text-blue-500',
    },
    {
      title: 'Sob Minha Responsabilidade',
      value: stats.responsible.toString(),
      icon: UserCheck,
      color: 'text-green-500',
    },
    {
      title: 'Necessitam Atenção',
      value: stats.needsAttention.toString(),
      icon: AlertCircle,
      color: 'text-yellow-500',
    },
    {
      title: 'Adicionados Este Mês',
      value: stats.addedThisMonth.toString(),
      icon: PlusCircle,
      color: 'text-green-500',
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
                Visão geral do setor:{' '}
                <span className='font-semibold text-blue-600'>
                  {user?.sector}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas modernos */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          {statsCards.map((card, index) => {
            const colors = [
              'from-blue-50 to-blue-100 border-blue-200',
              'from-green-50 to-green-100 border-green-200',
              'from-yellow-50 to-yellow-100 border-yellow-200',
              'from-purple-50 to-purple-100 border-purple-200',
            ];
            const iconColors = [
              'bg-blue-500',
              'bg-green-500',
              'bg-yellow-500',
              'bg-purple-500',
            ];

            return (
              <div
                key={card.title}
                className={`bg-gradient-to-br ${colors[index]} rounded-xl shadow-lg border ${iconColors[index].replace('bg-', 'border-')} p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-sm font-semibold text-gray-700 mb-2'>
                      {card.title}
                    </h3>
                    <p className='text-4xl font-bold text-gray-800'>
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 ${iconColors[index]} rounded-lg flex items-center justify-center`}
                  >
                    <card.icon className='w-6 h-6 text-white' />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Gráficos modernos */}
        <div className='grid gap-6 md:grid-cols-1 lg:grid-cols-2'>
          <div className='bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden'>
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
              <h2 className='text-lg font-semibold text-gray-800'>
                Status dos Meus Bens
              </h2>
              <p className='text-sm text-gray-600'>
                Distribuição por situação atual
              </p>
            </div>
            <div className='p-6'>
              <ChartContainer config={{}} className='h-[300px] w-full'>
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

          <div className='bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden'>
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
              <h2 className='text-lg font-semibold text-gray-800'>
                Tipos de Bens no Setor
              </h2>
              <p className='text-sm text-gray-600'>Quantidade por categoria</p>
            </div>
            <div className='p-6'>
              <ChartContainer config={{}} className='h-[300px] w-full'>
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
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
