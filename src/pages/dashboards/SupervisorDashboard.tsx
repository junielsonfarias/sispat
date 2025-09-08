import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { formatCurrency } from '@/lib/utils';
import { Patrimonio } from '@/types';
import { format, subMonths } from 'date-fns';
import {
    AlertTriangle,
    Archive,
    Building,
    CheckCircle,
    Clock,
    DollarSign,
    Wrench,
    XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const alertsData = [
  {
    id: 'P0987',
    desc: 'Computador Sala 3',
    status: 'RUIM',
    icon: AlertTriangle,
  },
  {
    id: 'P0123',
    desc: 'Projetor Auditório',
    status: 'Manutenção Prolongada',
    icon: Clock,
  },
  {
    id: 'P0554',
    desc: 'Cadeira Recepção',
    status: 'PÉSSIMO',
    icon: AlertTriangle,
  },
];

const SupervisorDashboard = () => {
  const { patrimonios } = usePatrimonio();

  const stats = useMemo(() => {
    const totalValue = patrimonios.reduce(
      (acc, p) => acc + (parseFloat(p.valor_aquisicao) || 0),
      0
    );
    const statusCounts = patrimonios.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<Patrimonio['status'], number>
    );
    const oneMonthAgo = subMonths(new Date(), 1);
    const baixadosLastMonth = patrimonios.filter(
      p =>
        p.status === 'baixado' &&
        p.data_baixa &&
        new Date(p.data_baixa) > oneMonthAgo
    ).length;
    const setores = new Set(
      patrimonios.map(p => p.setor_responsavel || 'Não Informado')
    );

    return {
      totalCount: patrimonios.length,
      totalValue,
      activePercentage:
        patrimonios.length > 0
          ? ((statusCounts.ativo || 0) / patrimonios.length) * 100
          : 0,
      maintenanceCount: statusCounts.manutencao || 0,
      baixadosLastMonth,
      setoresCount: setores.size,
    };
  }, [patrimonios]);

  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      subMonths(new Date(), 5 - i)
    );
    return months.map(month => {
      const monthStr = format(month, 'MMM');
      const aquisicoes = patrimonios.filter(
        p =>
          p.data_aquisicao &&
          format(new Date(p.data_aquisicao), 'yyyy-MM') ===
            format(month, 'yyyy-MM')
      ).length;
      const baixas = patrimonios.filter(
        p =>
          p.data_baixa &&
          format(new Date(p.data_baixa), 'yyyy-MM') === format(month, 'yyyy-MM')
      ).length;
      return { month: monthStr, aquisicoes, baixas };
    });
  }, [patrimonios]);

  const distributionData = useMemo(() => {
    const data = patrimonios.reduce(
      (acc, p) => {
        const tipo = p.tipo || 'Não Informado';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];
    return Object.entries(data)
      .map(([name, value], index) => ({
        name,
        value,
        fill: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [patrimonios]);

  const topSetores = useMemo(() => {
    const data = patrimonios.reduce(
      (acc, p) => {
        const setor = p.setor_responsavel || 'Não Informado';
        acc[setor] = (acc[setor] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [patrimonios]);

  const statsCards = [
    {
      title: 'Total de Bens',
      value: stats.totalCount.toLocaleString('pt-BR'),
      icon: Archive,
      color: 'text-blue-500',
    },
    {
      title: 'Valor Total Estimado',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Bens Ativos',
      value: `${stats.activePercentage.toFixed(0)}%`,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Em Manutenção',
      value: stats.maintenanceCount.toLocaleString('pt-BR'),
      icon: Wrench,
      color: 'text-yellow-500',
    },
    {
      title: 'Baixados Este Mês',
      value: stats.baixadosLastMonth.toLocaleString('pt-BR'),
      icon: XCircle,
      color: 'text-red-500',
    },
    {
      title: 'Setores Ativos',
      value: stats.setoresCount.toLocaleString('pt-BR'),
      icon: Building,
      color: 'text-blue-500',
    },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header compacto com gradiente */}
        <div className='bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg shadow-md'>
              <svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent'>
                Dashboard do Supervisor
              </h1>
              <p className='text-sm text-gray-600'>
                Visão geral e controle dos setores supervisionados
              </p>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas compactos */}
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6'>
          {statsCards.map((card, index) => {
            const colors = [
              'from-blue-50 to-blue-100 border-blue-200',
              'from-green-50 to-green-100 border-green-200', 
              'from-orange-50 to-orange-100 border-orange-200',
              'from-purple-50 to-purple-100 border-purple-200',
              'from-pink-50 to-pink-100 border-pink-200',
              'from-indigo-50 to-indigo-100 border-indigo-200'
            ];
            const colorClass = colors[index % colors.length];
            
            return (
              <Card
                key={card.title}
                className={`bg-gradient-to-br ${colorClass} border-2 hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='text-xs font-semibold text-gray-800'>
                      {card.title}
                    </CardTitle>
                    <div className='p-1.5 bg-white rounded-lg shadow-sm'>
                      <card.icon className={`h-3 w-3 ${card.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-0 text-center'>
                  <div className='text-lg sm:text-xl lg:text-2xl font-bold text-gray-900'>
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Evolução Patrimonial (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className='h-[300px] w-full'>
              <ComposedChart data={evolutionData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey='month' tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey='aquisicoes'
                  fill='hsl(var(--chart-1))'
                  name='Aquisições'
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type='monotone'
                  dataKey='baixas'
                  stroke='hsl(var(--chart-4))'
                  name='Baixas'
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className='h-[300px] w-full'>
              <PieChart>
                <Tooltip content={<ChartTooltipContent />} />
                <Pie
                  data={distributionData}
                  dataKey='value'
                  nameKey='name'
                  cx='50%'
                  cy='50%'
                  outerRadius={100}
                  label
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <div className='grid gap-4 md:grid-cols-1 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Alertas e Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertsData.map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell className='font-medium'>{alert.id}</TableCell>
                    <TableCell>{alert.desc}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          alert.status.includes('Manutenção')
                            ? 'default'
                            : 'destructive'
                        }
                        className='flex items-center gap-1'
                      >
                        <alert.icon className='h-3 w-3' />
                        {alert.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Setores por Quantidade de Bens</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className='h-[250px] w-full'>
              <BarChart
                layout='vertical'
                data={topSetores}
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
                  fill='hsl(var(--chart-2))'
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
