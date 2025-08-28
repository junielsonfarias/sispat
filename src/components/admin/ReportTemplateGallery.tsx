import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useReportTemplates } from '@/contexts/ReportTemplateContext'
import { ReportTemplate } from '@/types'

interface ReportTemplateGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: ReportTemplate) => void
}

export const ReportTemplateGallery = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: ReportTemplateGalleryProps) => {
  const { templates } = useReportTemplates()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Galeria de Modelos de Relatório</DialogTitle>
          <DialogDescription>
            Selecione um modelo para começar.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  onSelectTemplate(template)
                  onOpenChange(false)
                }}
              >
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
                    Visualização do Layout
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
