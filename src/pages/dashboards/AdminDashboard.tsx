import { useMemo } from 'react'
import {
  Archive,
  DollarSign,
  CheckCircle,
  Wrench,
  XCircle,
  Building,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useAuth } from '@/hooks/useAuth'
import { useSectorFilter } from '@/hooks/useSectorFilter'
import { Patrimonio } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { subMonths, format } from 'date-fns'

// Removido dados mockados - será integrado com backend real

const AdminDashboard = () => {
  const { patrimonios } = usePatrimonio()
  const { users } = useAuth()
  const { filterPatrimonios, getFilteredStats, accessInfo } = useSectorFilter()

  const stats = useMemo(() => {
    // Validação de dados
    if (!patrimonios || patrimonios.length === 0) {
      return {
        totalCount: 0,
        totalValue: 0,
        activePercentage: 0,
        maintenanceCount: 0,
        baixadosLastMonth: 0,
        setoresCount: 0,
      }
    }

    // ✅ CORREÇÃO: Usar estatísticas filtradas por setor do usuário
    const filteredStats = getFilteredStats(patrimonios)
    
    // Filtrar bens baixados do cálculo de valor total
    const filteredPatrimonios = filterPatrimonios(patrimonios)
    const patrimoniosAtivos = filteredPatrimonios.filter(p => p.status !== 'baixado')
    
    const oneMonthAgo = subMonths(new Date(), 1)
    const baixadosLastMonth = filteredPatrimonios.filter(
      (p) =>
        p.status === 'baixado' &&
        p.data_baixa &&
        new Date(p.data_baixa) > oneMonthAgo,
    ).length

    return {
      totalCount: filteredStats.total,
      totalValue: filteredStats.valorTotal,
      activePercentage:
        filteredStats.total > 0
          ? (filteredStats.ativos / filteredStats.total) * 100
          : 0,
      maintenanceCount: filteredStats.manutencao,
      baixadosLastMonth,
      setoresCount: filteredStats.setores,
    }
  }, [patrimonios, getFilteredStats, filterPatrimonios])

  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      subMonths(new Date(), 5 - i),
    )
    const filteredPatrimonios = filterPatrimonios(patrimonios)
    
    return months.map((month) => {
      const monthStr = format(month, 'MMM')
      const aquisicoes = filteredPatrimonios.filter(
        (p) => {
          try {
            const data = new Date(p.dataAquisicao)
            if (isNaN(data.getTime())) return false
            return format(data, 'yyyy-MM') === format(month, 'yyyy-MM')
          } catch {
            return false
          }
        }
      ).length
      const baixas = filteredPatrimonios.filter(
        (p) => {
          try {
            if (!p.dataBaixa) return false
            const data = new Date(p.dataBaixa)
            if (isNaN(data.getTime())) return false
            return format(data, 'yyyy-MM') === format(month, 'yyyy-MM')
          } catch {
            return false
          }
        }
      ).length
      return { month: monthStr, aquisicoes, baixas }
    })
  }, [patrimonios, filterPatrimonios])

  const distributionData = useMemo(() => {
    const filteredPatrimonios = filterPatrimonios(patrimonios)
    const data = filteredPatrimonios.reduce(
      (acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ]
    return Object.entries(data)
      .map(([name, value], index) => ({
        name,
        value,
        fill: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [patrimonios])

  const topSetores = useMemo(() => {
    const data = patrimonios.reduce(
      (acc, p) => {
        const setor = p.setor_responsavel || p.setorResponsavel
        acc[setor] = (acc[setor] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [patrimonios, filterPatrimonios])

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
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
        {!accessInfo.canViewAllData && (
          <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-2 rounded-lg">
            📊 Visualizando dados dos setores: {accessInfo.userSectors.join(', ') || 'Nenhum setor atribuído'}
          </div>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statsCards.map((card) => (
          <Card
            key={card.title}
            className="hover:shadow-elevation transition-shadow duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-2">
              <CardTitle className="text-base md:text-lg lg:text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 md:h-4 md:w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-3xl md:text-4xl lg:text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Evolução Patrimonial (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={{}} className="h-[300px] w-full min-w-[400px]">
              <ComposedChart data={evolutionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={50} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="aquisicoes"
                  fill="hsl(var(--chart-1))"
                  name="Aquisições"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="baixas"
                  stroke="hsl(var(--chart-4))"
                  name="Baixas"
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={{}} className="h-[300px] w-full min-w-[250px]">
              <PieChart>
                <Tooltip content={<ChartTooltipContent />} />
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
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
                {patrimonios
                  .filter(p => p.status === 'manutencao' || p.situacaoBem === 'RUIM' || p.situacaoBem === 'PÉSSIMO')
                  .slice(0, 5)
                  .map((patrimonio) => (
                    <TableRow key={patrimonio.id}>
                      <TableCell className="font-medium">{patrimonio.numeroPatrimonio}</TableCell>
                      <TableCell>{patrimonio.descricaoBem}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            patrimonio.status === 'manutencao'
                              ? 'default'
                              : 'destructive'
                          }
                          className="flex items-center gap-1"
                        >
                          {patrimonio.status === 'manutencao' ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {patrimonio.status === 'manutencao' ? 'Manutenção' : patrimonio.situacaoBem}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                {patrimonios.filter(p => p.status === 'manutencao' || p.situacaoBem === 'RUIM' || p.situacaoBem === 'PÉSSIMO').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum alerta encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Top 5 Setores por Quantidade de Bens</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ChartContainer config={{}} className="h-[250px] w-full min-w-[300px]">
              <BarChart
                layout="vertical"
                data={topSetores}
                margin={{ top: 5, right: 10, left: 100, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} width={50} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tick={{ fontSize: 10 }}
                  angle={0}
                  textAnchor="end"
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--chart-2))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
