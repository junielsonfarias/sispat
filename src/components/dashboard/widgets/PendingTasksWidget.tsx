import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useInventory } from '@/contexts/InventoryContext'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Wrench, ClipboardList, ArrowRight } from 'lucide-react'

export const PendingTasksWidget = () => {
  const { patrimonios } = usePatrimonio()
  const { inventories } = useInventory()

  const maintenanceItems = patrimonios.filter((p) => p.status === 'manutencao')
  const inProgressInventories = inventories.filter(
    (i) => i.status === 'in_progress',
  )

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-sm mb-2 flex items-center">
          <Wrench className="h-4 w-4 mr-2" /> Bens em Manutenção
        </h4>
        {maintenanceItems.length > 0 ? (
          <ul className="space-y-2">
            {maintenanceItems.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center text-sm"
              >
                <span>
                  {item.numero_patrimonio} - {item.descricao_bem}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/bens-cadastrados/ver/${item.id}`}>
                    Ver <ArrowRight className="h-3 w-3 ml-1" />
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
          <ClipboardList className="h-4 w-4 mr-2" /> Inventários em Andamento
        </h4>
        {inProgressInventories.length > 0 ? (
          <ul className="space-y-2">
            {inProgressInventories.slice(0, 3).map((inv) => (
              <li
                key={inv.id}
                className="flex justify-between items-center text-sm"
              >
                <span>
                  {inv.name} - {inv.sectorName}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/inventarios/${inv.id}`}>
                    Continuar <ArrowRight className="h-3 w-3 ml-1" />
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
