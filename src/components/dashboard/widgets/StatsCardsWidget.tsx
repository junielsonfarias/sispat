import { Archive, DollarSign, Wrench, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePatrimonioStats } from '@/hooks/queries/use-patrimonio-stats'
import { formatCurrency } from '@/lib/utils'

export const StatsCardsWidget = () => {
  const { data: stats, isLoading, isError } = usePatrimonioStats()

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">—</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total de Bens',
      value: stats.totalCount,
      icon: Archive,
      display: String(stats.totalCount),
    },
    {
      label: 'Valor Total',
      value: stats.totalValue,
      icon: DollarSign,
      display: formatCurrency(stats.totalValue),
    },
    {
      label: 'Em Manutenção',
      value: stats.maintenanceCount,
      icon: Wrench,
      display: String(stats.maintenanceCount),
    },
    {
      label: 'Bens Ativos',
      value: stats.ativosCount,
      icon: CheckCircle,
      display: String(stats.ativosCount),
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, icon: Icon, display }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{display}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
