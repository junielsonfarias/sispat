import { useMemo } from 'react'
import { Pie, PieChart, Cell, Tooltip, Legend } from '@/lib/recharts-compat'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { usePatrimonioStats } from '@/hooks/queries/use-patrimonio-stats'

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export const TypeChartWidget = () => {
  const { data: stats, isLoading, isError } = usePatrimonioStats()

  const typeChartData = useMemo(() => {
    if (!stats || stats.porTipo.length === 0) return []

    return stats.porTipo.map(({ tipo, quantidade }, index) => ({
      name: tipo,
      value: quantidade,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }, [stats])

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  if (isError) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground">
        Não foi possível carregar o gráfico por tipo.
      </div>
    )
  }

  if (typeChartData.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground">
        Nenhum dado de tipo disponível.
      </div>
    )
  }

  return (
    <ChartContainer config={{}} className="h-[300px] w-full">
      <PieChart>
        <Tooltip content={<ChartTooltipContent />} />
        <Pie
          data={typeChartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
        >
          {typeChartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Legend />
      </PieChart>
    </ChartContainer>
  )
}
