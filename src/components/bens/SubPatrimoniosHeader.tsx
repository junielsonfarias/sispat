import { Search, Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { SubPatrimonioStatus } from '@/types'

interface SubPatrimoniosHeaderProps {
  subPatrimoniosCount: number
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: SubPatrimonioStatus | 'all'
  onStatusFilterChange: (value: SubPatrimonioStatus | 'all') => void
  onOpenDialog: () => void
}

export function SubPatrimoniosHeader({
  subPatrimoniosCount,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenDialog,
}: SubPatrimoniosHeaderProps) {
  return (
    <CardHeader className="pb-4 px-6 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg lg:text-xl font-semibold text-gray-900">
            Sub-Patrimônios ({subPatrimoniosCount})
          </CardTitle>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar sub-patrimônios..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="baixado">Baixado</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onOpenDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>
    </CardHeader>
  )
}
