import { useState, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { useTransfers } from '@/contexts/TransferContext'
import { TransferenciaStatus, TransferenciaType } from '@/types'
import { formatDate } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, FileDigit, Settings } from 'lucide-react'
import { ExportConfigDialog } from '@/components/bens/ExportConfigDialog'
import { Patrimonio } from '@/types'
import { exportInBatches, getColumnsWithLabels, exportToPdf, exportToXlsx, exportToCsv } from '@/lib/export-utils'
import { toast } from '@/hooks/use-toast'

const statusConfig: Record<
  TransferenciaStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
}

export default function TransferenciaReports() {
  const { transferencias } = useTransfers()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [typeFilter, setTypeFilter] = useState<'all' | TransferenciaType>('all')
  const [isExportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<
    'csv' | 'pdf' | 'xlsx' | null
  >(null)

  const filteredData = useMemo(() => {
    return transferencias.filter((t) => {
      const dateMatch =
        !dateRange?.from ||
        (new Date(t.dataSolicitacao) >= dateRange.from &&
          (!dateRange.to || new Date(t.dataSolicitacao) <= dateRange.to))
      const typeMatch = typeFilter === 'all' || t.type === typeFilter
      return dateMatch && typeMatch
    })
  }, [transferencias, dateRange, typeFilter])

  const openExportDialog = (format: 'csv' | 'pdf' | 'xlsx') => {
    setExportFormat(format)
    setExportDialogOpen(true)
  }

  const handleConfirmExport = async (
    selectedColumns: (keyof Patrimonio)[],
    batchConfig: { enabled: boolean; size: number },
  ) => {
    const columnsWithLabels = getColumnsWithLabels(selectedColumns)
    const filename = `relatorio-transferencias-${
      new Date().toISOString().split('T')[0]
    }`

    if (batchConfig.enabled && exportFormat) {
      exportInBatches(
        filteredData as any,
        columnsWithLabels,
        exportFormat,
        batchConfig.size,
        filename,
      )
    } else if (exportFormat) {
      try {
        switch (exportFormat) {
          case 'pdf':
            await exportToPdf(`${filename}.pdf`, filteredData as any, columnsWithLabels)
            break
          case 'xlsx':
            exportToXlsx(`${filename}.xlsx`, filteredData as any, columnsWithLabels)
            break
          case 'csv':
            exportToCsv(`${filename}.csv`, filteredData as any, columnsWithLabels)
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
      <h1 className="text-2xl font-bold">
        Relatório de Transferências e Doações
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <div className="flex gap-4 pt-4">
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as any)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="doacao">Doação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExportDialog('xlsx')}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar XLSX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExportDialog('pdf')}
            >
              <FileDigit className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" /> Personalizar Colunas
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patrimônio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    {t.patrimonioNumero} - {t.patrimonioDescricao}
                  </TableCell>
                  <TableCell className="capitalize">{t.type}</TableCell>
                  <TableCell>{t.setorOrigem}</TableCell>
                  <TableCell>
                    {t.setorDestino || t.destinatarioExterno}
                  </TableCell>
                  <TableCell>{formatDate(t.dataSolicitacao)}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[t.status].variant}>
                      {statusConfig[t.status].label}
                    </Badge>
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
          'setor_responsavel',
          'status',
        ]}
        exportFormat={exportFormat || ''}
      />
    </div>
  )
}
