import { useMemo } from 'react'
import { Archive, DollarSign, Wrench, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { Patrimonio } from '@/types'
import { formatCurrency } from '@/lib/utils'

export const StatsCardsWidget = () => {
  const { patrimonios } = usePatrimonio()

  const stats = useMemo(() => {
    // Validação de dados
    if (!patrimonios || patrimonios.length === 0) {
      return {
        totalCount: 0,
        totalValue: 0,
        maintenanceCount: 0,
        activeCount: 0,
      }
    }

    const totalValue = patrimonios.reduce(
      (acc, p) => {
        const valor = p.valor_aquisicao || p.valorAquisicao || 0
        const numValor = typeof valor === 'number' ? valor : parseFloat(valor) || 0
        return acc + numValor
      },
      0,
    )
    
    const statusCounts = patrimonios.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      },
      {} as Record<Patrimonio['status'], number>,
    )
    
    return {
      totalCount: patrimonios.length,
      totalValue,
      maintenanceCount: statusCounts.manutencao || 0,
      activeCount: statusCounts.ativo || 0,
    }
  }, [patrimonios])

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Bens</CardTitle>
          <Archive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.totalValue)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.maintenanceCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bens Ativos</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeCount}</div>
        </CardContent>
      </Card>
    </div>
  )
}
