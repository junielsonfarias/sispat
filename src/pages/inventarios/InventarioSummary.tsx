import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
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
import { useInventory } from '@/contexts/InventoryContext'
import { Inventory, Patrimonio } from '@/types'
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react'

export default function InventarioSummary() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { getInventoryById } = useInventory()
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const newlyMissing = location.state?.newlyMissing as Patrimonio[] | undefined

  useEffect(() => {
    if (id) {
      setInventory(getInventoryById(id)!)
    }
  }, [id, getInventoryById])

  if (!inventory) return null

  const foundCount = inventory.items.filter((i) => i.status === 'found').length
  const notFoundCount = inventory.items.length - foundCount

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resumo do Inventário</h1>
        <Button variant="outline" asChild>
          <Link to="/inventarios">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Lista
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{inventory.name}</CardTitle>
          <CardDescription>
            Setor: {inventory.sectorName} | Finalizado em:{' '}
            {new Date(inventory.finalizedAt!).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Encontrados</p>
              <p className="text-2xl font-bold">{foundCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Não Encontrados</p>
              <p className="text-2xl font-bold">{notFoundCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Novos Extraviados</p>
              <p className="text-2xl font-bold">{newlyMissing?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {newlyMissing && newlyMissing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bens com Status Alterado para "Extraviado"</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Patrimônio</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status Anterior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newlyMissing.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.numero_patrimonio || item.numeroPatrimonio}</TableCell>
                    <TableCell>{item.descricao_bem || item.descricaoBem}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
