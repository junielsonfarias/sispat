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
import { useSectors } from '@/contexts/SectorContext';
import { Archive, Building, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';

const ViewerDashboard = () => {
  const { patrimonios } = usePatrimonio();
  const { sectors } = useSectors();

  const stats = useMemo(() => {
    const activeCount = patrimonios.filter(p => p.status === 'ativo').length;
    return {
      totalCount: patrimonios.length,
      activeCount,
      sectorCount: sectors.length,
    };
  }, [patrimonios, sectors]);

  const statsCards = [
    {
      title: 'Total de Bens',
      value: stats.totalCount.toLocaleString('pt-BR'),
      icon: Archive,
    },
    {
      title: 'Bens Ativos',
      value: stats.activeCount.toLocaleString('pt-BR'),
      icon: CheckCircle,
    },
    {
      title: 'Setores Cadastrados',
      value: stats.sectorCount.toLocaleString('pt-BR'),
      icon: Building,
    },
  ];

  const distributionData = useMemo(() => {
    const counts = patrimonios.reduce(
      (acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1;
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
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length],
    }));
  }, [patrimonios]);

  const recentPatrimonios = useMemo(
    () =>
      [...patrimonios]
        .sort(
          (a, b) =>
            new Date(b.data_aquisicao).getTime() -
            new Date(a.data_aquisicao).getTime()
        )
        .slice(0, 5),
    [patrimonios]
  );

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header compacto com gradiente */}
        <div className='bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg shadow-md'>
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
                  d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent'>
                Dashboard de Consulta
              </h1>
              <p className='text-sm text-gray-600'>
                Visualização de dados e estatísticas do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas compactos */}
        <div className='grid grid-cols-3 gap-3 mb-6'>
          {statsCards.map((card, index) => {
            const colors = [
              'from-blue-50 to-blue-100 border-blue-200',
              'from-green-50 to-green-100 border-green-200',
              'from-orange-50 to-orange-100 border-orange-200',
            ];
            const colorClass = colors[index % colors.length];

            return (
              <Card
                key={card.title}
                className={`bg-gradient-to-br ${colorClass} border-2 hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='text-sm font-semibold text-gray-800'>
                      {card.title}
                    </CardTitle>
                    <div className='p-2 bg-white rounded-lg shadow-sm'>
                      <card.icon className='h-4 w-4 text-gray-600' />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='text-2xl font-bold text-gray-900'>
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className='grid gap-4 md:grid-cols-1 lg:grid-cols-3'>
          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle>Distribuição Geral por Tipo</CardTitle>
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
                    outerRadius={80}
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
          <Card className='lg:col-span-2'>
            <CardHeader>
              <CardTitle>Visão Geral dos Bens (Mais Recentes)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patrimônio</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPatrimonios.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className='font-medium'>
                        {item.numero_patrimonio}
                      </TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell>{item.setor_responsavel}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'ativo' ? 'default' : 'secondary'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewerDashboard;
