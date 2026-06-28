import { Patrimonio } from '@/types'
import { format } from 'date-fns'
import { patrimonioFields } from './report-utils'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

type ExportableColumn = {
  key: keyof Patrimonio
  label: string
}

const getColumnValue = (item: Patrimonio, key: keyof Patrimonio): string => {
  const value = item[key]

  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return format(value, 'dd/MM/yyyy')
  }

  if (typeof value === 'string') {
    // Só trata como data se PARECER ISO (YYYY-MM-DD...). Sem isso, strings como
    // "2024" ou "2025-001" (numero_patrimonio) virariam datas erradas.
    if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(value)) {
      const parsedDate = new Date(value)
      if (!Number.isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'dd/MM/yyyy')
      }
    }
    return value
  }

  if (Array.isArray(value)) {
    return String(value.length)
  }

  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return String(value)
}

const downloadFile = (filename: string, blob: Blob) => {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportToCsv = (
  filename: string,
  data: Patrimonio[],
  columns: ExportableColumn[],
) => {
  if (data.length === 0 || columns.length === 0) {
    toast({
      variant: 'destructive',
      title: 'Exportação Falhou',
      description: 'Não há dados para exportar.',
    })
    return
  }

  const headers = columns.map((c) => c.label).join(',')
  const csvRows = [headers]

  for (const item of data) {
    const values = columns.map((col) => {
      const value = getColumnValue(item, col.key)
      const escaped = `"${String(value).replace(/"/g, '""')}"`
      return escaped
    })
    csvRows.push(values.join(','))
  }

  const csvString = csvRows.join('\n')
  const blob = new Blob([`\uFEFF${csvString}`], {
    type: 'text/csv;charset=utf-8;',
  })
  downloadFile(filename, blob)
}

export const exportToXlsx = async (
  filename: string,
  data: Patrimonio[],
  columns: ExportableColumn[],
) => {
  if (data.length === 0 || columns.length === 0) {
    toast({
      variant: 'destructive',
      title: 'Exportação Falhou',
      description: 'Não há dados para exportar.',
    })
    return
  }

  // xlsx (SheetJS) é lazy-loaded para não inflar o bundle inicial — mesmo
  // padrão de src/pages/PublicAssets.tsx. Gera um .xlsx binário REAL (Office
  // Open XML), não uma tabela HTML com MIME application/vnd.ms-excel (que faz
  // o Excel avisar que "o formato e a extensão não conferem").
  const XLSX = await import('xlsx')
  const headerLabels = columns.map((c) => c.label)
  const rows = data.map((item) => {
    const row: Record<string, string> = {}
    for (const col of columns) {
      row[col.label] = getColumnValue(item, col.key)
    }
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headerLabels })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados')
  XLSX.writeFile(workbook, filename)
}

export const exportToPdf = async (
  filename: string,
  data: Patrimonio[],
  columns: ExportableColumn[],
) => {
  if (data.length === 0 || columns.length === 0) {
    toast({
      variant: 'destructive',
      title: 'Exportação Falhou',
      description: 'Não há dados para exportar.',
    })
    return
  }

  try {
    // jspdf + jspdf-autotable lazy-loaded (mesmo padrão de PublicAssets.tsx).
    // autoTable gera uma TABELA real com bordas e paginação automática — antes
    // o conteúdo virava texto cru separado por " | " e ficava desalinhado.
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Relatório de Patrimônio', 14, 16)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22)
    doc.setTextColor(0, 0, 0)

    const head = [columns.map((c) => c.label)]
    const body = data.map((item) =>
      columns.map((col) => getColumnValue(item, col.key)),
    )

    autoTable(doc, {
      head,
      body,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
      tableWidth: 'auto',
      // Rodapé com numeração de página em cada página
      didDrawPage: (hookData) => {
        const pageSize = doc.internal.pageSize
        const pageHeight = pageSize.getHeight()
        const pageWidth = pageSize.getWidth()
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(
          `Página ${hookData.pageNumber}`,
          pageWidth - 14,
          pageHeight - 8,
          { align: 'right' },
        )
        doc.setTextColor(0, 0, 0)
      },
    })

    doc.save(filename)

    toast({
      title: 'Sucesso!',
      description: 'PDF gerado e baixado com sucesso.',
    })
  } catch (error) {
    logger.error('Erro ao gerar PDF:', error)
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: 'Falha ao gerar PDF. Tente novamente.',
    })
  }
}

export const getColumnsWithLabels = (
  columnKeys: (keyof Patrimonio)[],
): ExportableColumn[] => {
  return columnKeys
    .map((key) => {
      const field = patrimonioFields.find((f) => f.id === key)
      return field ? { key: field.id, label: field.label } : null
    })
    .filter((c): c is ExportableColumn => c !== null)
}

export const exportInBatches = async (
  data: Patrimonio[],
  columns: ExportableColumn[],
  format: 'csv' | 'xlsx',
  batchSize: number,
  filename: string,
) => {
  const totalBatches = Math.ceil(data.length / batchSize)
  toast({
    title: 'Exportação em Lotes Iniciada',
    description: `Exportando ${data.length} registros em ${totalBatches} lotes.`,
  })

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize
    const end = start + batchSize
    const batchData = data.slice(start, end)
    const batchFilename = `${filename}-lote-${i + 1}-de-${totalBatches}`

    await new Promise((resolve) => setTimeout(resolve, 500))

    if (format === 'csv') {
      exportToCsv(`${batchFilename}.csv`, batchData, columns)
    } else {
      await exportToXlsx(`${batchFilename}.xlsx`, batchData, columns)
    }

    toast({
      description: `Lote ${i + 1}/${totalBatches} exportado.`,
    })
  }

  toast({
    title: 'Exportação em Lotes Concluída',
    description: 'Todos os lotes foram exportados com sucesso.',
  })
}
