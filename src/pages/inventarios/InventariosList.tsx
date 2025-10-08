import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Trash2, Eye, Edit, Printer } from 'lucide-react'
import { useInventory } from '@/contexts/InventoryContext'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'

export default function InventariosList() {
  const { inventories, deleteInventory } = useInventory()
  const { user } = useAuth()
  const [locationFilter, setLocationFilter] = useState<string | null>(null)

  const locationOptions = useMemo(() => {
    const locations = new Set(
      inventories
        .map((inv) => inv.locationType)
        .filter((loc): loc is string => !!loc),
    )
    return Array.from(locations).map((loc) => ({ value: loc, label: loc }))
  }, [inventories])

  const filteredInventories = useMemo(() => {
    let data = [...inventories]
    if (locationFilter) {
      data = data.filter((inv) => inv.locationType === locationFilter)
    }
    return data.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [inventories, locationFilter])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciamento de Inventários</h1>
        <Button asChild>
          <Link to="/inventarios/novo">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Inventário
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventários</CardTitle>
          <CardDescription>
            Visualize e gerencie os inventários realizados.
          </CardDescription>
          <div className="pt-4">
            <SearchableSelect
              options={locationOptions}
              value={locationFilter}
              onChange={setLocationFilter}
              placeholder="Filtrar por Local do Bem..."
              isClearable
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventories.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.name}</TableCell>
                  <TableCell>{inv.sectorName}</TableCell>
                  <TableCell>
                    {inv.scope === 'location'
                      ? `Local: ${inv.locationType}`
                      : inv.scope === 'specific_location'
                      ? `Local Específico: ${inv.specificLocationId}`
                      : 'Todo o Setor'}
                  </TableCell>
                  <TableCell>{formatDate(inv.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inv.status === 'completed' ? 'default' : 'secondary'
                      }
                    >
                      {inv.status === 'completed'
                        ? 'Concluído'
                        : 'Em Andamento'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to={
                            inv.status === 'completed'
                              ? `/inventarios/resumo/${inv.id}`
                              : `/inventarios/${inv.id}`
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {inv.status === 'completed' ? 'Ver' : 'Continuar'}
                        </Link>
                      </Button>
                      
                      {/* Botão de Editar - disponível para inventários em andamento */}
                      {inv.status === 'in_progress' && (user?.role === 'admin' || user?.role === 'supervisor') && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/inventarios/editar/${inv.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </Button>
                      )}
                      
                      {/* Botão de Imprimir - disponível para inventários finalizados */}
                      {inv.status === 'completed' && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/inventarios/imprimir/${inv.id}`}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir
                          </Link>
                        </Button>
                      )}
                      
                      {/* Botão de Excluir - disponível para admins e supervisores */}
                      {(user?.role === 'admin' || user?.role === 'supervisor') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O inventário será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInventory(inv.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
