import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltipContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { calculateDepreciation } from '@/lib/depreciation-utils'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, Hourglass } from 'lucide-react'

const DepreciationDashboard = () => {
  const { patrimonios } = usePatrimonio()

  const processedData = useMemo(() => {
    // Excluir bens baixados do cálculo de depreciação
    const patrimoniosAtivos = patrimonios.filter(p => p.status !== 'baixado')
    return patrimoniosAtivos.map((p) => ({
      ...p,
      depreciationInfo: calculateDepreciation(p),
    }))
  }, [patrimonios])

  const summary = useMemo(() => {
    return processedData.reduce(
      (acc, item) => {
        acc.totalAcquisition += (item.valor_aquisicao || item.valorAquisicao || 0)
        acc.totalAccumulatedDepreciation +=
          item.depreciationInfo.accumulatedDepreciation
        acc.totalBookValue += item.depreciationInfo.bookValue
        if (item.depreciationInfo.isFullyDepreciated) {
          acc.fullyDepreciatedCount += 1
        }
        return acc
      },
      {
        totalAcquisition: 0,
        totalAccumulatedDepreciation: 0,
        totalBookValue: 0,
        fullyDepreciatedCount: 0,
      },
    )
  }, [processedData])

  const depreciationBySector = useMemo(() => {
    const bySector = processedData.reduce(
      (acc, item) => {
        const sector = item.setor_responsavel || item.setorResponsavel
        if (!acc[sector]) {
          acc[sector] = { accumulated: 0, bookValue: 0 }
        }
        acc[sector].accumulated += item.depreciationInfo.accumulatedDepreciation
        acc[sector].bookValue += item.depreciationInfo.bookValue
        return acc
      },
      {} as Record<string, { accumulated: number; bookValue: number }>,
    )
    return Object.entries(bySector).map(([name, values]) => ({
      name,
      ...values,
    }))
  }, [processedData])

  const nearingFullDepreciation = useMemo(() => {
    return processedData
      .filter(
        (p) =>
          !p.depreciationInfo.isFullyDepreciated &&
          p.depreciationInfo.remainingLifeMonths <= 12,
      )
      .sort(
        (a, b) =>
          a.depreciationInfo.remainingLifeMonths -
          b.depreciationInfo.remainingLifeMonths,
      )
      .slice(0, 5)
  }, [processedData])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard de Depreciação</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Depreciação Acumulada
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalAccumulatedDepreciation)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Contábil Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalBookValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Bens Totalmente Depreciados
            </CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.fullyDepreciatedCount}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Depreciação por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart data={depreciationBySector} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="accumulated"
                  stackId="a"
                  fill="hsl(var(--chart-2))"
                  name="Depreciação Acumulada"
                />
                <Bar
                  dataKey="bookValue"
                  stackId="a"
                  fill="hsl(var(--chart-1))"
                  name="Valor Contábil"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bens Próximos da Depreciação Total (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vida Útil Restante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nearingFullDepreciation.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        to={`/bens-cadastrados/ver/${item.id}`}
                        className="text-primary hover:underline"
                      >
                        {item.numero_patrimonio || item.numeroPatrimonio}
                      </Link>
                    </TableCell>
                    <TableCell>{item.descricao_bem || item.descricaoBem}</TableCell>
                    <TableCell>
                      {item.depreciationInfo.remainingLifeMonths} meses
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

export default DepreciationDashboard
