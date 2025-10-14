import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { calculateDepreciation } from '@/lib/depreciation-utils'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSectors } from '@/contexts/SectorContext'
import { useAuth } from '@/hooks/useAuth'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { DateRange } from 'react-day-picker'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { FileText, FileSpreadsheet, Settings } from 'lucide-react'
import { ExportConfigDialog } from '@/components/bens/ExportConfigDialog'
import { Patrimonio } from '@/types'
import { exportInBatches, getColumnsWithLabels, exportToPdf, exportToXlsx, exportToCsv } from '@/lib/export-utils'
import { toast } from '@/hooks/use-toast'

const RelatoriosDepreciacao = () => {
  const { patrimonios } = usePatrimonio()
  const { sectors } = useSectors()
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [isExportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<
    'csv' | 'pdf' | 'xlsx' | null
  >(null)

  // ✅ Filtrar setores baseado em role e responsibleSectors
  const allowedSectors = useMemo(() => {
    if (!user) return []
    // Admin e Supervisor veem TODOS os setores
    if (user.role === 'admin' || user.role === 'supervisor') {
      return sectors.map((s) => ({ value: s.name, label: s.name }))
    }
    // Usuário normal vê apenas seus setores responsáveis
    const userSectors = user.responsibleSectors || []
    return sectors
      .filter((s) => userSectors.includes(s.name))
      .map((s) => ({ value: s.name, label: s.name }))
  }, [sectors, user])

  const sectorOptions: SearchableSelectOption[] = allowedSectors

  const filteredData = useMemo(() => {
    return patrimonios
      .filter((p) => {
        const dateMatch =
          !dateRange?.from ||
          (new Date(p.data_aquisicao || p.dataAquisicao) >= dateRange.from &&
            (!dateRange.to || new Date(p.data_aquisicao || p.dataAquisicao) <= dateRange.to))
        const sectorMatch =
          !selectedSector || (p.setor_responsavel || p.setorResponsavel) === selectedSector
        return dateMatch && sectorMatch
      })
      .map((p) => ({ ...p, depreciationInfo: calculateDepreciation(p) }))
  }, [patrimonios, dateRange, selectedSector])

  const summary = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => {
        acc.totalAcquisition += (item.valor_aquisicao || item.valorAquisicao || 0)
        acc.totalAccumulatedDepreciation +=
          item.depreciationInfo.accumulatedDepreciation
        acc.totalBookValue += item.depreciationInfo.bookValue
        return acc
      },
      {
        totalAcquisition: 0,
        totalAccumulatedDepreciation: 0,
        totalBookValue: 0,
      },
    )
  }, [filteredData])

  const openExportDialog = (format: 'csv' | 'pdf' | 'xlsx') => {
    setExportFormat(format)
    setExportDialogOpen(true)
  }

  const handleConfirmExport = async (
    selectedColumns: (keyof Patrimonio)[],
    batchConfig: { enabled: boolean; size: number },
  ) => {
    const columnsWithLabels = getColumnsWithLabels(selectedColumns)
    const filename = `relatorio-depreciacao-${
      new Date().toISOString().split('T')[0]
    }`

    if (batchConfig.enabled && exportFormat) {
      exportInBatches(
        filteredData,
        columnsWithLabels,
        exportFormat,
        batchConfig.size,
        filename,
      )
    } else if (exportFormat) {
      try {
        switch (exportFormat) {
          case 'pdf':
            await exportToPdf(`${filename}.pdf`, filteredData, columnsWithLabels)
            break
          case 'xlsx':
            exportToXlsx(`${filename}.xlsx`, filteredData, columnsWithLabels)
            break
          case 'csv':
            exportToCsv(`${filename}.csv`, filteredData, columnsWithLabels)
            break
          default:
            toast({ description: 'Formato de exportação não suportado.' })
        }
      } catch (error) {
        console.error('Erro na exportação:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha na exportação. Tente novamente.',
        })
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <Link to="/">Dashboard</Link>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Relatórios de Depreciação</h1>
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            <SearchableSelect
              options={sectorOptions}
              value={selectedSector}
              onChange={setSelectedSector}
              placeholder="Filtrar por setor..."
              isClearable
            />
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Depreciação</CardTitle>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExportDialog('pdf')}
            >
              <FileText className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExportDialog('xlsx')}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" /> Personalizar Colunas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Valor de Aquisição Total
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalAcquisition)}
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Depreciação Acumulada Total
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalAccumulatedDepreciation)}
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Valor Contábil Total
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalBookValue)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Bens</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Patrimônio</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor de Aquisição</TableHead>
                <TableHead>Depreciação Acumulada</TableHead>
                <TableHead>Valor Contábil</TableHead>
                <TableHead>Vida Útil Restante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.numero_patrimonio || item.numeroPatrimonio}</TableCell>
                  <TableCell>{item.descricao_bem || item.descricaoBem}</TableCell>
                  <TableCell>{formatCurrency(item.valor_aquisicao || item.valorAquisicao)}</TableCell>
                  <TableCell>
                    {formatCurrency(
                      item.depreciationInfo.accumulatedDepreciation,
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(item.depreciationInfo.bookValue)}
                  </TableCell>
                  <TableCell>
                    {(item.depreciationInfo.remainingLifeMonths / 12).toFixed(
                      1,
                    )}{' '}
                    anos
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ExportConfigDialog
        open={isExportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleConfirmExport}
        defaultColumns={[
          'numero_patrimonio',
          'descricao_bem',
          'valor_aquisicao',
        ]}
        exportFormat={exportFormat || ''}
      />
    </div>
  )
}

export default RelatoriosDepreciacao
