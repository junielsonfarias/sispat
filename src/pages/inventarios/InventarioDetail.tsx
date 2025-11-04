import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { Progress } from '@/components/ui/progress'
import { useInventory } from '@/contexts/InventoryContext'
import { Inventory } from '@/types'
import { Check, X, Loader2 } from 'lucide-react'
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

export default function InventarioDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getInventoryById, updateInventoryItemStatus, finalizeInventory } =
    useInventory()
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)

  useEffect(() => {
    if (id) {
      const inv = getInventoryById(id)
      if (inv) {
        setInventory(inv)
      } else {
        navigate('/inventarios')
      }
    }
  }, [id, getInventoryById, navigate])

  const { foundCount, totalCount, progress } = useMemo(() => {
    if (!inventory) return { foundCount: 0, totalCount: 0, progress: 0 }
    const found = inventory.items.filter((i) => i.status === 'found').length
    const total = inventory.items.length
    return {
      foundCount: found,
      totalCount: total,
      progress: total > 0 ? (found / total) * 100 : 0,
    }
  }, [inventory])

  const handleStatusChange = (
    patrimonioId: string,
    status: 'found' | 'not_found',
  ) => {
    if (!id) return
    updateInventoryItemStatus(id, patrimonioId, status)
    setInventory(getInventoryById(id)!)
  }

  const handleFinalize = async () => {
    if (!id) return
    setIsFinalizing(true)
    const newlyMissing = await finalizeInventory(id)
    navigate(`/inventarios/resumo/${id}`, { state: { newlyMissing } })
  }

  if (!inventory) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{inventory.name}</CardTitle>
          <CardDescription>
            <div className="space-y-1">
              <div>
                <span className="font-semibold">Setor:</span>{' '}
                {inventory.sectorName || 'Não informado'}
              </div>
              {inventory.locationType && (
                <div>
                  <span className="font-semibold">Local:</span>{' '}
                  {inventory.locationType}
                </div>
              )}
              {inventory.scope && (
                <div>
                  <span className="font-semibold">Escopo:</span>{' '}
                  {inventory.scope === 'sector'
                    ? 'Todo o Setor'
                    : inventory.scope === 'location'
                    ? 'Por Tipo de Local'
                    : 'Local Específico'}
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={progress} className="flex-1" />
            <span className="text-sm font-medium">
              {foundCount} / {totalCount} ({progress.toFixed(0)}%)
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Itens do Inventário</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Patrimônio</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.items.map((item) => (
                <TableRow key={item.patrimonioId}>
                  <TableCell>{item.numero_patrimonio || item.numeroPatrimonio}</TableCell>
                  <TableCell>{item.descricao_bem || item.descricaoBem}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant={
                          item.status === 'found' ? 'default' : 'outline'
                        }
                        onClick={() =>
                          handleStatusChange(item.patrimonioId, 'found')
                        }
                      >
                        <Check className="mr-2 h-4 w-4" /> Encontrado
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          item.status === 'not_found'
                            ? 'destructive'
                            : 'outline'
                        }
                        onClick={() =>
                          handleStatusChange(item.patrimonioId, 'not_found')
                        }
                      >
                        <X className="mr-2 h-4 w-4" /> Não Encontrado
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isFinalizing}>Finalizar Inventário</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar Inventário?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. O status dos bens não encontrados será
                atualizado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalize}>
                {isFinalizing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
