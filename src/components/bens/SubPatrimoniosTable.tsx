import { CheckSquare, Square, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SubPatrimonio, SubPatrimonioStatus } from '@/types'

interface SubPatrimoniosTableProps {
  subPatrimonios: SubPatrimonio[]
  selectedItems: string[]
  onSelectAll: () => void
  onSelectItem: (id: string) => void
  onEdit: (subPatrimonio: SubPatrimonio) => void
  onDelete: (id: string) => void
  getStatusColor: (status: SubPatrimonioStatus) => string
}

export function SubPatrimoniosTable({
  subPatrimonios,
  selectedItems,
  onSelectAll,
  onSelectItem,
  onEdit,
  onDelete,
  getStatusColor,
}: SubPatrimoniosTableProps) {
  const allSelected = selectedItems.length === subPatrimonios.length

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="h-8 w-8 p-0"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            </TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead>Data de Criação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subPatrimonios.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                Nenhum sub-patrimônio encontrado
              </TableCell>
            </TableRow>
          ) : (
            subPatrimonios.map((subPatrimonio) => (
              <TableRow key={subPatrimonio.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectItem(subPatrimonio.id)}
                    className="h-8 w-8 p-0"
                  >
                    {selectedItems.includes(subPatrimonio.id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  {subPatrimonio.numero_subpatrimonio}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(subPatrimonio.status)}>
                    {subPatrimonio.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {subPatrimonio.localizacao_especifica || '-'}
                </TableCell>
                <TableCell>
                  {subPatrimonio.observacoes || '-'}
                </TableCell>
                <TableCell>
                  {subPatrimonio.created_at.toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(subPatrimonio)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(subPatrimonio.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
