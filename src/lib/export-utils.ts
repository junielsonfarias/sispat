import { toast } from '@/hooks/use-toast'
import { Patrimonio } from '@/types'
import { format } from 'date-fns'
import { patrimonioFields } from './report-utils'

type ExportableColumn = {
  key: keyof Patrimonio
  label: string
}

const getColumnValue = (item: Patrimonio, key: keyof Patrimonio): string => {
  const value = item[key]
  if (value instanceof Date) {
    return format(value, 'dd/MM/yyyy')
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
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
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
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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

  try {
    // Importar XLSX dinamicamente para reduzir o bundle
    const XLSX = await import('xlsx')
    
    // Preparar dados para o Excel
    const excelData = data.map(item => {
      const row: any = {}
      columns.forEach(col => {
        const value = getColumnValue(item, col.key)
        row[col.label] = value
      })
      return row
    })

    // Criar workbook e worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Configurar largura das colunas
    const colWidths = columns.map(col => ({
      wch: Math.max(col.label.length, 15)
    }))
    worksheet['!cols'] = colWidths

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patrimônios')

    // Gerar arquivo
    XLSX.writeFile(workbook, filename)

    toast({
      title: 'Exportação Concluída',
      description: `Arquivo ${filename} gerado com sucesso!`,
    })
  } catch (error) {
    console.error('Erro na exportação XLSX:', error)
    toast({
      variant: 'destructive',
      title: 'Erro na Exportação',
      description: 'Falha ao gerar arquivo Excel. Tentando CSV...',
    })
    // Fallback para CSV
    exportToCsv(filename.replace('.xlsx', '.csv'), data, columns)
  }
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
    // Importar jsPDF dinamicamente
    const { jsPDF } = await import('jspdf')
    const autoTable = await import('jspdf-autotable')

    const doc = new jsPDF()

    // Título do relatório
    doc.setFontSize(16)
    doc.text('Relatório de Patrimônios', 14, 20)
    doc.setFontSize(10)
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30)

    // Preparar dados para a tabela
    const tableData = data.map(item => 
      columns.map(col => getColumnValue(item, col.key))
    )

    // Configurar cabeçalhos
    const headers = columns.map(col => col.label)

    // Gerar tabela
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    // Salvar arquivo
    doc.save(filename)

    toast({
      title: 'Exportação Concluída',
      description: `Arquivo ${filename} gerado com sucesso!`,
    })
  } catch (error) {
    console.error('Erro na exportação PDF:', error)
    toast({
      variant: 'destructive',
      title: 'Erro na Exportação',
      description: 'Falha ao gerar arquivo PDF. Tentando CSV...',
    })
    // Fallback para CSV
    exportToCsv(filename.replace('.pdf', '.csv'), data, columns)
  }
}

export const getColumnsWithLabels = (
  columnKeys: (keyof Patrimonio)[],
): ExportableColumn[] => {
  return columnKeys.map((key) => ({
    key,
    label: patrimonioFields[key] || key,
  }))
}

// Função para exportar com formatação avançada
export const exportWithAdvancedFormatting = async (
  format: 'xlsx' | 'pdf' | 'csv',
  filename: string,
  data: Patrimonio[],
  columns: ExportableColumn[],
  options?: {
    title?: string
    subtitle?: string
    includeCharts?: boolean
    customStyling?: boolean
  }
) => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm')
  const finalFilename = `${filename}_${timestamp}.${format}`

  switch (format) {
    case 'xlsx':
      await exportToXlsx(finalFilename, data, columns)
      break
    case 'pdf':
      await exportToPdf(finalFilename, data, columns)
      break
    case 'csv':
      exportToCsv(finalFilename, data, columns)
      break
    default:
      throw new Error(`Formato não suportado: ${format}`)
  }
}

// Função para exportar dados em lotes
export const exportInBatches = async (
  data: Patrimonio[],
  columns: ExportableColumn[],
  format: 'xlsx' | 'pdf' | 'csv',
  batchSize: number,
  filenameBase: string
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
    const totalBatches = Math.ceil(data.length / batchSize)
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm')

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize
      const end = Math.min(start + batchSize, data.length)
      const batchData = data.slice(start, end)
      
      const filename = `${filenameBase}_lote-${i + 1}-de-${totalBatches}_${timestamp}.${format}`
      
      switch (format) {
        case 'xlsx':
          await exportToXlsx(filename, batchData, columns)
          break
        case 'pdf':
          await exportToPdf(filename, batchData, columns)
          break
        case 'csv':
          exportToCsv(filename, batchData, columns)
          break
        default:
          throw new Error(`Formato não suportado: ${format}`)
      }

      // Pequeno delay entre lotes para não sobrecarregar o navegador
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    toast({
      title: 'Exportação em Lotes Concluída',
      description: `${totalBatches} arquivo(s) gerado(s) com sucesso!`,
    })
  } catch (error) {
    console.error('Erro na exportação em lotes:', error)
    toast({
      variant: 'destructive',
      title: 'Erro na Exportação',
      description: 'Falha ao exportar dados em lotes.',
    })
  }
}

// Função para gerar relatórios agendados
export const scheduleReport = async (
  reportConfig: {
    name: string
    format: 'xlsx' | 'pdf' | 'csv'
    columns: ExportableColumn[]
    filters: any
    schedule: 'daily' | 'weekly' | 'monthly'
    email?: string
  }
) => {
  try {
    const response = await fetch('/api/reports/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportConfig),
    })

    if (!response.ok) {
      throw new Error('Falha ao agendar relatório')
    }

    const result = await response.json()
    
    toast({
      title: 'Relatório Agendado',
      description: `Relatório "${reportConfig.name}" agendado com sucesso!`,
    })

    return result
  } catch (error) {
    console.error('Erro ao agendar relatório:', error)
    toast({
      variant: 'destructive',
      title: 'Erro ao Agendar',
      description: 'Falha ao agendar relatório.',
    })
    throw error
  }
}
