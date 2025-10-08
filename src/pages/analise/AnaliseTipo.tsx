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
} from 'recharts'
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
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useSectors } from '@/contexts/SectorContext'
import { format, subMonths } from 'date-fns'

const AnaliseTipo = () => {
  const { patrimonios } = usePatrimonio()
  const { sectors } = useSectors()

  const allTypes = useMemo(
    () => [...new Set(patrimonios.map((p) => p.tipo))],
    [patrimonios],
  )

  const matrixData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {}
    sectors.forEach((sector) => {
      matrix[sector.name] = {}
      allTypes.forEach((type) => {
        matrix[sector.name][type] = 0
      })
    })

    patrimonios.forEach((p) => {
      const setor = p.setor_responsavel || p.setorResponsavel
      if (matrix[setor]) {
        matrix[setor][p.tipo] =
          (matrix[setor][p.tipo] || 0) + 1
      }
    })

    return Object.entries(matrix).map(([sector, types]) => ({
      sector,
      ...types,
    }))
  }, [patrimonios, sectors, allTypes])

  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      subMonths(new Date(), 5 - i),
    )
    return months.map((month) => {
      const monthStr = format(month, 'MMM/yy')
      const acquisitionsInMonth = patrimonios.filter(
        (p) =>
          format(new Date(p.data_aquisicao || p.dataAquisicao), 'yyyy-MM') ===
          format(month, 'yyyy-MM'),
      )
      const acquisitionsByType = acquisitionsInMonth.reduce(
        (acc, p) => {
          acc[p.tipo] = (acc[p.tipo] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
      return { month: monthStr, ...acquisitionsByType }
    })
  }, [patrimonios])

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
      <h1 className="text-2xl font-bold">Análise por Tipo de Bem</h1>
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
                <Tooltip content={<ChartTooltipContent />} />
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
