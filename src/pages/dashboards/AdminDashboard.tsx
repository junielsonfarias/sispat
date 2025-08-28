import { useMemo, useEffect } from 'react';
import {
  Archive,
  DollarSign,
  CheckCircle,
  Wrench,
  XCircle,
  Building,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  Line,
  Pie,
  PieChart,
  ComposedChart,
  Cell,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useAuth } from '@/hooks/useAuth';
import { Patrimonio } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { subMonths, format } from 'date-fns';

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

const AdminDashboard = () => {
  const { patrimonios } = usePatrimonio();
  const { users } = useAuth();

  // Debug logs
  useEffect(() => {
    console.log(
      '🏠 AdminDashboard - Patrimônios recebidos:',
      patrimonios.length
    );
    console.log(
      '📋 Patrimônios:',
      patrimonios.map(p => ({
        id: p.id,
        numero: p.numero_patrimonio,
        descricao: p.descricao,
        municipality_id: p.municipalityId,
      }))
    );
  }, [patrimonios]);

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
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6'>
      <div className='max-w-7xl mx-auto space-y-8'>
        {/* Header do Dashboard */}
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-800 mb-2'>
            Dashboard Administrativo
          </h1>
          <p className='text-lg text-gray-600'>
            Visão geral do patrimônio municipal
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className='grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'>
          {statsCards.map(card => (
            <Card
              key={card.title}
              className='shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white/90 backdrop-blur-sm overflow-hidden group'
            >
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100'>
                <CardTitle className='text-sm font-semibold text-gray-700'>
                  {card.title}
                </CardTitle>
                <div
                  className={`p-2 rounded-lg bg-white shadow-sm group-hover:scale-110 transition-transform duration-200`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className='p-4 text-center'>
                <div className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800'>
                  {card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráficos Principais */}
        <div className='grid gap-6 grid-cols-1 lg:grid-cols-3'>
          {/* Gráfico de Evolução */}
          <Card className='lg:col-span-2 shadow-xl border-0 bg-white/90 backdrop-blur-sm'>
            <CardHeader className='bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200'>
              <CardTitle className='text-xl font-bold text-gray-800 flex items-center'>
                <span className='w-2 h-8 bg-blue-600 rounded-full mr-3'></span>
                Evolução Patrimonial (Últimos 6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent className='p-6'>
              <ChartContainer config={{}} className='h-[300px] w-full'>
                <ComposedChart data={evolutionData}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray='3 3'
                    stroke='#f0f0f0'
                  />
                  <XAxis
                    dataKey='month'
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    wrapperStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey='aquisicoes'
                    fill='#3b82f6'
                    name='Aquisições'
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    type='monotone'
                    dataKey='baixas'
                    stroke='#8b5cf6'
                    strokeWidth={3}
                    name='Baixas'
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Distribuição */}
          <Card className='shadow-xl border-0 bg-white/90 backdrop-blur-sm'>
            <CardHeader className='bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200'>
              <CardTitle className='text-xl font-bold text-gray-800 flex items-center'>
                <span className='w-2 h-8 bg-green-600 rounded-full mr-3'></span>
                Distribuição por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent className='p-6'>
              <ChartContainer config={{}} className='h-[300px] w-full'>
                <PieChart>
                  <Tooltip
                    content={<ChartTooltipContent />}
                    wrapperStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Pie
                    data={distributionData}
                    dataKey='value'
                    nameKey='name'
                    cx='50%'
                    cy='50%'
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas e Gráficos Secundários */}
        <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
          {/* Tabela de Alertas */}
          <Card className='shadow-xl border-0 bg-white/90 backdrop-blur-sm'>
            <CardHeader className='bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200'>
              <CardTitle className='text-xl font-bold text-gray-800 flex items-center'>
                <span className='w-2 h-8 bg-red-600 rounded-full mr-3'></span>
                Alertas e Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-gray-50 hover:bg-gray-50'>
                      <TableHead className='font-semibold text-gray-700'>
                        Patrimônio
                      </TableHead>
                      <TableHead className='font-semibold text-gray-700'>
                        Descrição
                      </TableHead>
                      <TableHead className='font-semibold text-gray-700'>
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsData.map((alert, index) => (
                      <TableRow
                        key={alert.id}
                        className='hover:bg-gray-50 transition-colors duration-200'
                      >
                        <TableCell className='font-semibold text-gray-800'>
                          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                            {alert.id}
                          </span>
                        </TableCell>
                        <TableCell className='text-gray-700'>
                          {alert.desc}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alert.status.includes('Manutenção')
                                ? 'default'
                                : 'destructive'
                            }
                            className='flex items-center gap-1 px-3 py-1'
                          >
                            <alert.icon className='h-3 w-3' />
                            {alert.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Setores */}
          <Card className='shadow-xl border-0 bg-white/90 backdrop-blur-sm'>
            <CardHeader className='bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200'>
              <CardTitle className='text-xl font-bold text-gray-800 flex items-center'>
                <span className='w-2 h-8 bg-purple-600 rounded-full mr-3'></span>
                Top 5 Setores por Quantidade de Bens
              </CardTitle>
            </CardHeader>
            <CardContent className='p-6'>
              <ChartContainer config={{}} className='h-[300px] w-full'>
                <BarChart
                  layout='vertical'
                  data={topSetores}
                  margin={{ left: 20, right: 20 }}
                >
                  <XAxis type='number' hide />
                  <YAxis
                    type='category'
                    dataKey='name'
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                    content={<ChartTooltipContent />}
                    wrapperStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey='value' fill='#8b5cf6' radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
