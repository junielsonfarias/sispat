import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { PlusCircle } from 'lucide-react'

interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddWidgetDialog = ({
  open,
  onOpenChange,
}: AddWidgetDialogProps) => {
  const { availableWidgets, addWidget } = useDashboard()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Widget</DialogTitle>
          <DialogDescription>
            Selecione um widget para adicionar ao seu dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {availableWidgets.length > 0 ? (
            availableWidgets.map((widget) => (
              <div
                key={widget.component}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-semibold">{widget.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {widget.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    addWidget(widget.component)
                    onOpenChange(false)
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              Todos os widgets já foram adicionados.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
