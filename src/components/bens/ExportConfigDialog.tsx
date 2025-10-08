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
import { Patrimonio, ExcelCsvTemplate } from '@/types'
import { useExcelCsvTemplates } from '@/contexts/ExcelCsvTemplateContext'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'

interface ExportConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (
    selectedColumns: (keyof Patrimonio)[],
    batchExport: { enabled: boolean; size: number },
  ) => void
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
  const { templates } = useExcelCsvTemplates()
  const [selectedColumns, setSelectedColumns] =
    useState<(keyof Patrimonio)[]>(defaultColumns)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  )
  const [batchExport, setBatchExport] = useState({
    enabled: false,
    size: 10000,
  })

  const templateOptions: SearchableSelectOption[] = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }))

  useEffect(() => {
    if (open) {
      setSelectedColumns(defaultColumns)
      setSelectedTemplateId(null)
    }
  }, [open, defaultColumns])

  useEffect(() => {
    const template = templates.find((t) => t.id === selectedTemplateId)
    if (template) {
      setSelectedColumns(template.columns.map((c) => c.key))
    }
  }, [selectedTemplateId, templates])

  const handleToggleColumn = (columnId: keyof Patrimonio, checked: boolean) => {
    setSelectedColumns((prev) =>
      checked ? [...prev, columnId] : prev.filter((id) => id !== columnId),
    )
  }

  const handleExportClick = () => {
    onExport(selectedColumns, batchExport)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Exportação</DialogTitle>
          <DialogDescription>
            Selecione as colunas e opções para o arquivo{' '}
            {exportFormat.toUpperCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Modelo de Exportação</Label>
            <SearchableSelect
              options={templateOptions}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              placeholder="Usar seleção manual"
              isClearable
            />
          </div>
          <div className="space-y-2">
            <Label>Colunas</Label>
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <div className="space-y-2">
                {patrimonioFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${field.id}`}
                      checked={selectedColumns.includes(field.id)}
                      onCheckedChange={(checked) =>
                        handleToggleColumn(field.id, !!checked)
                      }
                    />
                    <Label htmlFor={`col-${field.id}`} className="font-normal">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="batch-export"
                checked={batchExport.enabled}
                onCheckedChange={(checked) =>
                  setBatchExport((p) => ({ ...p, enabled: !!checked }))
                }
              />
              <Label htmlFor="batch-export">Exportar em Lotes</Label>
            </div>
            {batchExport.enabled && (
              <div className="pl-6 space-y-2">
                <Label htmlFor="batch-size">Tamanho do Lote</Label>
                <Input
                  id="batch-size"
                  type="number"
                  value={batchExport.size}
                  onChange={(e) =>
                    setBatchExport((p) => ({
                      ...p,
                      size: Number(e.target.value),
                    }))
                  }
                />
              </div>
            )}
          </div>
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
