import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useInventory } from '@/contexts/InventoryContext'
import { api } from '@/services/api-adapter'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Wrench, ClipboardList, ArrowRight } from 'lucide-react'

const MAX_ITEMS = 3

interface BemManutencao {
  id: string
  numero_patrimonio: string
  descricao_bem: string
}

export const PendingTasksWidget = () => {
  // Busca BARATA: só os 3 bens em manutenção (paginado no backend), em vez de
  // carregar todos os bens só para filtrar 3 no cliente.
  const { data: maintenanceItems = [], isLoading: loadingPatrimonios } = useQuery({
    queryKey: ['patrimonios-manutencao-preview', MAX_ITEMS],
    queryFn: async () => {
      const res = await api.get<{ patrimonios: BemManutencao[] }>(
        `/patrimonios?status=manutencao&limit=${MAX_ITEMS}`,
      )
      return res.patrimonios ?? []
    },
    staleTime: 2 * 60 * 1000,
  })
  const { inventories } = useInventory()

  const inProgressInventories = useMemo(
    () => inventories.filter((i) => i.status === 'in_progress').slice(0, MAX_ITEMS),
    [inventories],
  )

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-sm mb-2 flex items-center">
          <Wrench className="h-4 w-4 mr-2" aria-hidden="true" /> Bens em Manutenção
        </h4>
        {loadingPatrimonios ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : maintenanceItems.length > 0 ? (
          <ul className="space-y-2">
            {maintenanceItems.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center text-sm"
              >
                <span>
                  {item.numero_patrimonio} - {item.descricao_bem}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/bens-cadastrados/ver/${item.id}`}>
                    Ver <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum bem em manutenção.
          </p>
        )}
      </div>
      <div>
        <h4 className="font-medium text-sm mb-2 flex items-center">
          <ClipboardList className="h-4 w-4 mr-2" aria-hidden="true" /> Inventários em Andamento
        </h4>
        {inProgressInventories.length > 0 ? (
          <ul className="space-y-2">
            {inProgressInventories.map((inv) => (
              <li
                key={inv.id}
                className="flex justify-between items-center text-sm"
              >
                <span>
                  {inv.name} - {inv.sectorName}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/inventarios/${inv.id}`}>
                    Continuar <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum inventário em andamento.
          </p>
        )}
      </div>
    </div>
  )
}
