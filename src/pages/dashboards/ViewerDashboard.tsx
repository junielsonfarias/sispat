import { useMemo } from 'react'
import { Archive, CheckCircle, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pie, PieChart, Tooltip, Legend, Cell } from 'recharts'
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
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useSectors } from '@/contexts/SectorContext'

const ViewerDashboard = () => {
  const { patrimonios } = usePatrimonio()
  const { sectors } = useSectors()

  const stats = useMemo(() => {
    // Excluir bens baixados dos cálculos
    const patrimoniosAtivos = patrimonios.filter((p) => p.status !== 'baixado')
    const activeCount = patrimonios.filter((p) => p.status === 'ativo').length
    return {
      totalCount: patrimoniosAtivos.length,
      activeCount,
      sectorCount: sectors.length,
    }
  }, [patrimonios, sectors])

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
  ]

  const distributionData = useMemo(() => {
    const counts = patrimonios.reduce(
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
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length],
    }))
  }, [patrimonios])

  const recentPatrimonios = useMemo(
    () =>
      [...patrimonios]
        .sort(
          (a, b) => {
            try {
              const dateA = new Date(a.dataAquisicao).getTime()
              const dateB = new Date(b.dataAquisicao).getTime()
              if (isNaN(dateA) || isNaN(dateB)) return 0
              return dateB - dateA
            } catch {
              return 0
            }
          }
        )
        .slice(0, 5),
    [patrimonios],
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard de Consulta</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {statsCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-2">
              <CardTitle className="text-base md:text-lg lg:text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-3xl md:text-4xl lg:text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Distribuição Geral por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <PieChart>
                <Tooltip content={<ChartTooltipContent />} />
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
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
        <Card className="lg:col-span-2">
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
                {recentPatrimonios.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.numero_patrimonio || item.numeroPatrimonio}
                    </TableCell>
                    <TableCell>{item.descricao_bem || item.descricaoBem}</TableCell>
                    <TableCell>{item.setor_responsavel || item.setorResponsavel}</TableCell>
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
  )
}

export default ViewerDashboard
