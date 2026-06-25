import { useMemo } from 'react'
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from '@/lib/recharts-compat'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { usePatrimonioStats } from '@/hooks/queries/use-patrimonio-stats'

const STATUS_CONFIG: Record<string, { label: string; fill: string }> = {
  ativo:      { label: 'Ativo',       fill: 'hsl(var(--chart-2))' },
  manutencao: { label: 'Manutenção',  fill: 'hsl(var(--chart-3))' },
  inativo:    { label: 'Inativo',     fill: 'hsl(var(--muted))'   },
  baixado:    { label: 'Baixado',     fill: 'hsl(var(--chart-4))' },
}

/** Garante que todos os status aparecem no gráfico, mesmo com quantidade 0. */
const DEFAULT_STATUSES = ['ativo', 'manutencao', 'inativo', 'baixado']

export const StatusChartWidget = () => {
  const { data: stats, isLoading, isError } = usePatrimonioStats()

  const statusChartData = useMemo(() => {
    if (!stats) {
      return DEFAULT_STATUSES.map((s) => ({
        name: STATUS_CONFIG[s]?.label ?? s,
        value: 0,
        fill: STATUS_CONFIG[s]?.fill ?? 'hsl(var(--muted))',
      }))
    }

    // Índice rápido por status vindo do backend
    const countByStatus = Object.fromEntries(
      stats.porStatus.map(({ status, quantidade }) => [status, quantidade]),
    )

    return DEFAULT_STATUSES.map((s) => ({
      name: STATUS_CONFIG[s]?.label ?? s,
      value: countByStatus[s] ?? 0,
      fill: STATUS_CONFIG[s]?.fill ?? 'hsl(var(--muted))',
    }))
  }, [stats])

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  if (isError) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground">
        Não foi possível carregar o gráfico de status.
      </div>
    )
  }

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
