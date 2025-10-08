import { useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Printer, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { Patrimonio, Imovel } from '@/types'
import { useDebounce } from '@/hooks/use-debounce'
import { LabelPreview } from '@/components/LabelPreview'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { useLabelTemplates } from '@/contexts/LabelTemplateContext'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { useAuth } from '@/hooks/useAuth'
import { useImovel } from '@/contexts/ImovelContext'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

type Asset = (Patrimonio | Imovel) & { assetType: 'bem' | 'imovel' }

const GerarEtiquetas = () => {
  const { patrimonios } = usePatrimonio()
  const { imoveis } = useImovel()
  const { templates } = useLabelTemplates()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedItems, setSelectedItems] = useState<Asset[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || '',
  )
  const [assetType, setAssetType] = useState<'bem' | 'imovel'>('bem')
  const printRef = useRef<HTMLDivElement>(null)

  const templateOptions: SearchableSelectOption[] = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }))

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  )

  const combinedData: Asset[] = useMemo(() => {
    if (assetType === 'bem') {
      return patrimonios.map((p) => ({ ...p, assetType: 'bem' }))
    } else {
      return imoveis.map((i) => ({ ...i, assetType: 'imovel' }))
    }
  }, [patrimonios, imoveis, assetType])

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return combinedData
    return combinedData.filter(
      (p) =>
        (p.assetType === 'bem'
          ? (p as Patrimonio).descricao_bem
          : (p as Imovel).denominacao
        )
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        p.numero_patrimonio.includes(debouncedSearchTerm) ||
        (p.assetType === 'bem'
          ? (p as Patrimonio).setor_responsavel
          : (p as Imovel).setor
        )
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()),
    )
  }, [combinedData, debouncedSearchTerm])

  const handleSelectItem = (item: Asset, checked: boolean) => {
    setSelectedItems((prev) =>
      checked ? [...prev, item] : prev.filter((i) => i.id !== item.id),
    )
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && printRef.current) {
      printWindow.document.write(
        '<html><head><title>Imprimir Etiquetas</title>',
      )
      document.head
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((el) => {
          printWindow.document.head.appendChild(el.cloneNode(true))
        })
      printWindow.document.write('</head><body>')
      printWindow.document.write(printRef.current.innerHTML)
      printWindow.document.write('</body></html>')
      printWindow.document.close()
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }, 500)
      toast({ description: 'Preparando etiquetas para impressão.' })
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível abrir a janela de impressão.',
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/">Dashboard</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Gerar Etiquetas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Itens</CardTitle>
              <CardDescription>
                Escolha os itens para os quais deseja gerar etiquetas.
              </CardDescription>
              <div className="pt-4 space-y-4">
                <RadioGroup
                  value={assetType}
                  onValueChange={(v) => {
                    setAssetType(v as 'bem' | 'imovel')
                    setSelectedItems([])
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bem" id="bem" />
                    <Label htmlFor="bem">Bens Móveis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="imovel" id="imovel" />
                    <Label htmlFor="imovel">Imóveis</Label>
                  </div>
                </RadioGroup>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, descrição ou setor..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Nº Patrimônio</TableHead>
                      <TableHead>Descrição/Denominação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.some(
                              (i) => i.id === item.id,
                            )}
                            onCheckedChange={(checked) =>
                              handleSelectItem(item, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell>{item.numero_patrimonio}</TableCell>
                        <TableCell>
                          {assetType === 'bem'
                            ? (item as Patrimonio).descricao_bem
                            : (item as Imovel).denominacao}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 sticky top-24">
          <Card>
            <CardHeader>
              <CardTitle>Etiquetas para Impressão</CardTitle>
              <CardDescription>
                {selectedItems.length} etiqueta(s) selecionada(s).
              </CardDescription>
              <div className="pt-4 space-y-2">
                <SearchableSelect
                  options={templateOptions}
                  value={selectedTemplateId}
                  onChange={(value) =>
                    setSelectedTemplateId(value || templates[0]?.id || '')
                  }
                  placeholder="Selecione um modelo"
                />
                {user?.role === 'supervisor' && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/etiquetas/templates')}
                  >
                    <Settings className="mr-2 h-4 w-4" /> Gerenciar Modelos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedItems.length > 0 ? (
                <ScrollArea className="h-80 border rounded-md p-2">
                  <div className="space-y-2">
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                      >
                        <span>{item.numero_patrimonio}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleSelectItem(item, false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Nenhum item selecionado.
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={selectedItems.length === 0 || !selectedTemplate}
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" /> Imprimir Selecionadas
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <div className="hidden">
        <div ref={printRef} className="print:block">
          <style>{`
            @media print {
              @page { size: A4; margin: 1cm; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .label-sheet { display: grid; grid-template-columns: repeat(auto-fill, ${
                selectedTemplate?.width || 0
              }mm); grid-auto-rows: ${
                selectedTemplate?.height || 0
              }mm; gap: 4mm; page-break-inside: avoid; }
              .label-container { width: ${
                selectedTemplate?.width || 0
              }mm; height: ${
                selectedTemplate?.height || 0
              }mm; page-break-inside: avoid; border: 1px solid #ccc; overflow: hidden; }
            }
          `}</style>
          <div className="label-sheet">
            {selectedTemplate &&
              selectedItems.map((item) => (
                <div key={item.id} className="label-container">
                  <LabelPreview asset={item} template={selectedTemplate} />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GerarEtiquetas
