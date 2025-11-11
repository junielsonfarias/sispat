import { Patrimonio } from '@/types'
import { format } from 'date-fns'
import { patrimonioFields } from './report-utils'
import { toast } from '@/hooks/use-toast'

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
    const parsedDate = new Date(value)
    if (!Number.isNaN(parsedDate.getTime())) {
      return format(parsedDate, 'dd/MM/yyyy')
    }
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

export const exportToXlsx = (
  filename: string,
  data: Patrimonio[],
  columns: ExportableColumn[],
) => {
  const headers = columns.map((c) => `<th>${c.label}</th>`).join('')
  const rows = data
    .map((item) => {
      const cells = columns
        .map((col) => `<td>${getColumnValue(item, col.key)}</td>`)
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Dados</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body>
    </html>
  `
  const blob = new Blob([template], { type: 'application/vnd.ms-excel' })
  downloadFile(filename, blob)
}

export const exportToPdf = async (
  filename: string,
  data: Patrimonio[],
  columns: ExportableColumn[],
) => {
  try {
    // Importar a função de PDF dinamicamente para evitar problemas de dependência
    const { generateReportPDF } = await import('./pdf-utils')
    
    // Criar conteúdo do relatório
    const headers = columns.map((c) => c.label).join(' | ')
    const rows = data
      .map((item) => {
        const values = columns
          .map((col) => getColumnValue(item, col.key))
          .join(' | ')
        return values
      })
      .join('\n')

    const content = `RELATÓRIO DE PATRIMÔNIO\n\n${headers}\n${rows}`

    await generateReportPDF(
      'Relatório de Patrimônio',
      content,
      filename,
      {
        title: 'RELATÓRIO DE PATRIMÔNIO',
        orientation: 'landscape',
        format: 'a4',
        includeDate: true,
        includeLogo: true
      }
    )

    toast({
      title: 'Sucesso!',
      description: 'PDF gerado e baixado com sucesso.',
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
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
      exportToXlsx(`${batchFilename}.xlsx`, batchData, columns)
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
