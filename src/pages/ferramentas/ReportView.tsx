import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PrintImage } from '@/components/ui/optimized-image'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useReportTemplates } from '@/contexts/ReportTemplateContext'
import { useAuth } from '@/hooks/useAuth'
import { patrimonioFields } from '@/lib/report-utils'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Patrimonio, ReportComponent, ReportTemplate } from '@/types'
import {
    LayoutTemplate,
    Loader2,
    Printer,
    ServerCrash,
    ZoomIn,
    ZoomOut,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const ReportView = () => {
  const { templateId } = useParams<{ templateId: string }>()
  const { getTemplateById } = useReportTemplates()
  const { patrimonios } = usePatrimonio()
  const { user } = useAuth()
  const { getMunicipalityById } = useMunicipalities()
  const [template, setTemplate] = useState<ReportTemplate | null | undefined>(
    undefined,
  )
  const reportRef = useRef<HTMLDivElement>(null)
  const [paperSize, setPaperSize] = useState('a4')
  const [orientation, setOrientation] = useState('portrait')
  const [zoom, setZoom] = useState(1)

  const municipality = useMemo(() => {
    if (user?.municipalityId) {
      return getMunicipalityById(user.municipalityId)
    }
    return null
  }, [user, getMunicipalityById])

  useEffect(() => {
    if (templateId) {
      const foundTemplate = getTemplateById(templateId)
      setTemplate(foundTemplate || null)
    }
  }, [templateId, getTemplateById])

  const getColumnValue = (item: Patrimonio, key: keyof Patrimonio) => {
    const value = item[key]
    if (value instanceof Date) return formatDate(value)
    if (typeof value === 'number' && key === 'valor_aquisicao')
      return formatCurrency(value)
    if (Array.isArray(value)) return String(value.length)
    return String(value ?? '')
  }

  const handlePrint = () => {
    window.print()
  }

  const renderComponent = (component: ReportComponent) => {
    const style = { ...component.styles }
    switch (component.type) {
      case 'HEADER':
        return (
          <div className="flex items-center justify-between mb-4" style={style}>
            <div className="flex items-center gap-4">
              <PrintImage
                src={municipality?.logoUrl}
                alt="Logo"
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold">{municipality?.name}</h1>
                <p>Relatório de Patrimônio</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p>Data: {formatDate(new Date())}</p>
              <p>Gerado em: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )
      case 'TABLE':
        return (
          <Table style={style}>
            <TableHeader>
              <TableRow>
                {template?.fields.map((fieldId) => (
                  <TableHead key={fieldId}>
                    {patrimonioFields.find((f) => f.id === fieldId)?.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {patrimonios.map((item) => (
                <TableRow key={item.id}>
                  {template?.fields.map((fieldId) => (
                    <TableCell key={`${item.id}-${fieldId}`}>
                      {getColumnValue(item, fieldId)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      case 'TEXT':
        return <p style={style}>{component.props?.content}</p>
      case 'FOOTER':
        return (
          <div className="text-center text-xs" style={style}>
            <p>Página 1 de 1 - {template?.name} - Gerado por SISPAT</p>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full bg-muted rounded-md">
            Componente '{component.type}' não implementado.
          </div>
        )
    }
  }

  if (template === undefined)
    return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />
  if (template === null)
    return (
      <div className="text-center mt-10">
        <ServerCrash className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Relatório não encontrado</h2>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb className="no-print">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link to="/relatorios">Relatórios</Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Visualizar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between no-print">
        <h1 className="text-xl font-bold">{template.name}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/relatorios/templates/editor/${template.id}`}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Design
            </Link>
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>
      <Card className="no-print">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={paperSize} onValueChange={setPaperSize}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="letter">Carta</SelectItem>
                <SelectItem value="legal">Ofício</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orientation} onValueChange={setOrientation}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Retrato</SelectItem>
                <SelectItem value="landscape">Paisagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <div
        className={cn(
          'p-8 bg-muted flex justify-center overflow-auto',
          `paper-${paperSize}`,
          orientation,
        )}
      >
        <div
          ref={reportRef}
          className="bg-white shadow-lg printable-area"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top' }}
        >
          <div className="p-8 report-grid">
            {template.layout.map((comp) => (
              <div
                key={comp.id}
                style={{
                  gridColumn: `span ${comp.w}`,
                  gridRow: `span ${comp.h}`,
                }}
              >
                {renderComponent(comp)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportView
