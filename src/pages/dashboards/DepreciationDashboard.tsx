import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend } from '@/lib/recharts-compat'
import { useAllPatrimonios } from '@/hooks/queries/use-all-patrimonios'
import { calculateDepreciation } from '@/lib/depreciation-utils'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, Hourglass, ArrowLeft, AlertCircle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Estado de carregamento
// ---------------------------------------------------------------------------
const LoadingSkeleton = () => (
  <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando dashboard de depreciação">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-5 w-64" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Estado de erro
// ---------------------------------------------------------------------------
const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
    <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
    <div>
      <p className="text-lg font-semibold">Erro ao carregar dados de depreciação</p>
      <p className="text-sm text-muted-foreground mt-1">
        Não foi possível buscar os dados. Verifique sua conexão e tente novamente.
      </p>
    </div>
    <Button variant="outline" onClick={onRetry}>
      Tentar novamente
    </Button>
  </div>
)

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
const DepreciationDashboard = () => {
  const { data: patrimonios, isLoading, isError, refetch } = useAllPatrimonios()

  const processedData = useMemo(() => {
    if (!patrimonios) return []
    // Excluir bens baixados do cálculo de depreciação
    return patrimonios
      .filter((p) => p.status !== 'baixado')
      .map((p) => ({
        ...p,
        depreciationInfo: calculateDepreciation({
          valor_aquisicao: p.valor_aquisicao,
          data_aquisicao: p.data_aquisicao,
          vida_util_anos: p.vida_util_anos ?? 0,
          valor_residual: p.valor_residual ?? 0,
        }),
      }))
  }, [patrimonios])

  const summary = useMemo(() => {
    return processedData.reduce(
      (acc, item) => {
        acc.totalAcquisition += item.valor_aquisicao ?? 0
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
        const sector = item.setor_responsavel ?? 'Sem setor'
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

  // Render condicional — breadcrumb e header são mantidos fora para acessibilidade
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Depreciação</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Depreciação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise detalhada da depreciação dos bens patrimoniais
          </p>
        </div>
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para Visão Geral
          </Button>
        </Link>
      </div>

      {isLoading && <LoadingSkeleton />}

      {isError && <ErrorState onRetry={() => { void refetch() }} />}

      {!isLoading && !isError && (
        <>
          {/* Cards de resumo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Depreciação Acumulada
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                <Hourglass className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.fullyDepreciatedCount}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico + Tabela */}
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Depreciação por Setor</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <ChartContainer config={{}} className="h-[300px] w-full min-w-[300px]">
                  <BarChart
                    data={depreciationBySector}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 100, bottom: 5 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} width={50} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      angle={0}
                      textAnchor="end"
                    />
                    <Tooltip content={<ChartTooltipContent payload={[]} />} />
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
                {nearingFullDepreciation.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum bem com depreciação total prevista nos próximos 12 meses.
                  </p>
                ) : (
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
                              {item.numero_patrimonio}
                            </Link>
                          </TableCell>
                          <TableCell>{item.descricao_bem}</TableCell>
                          <TableCell>
                            {item.depreciationInfo.remainingLifeMonths} meses
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default DepreciationDashboard
