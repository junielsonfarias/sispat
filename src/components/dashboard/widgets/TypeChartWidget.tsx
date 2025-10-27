import { useMemo } from 'react'
import { Pie, PieChart, Cell, Tooltip, Legend } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { usePatrimonio } from '@/hooks/usePatrimonio'

export const TypeChartWidget = () => {
  const { patrimonios } = usePatrimonio()

  const typeChartData = useMemo(() => {
    // Validação de dados
    if (!patrimonios || patrimonios.length === 0) {
      return []
    }

    const typeDistribution = patrimonios.reduce(
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
    
    return Object.entries(typeDistribution).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length],
    }))
  }, [patrimonios])

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
