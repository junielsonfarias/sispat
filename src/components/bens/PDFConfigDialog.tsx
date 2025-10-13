import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { FileText, CheckSquare, Square, Sparkles } from 'lucide-react'
import { api } from '@/services/http-api'

interface PDFConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (selectedSections: string[], templateId?: string) => void
  hasPhotos?: boolean
  hasObservations?: boolean
  hasDepreciation?: boolean
  isBaixado?: boolean
}

interface FichaTemplate {
  id: string
  name: string
  description?: string
  type: string
  isDefault: boolean
  isActive: boolean
}

interface Section {
  id: string
  label: string
  description: string
  required?: boolean
  condition?: boolean
}

export const PDFConfigDialog = ({
  open,
  onOpenChange,
  onGenerate,
  hasPhotos = false,
  hasObservations = false,
  hasDepreciation = false,
  isBaixado = false,
}: PDFConfigDialogProps) => {
  const [templates, setTemplates] = useState<FichaTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await api.get('/ficha-templates')
      const bensTemplates = (Array.isArray(response) ? response : []).filter(
        (t: FichaTemplate) => t.type === 'bens' && t.isActive
      )
      setTemplates(bensTemplates)
      // Selecionar template padrão automaticamente
      const defaultTemplate = bensTemplates.find((t: FichaTemplate) => t.isDefault)
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id)
      } else if (bensTemplates.length > 0) {
        setSelectedTemplateId(bensTemplates[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  const sections: Section[] = [
    {
      id: 'header',
      label: 'Cabeçalho',
      description: 'Logo e informações do município',
      required: true,
    },
    {
      id: 'numero',
      label: 'Número do Patrimônio',
      description: 'Número de identificação em destaque',
      required: true,
    },
    {
      id: 'identificacao',
      label: 'Identificação do Bem',
      description: 'Descrição, tipo, marca, modelo, cor, série',
      required: true,
    },
    {
      id: 'aquisicao',
      label: 'Dados de Aquisição',
      description: 'Data, valor, forma, nota fiscal, quantidade',
    },
    {
      id: 'localizacao',
      label: 'Localização',
      description: 'Setor responsável e local do objeto',
    },
    {
      id: 'status',
      label: 'Status e Situação',
      description: 'Status operacional e situação física',
    },
    {
      id: 'baixa',
      label: 'Informações de Baixa',
      description: 'Data e motivo da baixa',
      condition: isBaixado,
    },
    {
      id: 'depreciacao',
      label: 'Depreciação',
      description: 'Método, vida útil e valor residual',
      condition: hasDepreciation,
    },
    {
      id: 'observacoes',
      label: 'Observações',
      description: 'Observações adicionais sobre o bem',
      condition: hasObservations,
    },
    {
      id: 'fotos',
      label: 'Fotos do Bem',
      description: 'Até 6 fotos em grid organizado',
      condition: hasPhotos,
    },
    {
      id: 'sistema',
      label: 'Informações do Sistema',
      description: 'Datas de cadastro e atualização',
    },
    {
      id: 'rodape',
      label: 'Rodapé',
      description: 'Informações do SISPAT e timestamp',
    },
  ]

  // Filtrar seções baseado nas condições
  const availableSections = sections.filter(
    section => section.condition === undefined || section.condition === true
  )

  // Inicializar com todas as seções disponíveis selecionadas
  const [selectedSections, setSelectedSections] = useState<string[]>(
    availableSections.map(s => s.id)
  )

  const toggleSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (section?.required) return // Não permite desmarcar seções obrigatórias

    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const toggleAll = () => {
    if (selectedSections.length === availableSections.length) {
      // Desmarcar todos (exceto obrigatórios)
      setSelectedSections(
        availableSections.filter(s => s.required).map(s => s.id)
      )
    } else {
      // Marcar todos
      setSelectedSections(availableSections.map(s => s.id))
    }
  }

  const handleGenerate = () => {
    onGenerate(selectedSections, selectedTemplateId || undefined)
    onOpenChange(false)
  }

  const allSelected = selectedSections.length === availableSections.length
  const someSelected = selectedSections.length > 0 && !allSelected

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurar Ficha PDF
          </DialogTitle>
          <DialogDescription>
            Selecione o template e as seções que deseja incluir na ficha do bem.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Seleção de Template */}
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Template de Ficha</Label>
            </div>
            {loadingTemplates ? (
              <div className="text-sm text-muted-foreground">Carregando templates...</div>
            ) : templates.length > 0 ? (
              <>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  aria-label="Selecionar template de ficha"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault ? '(Padrão)' : ''}
                    </option>
                  ))}
                </select>
                {templates.find(t => t.id === selectedTemplateId)?.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {templates.find(t => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhum template disponível. Use o Gerenciador de Fichas para criar um.
              </div>
            )}
          </div>
          {/* Botão Selecionar/Desmarcar Todos */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
                className="h-8"
              >
                {allSelected ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Desmarcar Todos
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Selecionar Todos
                  </>
                )}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedSections.length} de {availableSections.length} selecionadas
            </div>
          </div>

          {/* Lista de Seções */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {availableSections.map((section, index) => (
                <div key={section.id}>
                  <div
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedSections.includes(section.id)
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/30 border-border'
                    } ${
                      section.required
                        ? 'opacity-75 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-primary/10'
                    }`}
                    onClick={() => !section.required && toggleSection(section.id)}
                  >
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                      disabled={section.required}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={section.id}
                        className={`font-medium cursor-pointer ${
                          section.required ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {section.label}
                        {section.required && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Obrigatório)
                          </span>
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  {index < availableSections.length - 1 && (
                    <Separator className="my-3" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedSections.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            Gerar Ficha PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
