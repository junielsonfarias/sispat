import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { LabelPreview } from '@/components/LabelPreview'
import { Patrimonio } from '@/types'
import { Printer, Download, FileImage } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCustomization } from '@/contexts/CustomizationContext'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface LabelPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assets: Patrimonio[]
  templates: any[]
  defaultTemplate?: any
}

interface PrintOptions {
  template: any
  copies: number
  labelsPerPage: 'auto' | '1' | '2x2' | '2x3' | '3x4'
  showCutGuides: boolean
  showBorders: boolean
  orientation: 'portrait' | 'landscape'
  margin: number
}

export function LabelPrintDialog({
  open,
  onOpenChange,
  assets,
  templates,
  defaultTemplate,
}: LabelPrintDialogProps) {
  const { settings } = useCustomization()
  const [selectedTemplate, setSelectedTemplate] = useState<any>(
    templates.length > 0 ? (defaultTemplate || templates.find((t: any) => t.isDefault) || templates[0]) : null
  )
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    template: templates.length > 0 ? (defaultTemplate || templates.find((t: any) => t.isDefault) || templates[0]) : null,
    copies: 1,
    labelsPerPage: 'auto',
    showCutGuides: true,
    showBorders: false,
    orientation: 'portrait',
    margin: 5,
  })
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const previewRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Selecionar template padrão quando disponível
  useEffect(() => {
    if (open && templates.length > 0 && !selectedTemplate) {
      const defaultTpl = templates.find((t: any) => t.isDefault) || templates[0]
      if (defaultTpl) {
        setSelectedTemplate(defaultTpl)
        setPrintOptions((prev) => ({ ...prev, template: defaultTpl }))
      }
    }
  }, [open, templates, selectedTemplate])

  // Selecionar todos os assets por padrão e resetar ao fechar
  useEffect(() => {
    if (open && assets.length > 0 && selectedAssets.length === 0) {
      setSelectedAssets(assets.map((a) => a.id))
    }
    // Resetar seleção quando fechar o diálogo
    if (!open) {
      setSelectedAssets([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assets.length])

  // Calcular quantas etiquetas cabem na página
  const calculateLabelsPerPage = () => {
    if (!selectedTemplate) return { rows: 1, cols: 1, total: 1 }

    const templateWidth = selectedTemplate.width
    const templateHeight = selectedTemplate.height
    const pageWidth = printOptions.orientation === 'landscape' ? 297 : 210 // mm
    const pageHeight = printOptions.orientation === 'landscape' ? 210 : 297 // mm

    if (printOptions.labelsPerPage === 'auto') {
      const cols = Math.floor((pageWidth - printOptions.margin * 2) / (templateWidth + 2))
      const rows = Math.floor((pageHeight - printOptions.margin * 2) / (templateHeight + 2))
      return {
        rows: Math.max(1, rows),
        cols: Math.max(1, cols),
        total: Math.max(1, rows * cols),
      }
    }

    const [rows, cols] = printOptions.labelsPerPage.split('x').map(Number)
    return { rows, cols, total: rows * cols }
  }

  const { rows, cols, total: labelsPerPage } = calculateLabelsPerPage()
  const totalPages = Math.ceil((selectedAssets.length * printOptions.copies) / labelsPerPage)

  const handlePrint = async () => {
    if (!selectedTemplate) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum template de etiqueta selecionado. Selecione um template antes de imprimir.',
      })
      return
    }

    if (selectedAssets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione pelo menos um patrimônio para imprimir.',
      })
      return
    }

    const assetsToPrint = assets.filter((a) => selectedAssets.includes(a.id))
    if (assetsToPrint.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum patrimônio válido encontrado para impressão.',
      })
      return
    }

    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.',
      })
      return
    }

    printWindow.document.write('<!DOCTYPE html><html><head><title>Imprimir Etiquetas</title>')
    
    // Copiar estilos
    document.head
      .querySelectorAll('link[rel="stylesheet"], style')
      .forEach((el) => {
        printWindow.document.head.appendChild(el.cloneNode(true))
      })

    // Estilos de impressão
    const orientationStyle = printOptions.orientation === 'landscape' 
      ? 'size: A4 landscape;' 
      : 'size: A4;'

    printWindow.document.write(`
      <style>
        @media print {
          @page { 
            ${orientationStyle}
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            width: ${printOptions.orientation === 'landscape' ? '297mm' : '210mm'};
            min-height: ${printOptions.orientation === 'landscape' ? '210mm' : '297mm'};
            position: relative;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .labels-grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            grid-template-rows: repeat(${rows}, 1fr);
            gap: ${printOptions.margin}mm;
            padding: ${printOptions.margin}mm;
            width: 100%;
            height: 100%;
          }
          .label-item {
            width: ${selectedTemplate?.width || 60}mm;
            height: ${selectedTemplate?.height || 40}mm;
            position: relative;
            page-break-inside: avoid;
            ${printOptions.showBorders ? 'border: 1px solid #ccc;' : ''}
            ${printOptions.showCutGuides ? 'border: 1px dashed #999;' : ''}
            overflow: hidden;
          }
          .cut-guide {
            position: absolute;
            border: 1px dashed #999;
            pointer-events: none;
          }
        }
        @media screen {
          body {
            width: ${printOptions.orientation === 'landscape' ? '297mm' : '210mm'};
            min-height: ${printOptions.orientation === 'landscape' ? '210mm' : '297mm'};
            margin: 20px auto;
            background: #f0f0f0;
            padding: 20px;
          }
          .labels-grid {
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            grid-template-rows: repeat(${rows}, 1fr);
            gap: ${printOptions.margin}mm;
            background: white;
            padding: ${printOptions.margin}mm;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
        }
      </style>
    `)

    printWindow.document.write('</head><body><div class="labels-grid">')

    // Renderizar etiquetas
    if (selectedTemplate && selectedTemplate.elements) {
      for (let copy = 0; copy < printOptions.copies; copy++) {
        for (const asset of assetsToPrint) {
          // Criar container para etiqueta
          printWindow.document.write(`<div class="label-item">`)
          printWindow.document.write(`<div id="label-${asset.id}-${copy}" style="width: ${selectedTemplate.width * 4}px; height: ${selectedTemplate.height * 4}px; position: relative; background: white;">`)
          
          // Renderizar elementos do template
          selectedTemplate.elements.forEach((el: any) => {
          let content = ''
          if (el.type === 'LOGO') {
            content = `<img src="${settings?.activeLogoUrl || ''}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />`
          } else if (el.type === 'PATRIMONIO_FIELD') {
            const value = asset[el.content as keyof Patrimonio]
            content = String(value ?? 'N/A')
          } else if (el.type === 'TEXT') {
            content = el.content || ''
          } else if (el.type === 'QR_CODE') {
            // QR code será carregado via JavaScript
            content = `<div id="qr-${asset.id}-${copy}" style="width: 100%; height: 100%;"></div>`
          }

          printWindow.document.write(`
            <div style="position: absolute; left: ${el.x}%; top: ${el.y}%; width: ${el.width}%; height: ${el.height}%; font-size: ${el.fontSize}px; font-weight: ${el.fontWeight}; text-align: ${el.textAlign};">
              ${content}
            </div>
          `)
          })
          
          printWindow.document.write('</div></div>')
        }
      }
    } else {
      printWindow.document.write('<div style="padding: 20px; text-align: center; color: red;">Erro: Template não encontrado</div>')
    }

    printWindow.document.write('</div></body></html>')
    printWindow.document.close()

    // Aguardar carregamento e gerar QR codes
    setTimeout(async () => {
      if (printWindow.document) {
        // Gerar QR codes
        const { generatePatrimonioQRCode } = await import('@/lib/qr-code-utils')
        for (let copy = 0; copy < printOptions.copies; copy++) {
          for (const asset of assetsToPrint) {
            const qrElement = printWindow.document.getElementById(`qr-${asset.id}-${copy}`)
            if (qrElement) {
              try {
                const qrUrl = await generatePatrimonioQRCode(asset.numero_patrimonio, 'bem')
                qrElement.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;" />`
              } catch (error) {
                if (import.meta.env.DEV) {
                  console.error('Erro ao gerar QR code:', error)
                }
              }
            }
          }
        }

        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
          setTimeout(() => {
            printWindow.close()
            onOpenChange(false)
          }, 1000)
        }, 500)
      }
    }, 500)

    toast({
      title: 'Sucesso',
      description: `Preparando ${selectedAssets.length * printOptions.copies} etiqueta(s) para impressão...`,
    })
  }

  // Atalhos de teclado
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: Fechar
      if (e.key === 'Escape') {
        onOpenChange(false)
        return
      }

      // Ctrl+Enter ou Cmd+Enter: Imprimir
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (selectedAssets.length > 0 && selectedTemplate) {
          handlePrint()
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedAssets.length, selectedTemplate, onOpenChange])

  const handleExportPDF = async () => {
    if (!selectedTemplate) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum template de etiqueta selecionado.',
      })
      return
    }

    if (selectedAssets.length === 0 || !previewRef.current) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione pelo menos um patrimônio para exportar.',
      })
      return
    }

    setIsExporting(true)
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const pdf = new jsPDF({
        orientation: printOptions.orientation,
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.85)
      const imgWidth = printOptions.orientation === 'landscape' ? 297 : 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
      pdf.save(`etiquetas-${new Date().toISOString().split('T')[0]}.pdf`)

      toast({
        title: 'Sucesso',
        description: 'PDF exportado com sucesso!',
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao exportar PDF:', error)
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível exportar o PDF. Verifique se há patrimônios selecionados.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportImage = async () => {
    if (!selectedTemplate) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum template de etiqueta selecionado.',
      })
      return
    }

    if (selectedAssets.length === 0 || !previewRef.current) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione pelo menos um patrimônio para exportar.',
      })
      return
    }

    setIsExporting(true)
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `etiquetas-${new Date().toISOString().split('T')[0]}.png`
          link.click()
          URL.revokeObjectURL(url)

          toast({
            title: 'Sucesso',
            description: 'Imagem exportada com sucesso!',
          })
        }
      }, 'image/png')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao exportar imagem:', error)
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível exportar a imagem. Verifique se há patrimônios selecionados.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([])
    } else {
      setSelectedAssets(assets.map((a) => a.id))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imprimir Etiquetas em Lote</DialogTitle>
          <DialogDescription>
            Selecione os patrimônios e configure as opções de impressão.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de Seleção */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Selecionar Patrimônios</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedAssets.length === assets.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleAsset(asset.id)}
                  >
                    <Checkbox
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={() => toggleAsset(asset.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {asset.numero_patrimonio}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {asset.descricao_bem}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedAssets.length} de {assets.length} selecionado(s)
              </p>
            </div>

            {/* Configurações */}
            <div className="space-y-4">
              <div>
                <Label>Modelo de Etiqueta</Label>
                {templates.length === 0 ? (
                  <div className="text-sm text-red-600 p-2 border border-red-200 rounded bg-red-50">
                    Nenhum template disponível. Crie um template primeiro.
                  </div>
                ) : (
                  <Select
                    value={selectedTemplate?.id || ''}
                    onValueChange={(value) => {
                      const tpl = templates.find((t: any) => t.id === value)
                      if (tpl) {
                        setSelectedTemplate(tpl)
                        setPrintOptions((prev) => ({ ...prev, template: tpl }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.width}x{template.height}mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Número de Cópias</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={printOptions.copies}
                  onChange={(e) =>
                    setPrintOptions((prev) => ({
                      ...prev,
                      copies: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                />
              </div>

              <div>
                <Label>Etiquetas por Página</Label>
                <Select
                  value={printOptions.labelsPerPage}
                  onValueChange={(value: any) =>
                    setPrintOptions((prev) => ({ ...prev, labelsPerPage: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="1">1 por página</SelectItem>
                    <SelectItem value="2x2">2x2 (4 por página)</SelectItem>
                    <SelectItem value="2x3">2x3 (6 por página)</SelectItem>
                    <SelectItem value="3x4">3x4 (12 por página)</SelectItem>
                  </SelectContent>
                </Select>
                {printOptions.labelsPerPage === 'auto' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {rows}x{cols} = {labelsPerPage} por página
                  </p>
                )}
              </div>

              <div>
                <Label>Orientação</Label>
                <Select
                  value={printOptions.orientation}
                  onValueChange={(value: 'portrait' | 'landscape') =>
                    setPrintOptions((prev) => ({ ...prev, orientation: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Retrato</SelectItem>
                    <SelectItem value="landscape">Paisagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cut-guides"
                    checked={printOptions.showCutGuides}
                    onCheckedChange={(checked) =>
                      setPrintOptions((prev) => ({ ...prev, showCutGuides: !!checked }))
                    }
                  />
                  <Label htmlFor="cut-guides" className="cursor-pointer">
                    Mostrar Guias de Corte
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="borders"
                    checked={printOptions.showBorders}
                    onCheckedChange={(checked) =>
                      setPrintOptions((prev) => ({ ...prev, showBorders: !!checked }))
                    }
                  />
                  <Label htmlFor="borders" className="cursor-pointer">
                    Mostrar Bordas
                  </Label>
                </div>
              </div>

              <div>
                <Label>Margem (mm)</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={printOptions.margin}
                  onChange={(e) =>
                    setPrintOptions((prev) => ({
                      ...prev,
                      margin: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <Label>Prévia da Impressão</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                {!selectedTemplate ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Selecione um template de etiqueta para visualizar a prévia</p>
                  </div>
                ) : (
                  <>
                    <div
                      ref={previewRef}
                      className="mx-auto"
                      style={{
                        width: printOptions.orientation === 'landscape' ? '297mm' : '210mm',
                        minHeight: printOptions.orientation === 'landscape' ? '210mm' : '297mm',
                        background: 'white',
                        padding: `${printOptions.margin}mm`,
                      }}
                    >
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${cols}, 1fr)`,
                          gridTemplateRows: `repeat(${rows}, 1fr)`,
                          gap: `${printOptions.margin}mm`,
                        }}
                      >
                        {selectedAssets.slice(0, labelsPerPage).map((assetId) => {
                          const asset = assets.find((a) => a.id === assetId)
                          if (!asset || !selectedTemplate) return null
                          return (
                            <div
                              key={assetId}
                              style={{
                                width: `${selectedTemplate.width * 4}px`,
                                height: `${selectedTemplate.height * 4}px`,
                                border: printOptions.showCutGuides ? '1px dashed #999' : undefined,
                              }}
                            >
                              <LabelPreview
                                asset={{ ...asset, assetType: 'bem' }}
                                template={selectedTemplate}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Prévia: {totalPages} página(s) • {selectedAssets.length * printOptions.copies} etiqueta(s) total
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handlePrint} 
                className="flex-1"
                disabled={!selectedTemplate || selectedAssets.length === 0 || isExporting}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir ({selectedAssets.length * printOptions.copies})
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportPDF}
                disabled={!selectedTemplate || selectedAssets.length === 0 || isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportImage}
                disabled={!selectedTemplate || selectedAssets.length === 0 || isExporting}
              >
                <FileImage className="mr-2 h-4 w-4" />
                PNG
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

