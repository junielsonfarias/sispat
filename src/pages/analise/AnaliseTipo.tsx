import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from '@/lib/recharts-compat'
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
import { useAllPatrimonios } from '@/hooks/queries/use-all-patrimonios'
import { useSectors } from '@/contexts/SectorContext'
import { useSectorFilter } from '@/hooks/useSectorFilter'
import { format, subMonths } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

const AnaliseTipo = () => {
  const { data: patrimonios = [], isLoading } = useAllPatrimonios()
  const { sectors } = useSectors()
  const { filterPatrimonios, accessInfo } = useSectorFilter()

  // ✅ CORREÇÃO: Filtrar patrimônios por setor do usuário
  const filteredPatrimonios = useMemo(() => filterPatrimonios(patrimonios), [patrimonios, filterPatrimonios])

  const allTypes = useMemo(
    () => [...new Set(filteredPatrimonios.map((p) => p.tipo))],
    [filteredPatrimonios],
  )

  const matrixData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {}
    sectors.forEach((sector) => {
      matrix[sector.name] = {}
      allTypes.forEach((type) => {
        matrix[sector.name][type] = 0
      })
    })

    filteredPatrimonios.forEach((p) => {
      const setor = p.setor_responsavel
      if (matrix[setor]) {
        matrix[setor][p.tipo] =
          (matrix[setor][p.tipo] || 0) + 1
      }
    })

    return Object.entries(matrix).map(([sector, types]) => ({
      sector,
      ...types,
    })) as Array<{ sector: string } & Record<string, number>>
  }, [filteredPatrimonios, sectors, allTypes])

  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      subMonths(new Date(), 5 - i),
    )
    return months.map((month) => {
      const monthStr = format(month, 'MMM/yy')
      const monthKey = format(month, 'yyyy-MM')
      const acquisitionsInMonth = filteredPatrimonios.filter((p) => {
        if (!p.data_aquisicao) return false
        const d = new Date(p.data_aquisicao)
        // Evita RangeError do date-fns com datas inválidas vindas do backend.
        if (Number.isNaN(d.getTime())) return false
        return format(d, 'yyyy-MM') === monthKey
      })
      const acquisitionsByType = acquisitionsInMonth.reduce(
        (acc, p) => {
          acc[p.tipo] = (acc[p.tipo] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
      return { month: monthStr, ...acquisitionsByType }
    })
  }, [filteredPatrimonios])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Análise por Tipo</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Análise por Tipo de Bem</h1>
        {!accessInfo.canViewAllData && (
          <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-2 rounded-lg">
            📊 Visualizando dados dos setores: {accessInfo.userSectors.join(', ') || 'Nenhum setor atribuído'}
          </div>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Matriz Tipo-Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  {allTypes.map((type) => (
                    <TableHead key={type} className="text-right">
                      {type}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.map((row) => (
                  <TableRow key={row.sector}>
                    <TableCell>{row.sector}</TableCell>
                    {allTypes.map((type) => (
                      <TableCell key={type} className="text-right">
                        {row[type] || 0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Aquisições por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent payload={[]} />} />
                <Legend />
                {allTypes.map((type, index) => (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stackId="1"
                    stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                    fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnaliseTipo
