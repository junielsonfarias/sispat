import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { patrimonioFields } from '@/lib/report-utils'
import { Patrimonio } from '@/types'

interface ExportConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (selectedColumns: (keyof Patrimonio)[]) => void
  defaultColumns: (keyof Patrimonio)[]
  exportFormat: string
}

export const ExportConfigDialog = ({
  open,
  onOpenChange,
  onExport,
  defaultColumns,
  exportFormat,
}: ExportConfigDialogProps) => {
  const [selectedColumns, setSelectedColumns] =
    useState<(keyof Patrimonio)[]>(defaultColumns)

  useEffect(() => {
    if (open) {
      setSelectedColumns(defaultColumns)
    }
  }, [open, defaultColumns])

  const handleToggleColumn = (columnId: keyof Patrimonio, checked: boolean) => {
    setSelectedColumns((prev) =>
      checked ? [...prev, columnId] : prev.filter((id) => id !== columnId),
    )
  }

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedColumns(patrimonioFields.map((field) => field.id))
    } else {
      setSelectedColumns([])
    }
  }

  const handleExportClick = () => {
    onExport(selectedColumns)
    onOpenChange(false)
  }

  const allSelected = selectedColumns.length === patrimonioFields.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Exportação</DialogTitle>
          <DialogDescription>
            Selecione as colunas que deseja incluir no arquivo{' '}
            {exportFormat.toUpperCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleToggleAll}
            />
            <Label htmlFor="select-all" className="font-medium">
              Selecionar Todas
            </Label>
          </div>
          <ScrollArea className="h-72 w-full rounded-md border p-4">
            <div className="space-y-2">
              {patrimonioFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedColumns.includes(field.id)}
                    onCheckedChange={(checked) =>
                      handleToggleColumn(field.id, !!checked)
                    }
                  />
                  <Label htmlFor={field.id} className="font-normal">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExportClick}>Exportar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
