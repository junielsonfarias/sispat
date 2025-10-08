import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building, DollarSign, Square } from 'lucide-react'
import { useImovel } from '@/contexts/ImovelContext'
import { formatCurrency } from '@/lib/utils'

export const ImoveisWidget = () => {
  const { imoveis } = useImovel()

  const stats = useMemo(() => {
    const totalValue = imoveis.reduce((acc, p) => acc + p.valor_aquisicao, 0)
    const totalArea = imoveis.reduce((acc, p) => acc + p.area_construida, 0)
    return {
      totalCount: imoveis.length,
      totalValue,
      totalArea,
    }
  }, [imoveis])

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Building className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Total de Imóveis</p>
            <p className="text-xl font-bold">{stats.totalCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg col-span-2">
          <DollarSign className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">
              Valor Total Estimado
            </p>
            <p className="text-xl font-bold">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <Square className="h-6 w-6 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">Área Construída Total</p>
          <p className="text-xl font-bold">
            {stats.totalArea.toLocaleString('pt-BR')} m²
          </p>
        </div>
      </div>
      <div className="mt-auto">
        <Button asChild className="w-full">
          <Link to="/imoveis">Gerenciar Imóveis</Link>
        </Button>
      </div>
    </div>
  )
}
