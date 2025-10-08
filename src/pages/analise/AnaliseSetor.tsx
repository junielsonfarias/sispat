import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltipContent,
  ChartTooltip,
} from '@/components/ui/chart'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useSectors } from '@/contexts/SectorContext'
import { MultiSelect } from '@/components/ui/multi-select'
import { formatCurrency } from '@/lib/utils'

const AnaliseSetor = () => {
  const { patrimonios } = usePatrimonio()
  const { sectors } = useSectors()
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])

  const sectorOptions = useMemo(
    () => sectors.map((s) => ({ value: s.name, label: s.name })),
    [sectors],
  )

  const sectorStats = useMemo(() => {
    return selectedSectors.map((sectorName) => {
      const sectorPatrimonios = patrimonios.filter(
        (p) => (p.setor_responsavel || p.setorResponsavel) === sectorName,
      )
      const totalValue = sectorPatrimonios.reduce(
        (acc, p) => acc + (p.valor_aquisicao || p.valorAquisicao || 0),
        0,
      )
      return {
        name: sectorName,
        totalBens: sectorPatrimonios.length,
        totalValue,
      }
    })
  }, [selectedSectors, patrimonios])

  const radarData = useMemo(() => {
    const subjects = [
      'Qtd. Bens',
      'Valor Total',
      'Diversidade de Tipos',
      'Conservação Média',
    ]
    const data = subjects.map((subject) => ({ subject }))

    sectorStats.forEach((stat) => {
      const sectorPatrimonios = patrimonios.filter(
        (p) => (p.setor_responsavel || p.setorResponsavel) === stat.name,
      )
      const diversity = new Set(sectorPatrimonios.map((p) => p.tipo)).size
      const conservationMap = {
        OTIMO: 5,
        BOM: 4,
        REGULAR: 3,
        RUIM: 2,
        PESSIMO: 1,
      }
      const totalConservation = sectorPatrimonios.reduce(
        (acc, p) => acc + (conservationMap[p.situacao_bem || p.situacaoBem] || 0),
        0,
      )
      const avgConservation =
        sectorPatrimonios.length > 0
          ? totalConservation / sectorPatrimonios.length
          : 0

      data[0][stat.name] = stat.totalBens
      data[1][stat.name] = stat.totalValue
      data[2][stat.name] = diversity
      data[3][stat.name] = avgConservation
    })

    return data
  }, [sectorStats, patrimonios])

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
            <BreadcrumbPage>Análise por Setor</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Análise por Setor</h1>
        <div className="w-96">
          <MultiSelect
            options={sectorOptions}
            selected={selectedSectors}
            onChange={setSelectedSectors}
            placeholder="Selecione os setores para comparar"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sectorStats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader>
              <CardTitle>{stat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.totalBens} bens</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(stat.totalValue)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Indicadores</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[400px] w-full">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {selectedSectors.map((sectorName, index) => (
                <Radar
                  key={sectorName}
                  name={sectorName}
                  dataKey={sectorName}
                  stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                  fillOpacity={0.6}
                />
              ))}
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnaliseSetor
