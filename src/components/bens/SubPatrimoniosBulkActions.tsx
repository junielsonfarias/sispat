import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubPatrimonioStatus } from '@/types'

interface SubPatrimoniosBulkActionsProps {
  selectedCount: number
  onBulkStatusChange: (status: SubPatrimonioStatus) => void
  onExport: () => void
}

export function SubPatrimoniosBulkActions({
  selectedCount,
  onBulkStatusChange,
  onExport,
}: SubPatrimoniosBulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-blue-700">
          {selectedCount} item(s) selecionado(s)
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulkStatusChange('ativo')}
          >
            Marcar como Ativo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulkStatusChange('baixado')}
          >
            Marcar como Baixado
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulkStatusChange('manutencao')}
          >
            Marcar como Manutenção
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>
    </div>
  )
}
