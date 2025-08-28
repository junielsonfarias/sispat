import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { patrimonioFields } from '@/lib/report-utils'
import { getImovelFields } from '@/lib/imovel-fields'
import { useImovelField } from '@/contexts/ImovelFieldContext'

interface PrintConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selectedFields: string[]) => void
  assetType: 'patrimonio' | 'imovel'
}

export const PrintConfigDialog = ({
  open,
  onOpenChange,
  onConfirm,
  assetType,
}: PrintConfigDialogProps) => {
  const { fields: imovelCustomFields } = useImovelField()
  const [printOption, setPrintOption] = useState('all')
  const [selectedFields, setSelectedFields] = useState<string[]>([])

  const allFields = useMemo(
    () =>
      assetType === 'imovel'
        ? getImovelFields(imovelCustomFields)
        : patrimonioFields,
    [assetType, imovelCustomFields],
  )

  useEffect(() => {
    if (printOption === 'all') {
      setSelectedFields(allFields.map((f) => f.id))
    } else {
      setSelectedFields([])
    }
  }, [printOption, allFields])

  const handleToggleField = (fieldId: string, checked: boolean) => {
    setSelectedFields((prev) =>
      checked ? [...prev, fieldId] : prev.filter((id) => id !== fieldId),
    )
  }

  const handleConfirmClick = () => {
    onConfirm(selectedFields)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imprimir Ficha de Cadastro</DialogTitle>
          <DialogDescription>
            Escolha quais informações deseja incluir na impressão.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <RadioGroup value={printOption} onValueChange={setPrintOption}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="print-all" />
              <Label htmlFor="print-all">Imprimir Todas as Informações</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="select" id="print-select" />
              <Label htmlFor="print-select">
                Selecionar Informações para Impressão
              </Label>
            </div>
          </RadioGroup>

          {printOption === 'select' && (
            <ScrollArea className="h-60 w-full rounded-md border p-4">
              <div className="space-y-2">
                {allFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field.id}`}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={(checked) =>
                        handleToggleField(field.id, !!checked)
                      }
                    />
                    <Label
                      htmlFor={`field-${field.id}`}
                      className="font-normal"
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmClick}>Confirmar e Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
