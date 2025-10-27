import { useMemo } from 'react'
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { Patrimonio } from '@/types'

export const StatusChartWidget = () => {
  const { patrimonios } = usePatrimonio()

  const statusChartData = useMemo(() => {
    // Validação de dados
    if (!patrimonios || patrimonios.length === 0) {
      return [
        { name: 'Ativo', value: 0, fill: 'hsl(var(--chart-2))' },
        { name: 'Manutenção', value: 0, fill: 'hsl(var(--chart-3))' },
        { name: 'Inativo', value: 0, fill: 'hsl(var(--muted))' },
        { name: 'Baixado', value: 0, fill: 'hsl(var(--chart-4))' },
      ]
    }

    const statusCounts = patrimonios.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      },
      {} as Record<Patrimonio['status'], number>,
    )
    
    return [
      {
        name: 'Ativo',
        value: statusCounts.ativo || 0,
        fill: 'hsl(var(--chart-2))',
      },
      {
        name: 'Manutenção',
        value: statusCounts.manutencao || 0,
        fill: 'hsl(var(--chart-3))',
      },
      {
        name: 'Inativo',
        value: statusCounts.inativo || 0,
        fill: 'hsl(var(--muted))',
      },
      {
        name: 'Baixado',
        value: statusCounts.baixado || 0,
        fill: 'hsl(var(--chart-4))',
      },
    ]
  }, [patrimonios])

  return (
    <ChartContainer config={{}} className="h-[300px] w-full">
      <BarChart data={statusChartData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {statusChartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
