import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MUNICIPALITY_NAME } from '@/config/municipality'

export interface PDFOptions {
  title: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter'
  margin?: number
  includeDate?: boolean
  includeLogo?: boolean
  logoUrl?: string
}

export interface InventoryPDFData {
  inventoryName: string
  sectorName: string
  scope: string
  locationType?: string
  createdAt: Date
  finalizedAt?: Date
  status: string
  totalItems: number
  foundCount: number
  notFoundCount: number
  items: Array<{
    numero_patrimonio: string
    descricao_bem: string
    status: string
  }>
}

/**
 * Gera um PDF a partir de um elemento HTML
 */
export const generatePDFFromElement = async (
  elementId: string,
  filename: string,
  options: PDFOptions = { title: 'Relatório' }
): Promise<void> => {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Elemento não encontrado')
    }

    // Configurar opções do html2canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4',
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const margin = options.margin || 20
    const contentWidth = pdfWidth - (margin * 2)
    const contentHeight = pdfHeight - (margin * 2)

    // Calcular dimensões da imagem
    const imgWidth = contentWidth
    const imgHeight = (canvas.height * contentWidth) / canvas.width

    // Adicionar cabeçalho se especificado
    if (options.title || options.subtitle) {
      addPDFHeader(pdf, options)
    }

    // Adicionar imagem
    let yPosition = margin + (options.title ? 30 : 0)
    
    if (imgHeight > contentHeight - (options.title ? 30 : 0)) {
      // Se a imagem for muito alta, dividir em páginas
      const pageHeight = contentHeight - (options.title ? 30 : 0)
      const totalPages = Math.ceil(imgHeight / pageHeight)
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage()
          yPosition = margin
        }
        
        const sourceY = (canvas.height / totalPages) * i
        const sourceHeight = canvas.height / totalPages
        
        // Criar canvas temporário para a página
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        tempCanvas.width = canvas.width
        tempCanvas.height = sourceHeight
        
        if (tempCtx) {
          tempCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          )
          
          const tempImgData = tempCanvas.toDataURL('image/png')
          pdf.addImage(tempImgData, 'PNG', margin, yPosition, imgWidth, pageHeight)
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
    }

    // Adicionar rodapé
    addPDFFooter(pdf, options)

    // Salvar o PDF
    pdf.save(filename)
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    throw new Error('Falha ao gerar PDF')
  }
}

/**
 * Gera um PDF de inventário com layout personalizado
 */
export const generateInventoryPDF = async (
  data: InventoryPDFData,
  filename: string,
  options: PDFOptions = { title: 'Relatório de Inventário' }
): Promise<void> => {
  try {
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4',
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const margin = options.margin || 20
    let yPosition = margin

    // Cabeçalho
    if (options.includeLogo && options.logoUrl) {
      // Adicionar logo (simulado por texto por enquanto)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(MUNICIPALITY_NAME, margin, yPosition)
      yPosition += 10
    }

    // Título
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text(options.title, margin, yPosition)
    yPosition += 15

    if (options.subtitle) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.text(options.subtitle, margin, yPosition)
      yPosition += 10
    }

    // Informações do inventário
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Informações do Inventário', margin, yPosition)
    yPosition += 8

    pdf.setFont('helvetica', 'normal')
    const infoData = [
      ['Nome:', data.inventoryName],
      ['Setor:', data.sectorName],
      ['Escopo:', data.scope === 'sector' ? 'Todo o Setor' : `Local: ${data.locationType}`],
      ['Data de Criação:', format(data.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })],
      ['Data de Finalização:', data.finalizedAt ? format(data.finalizedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Não finalizado'],
      ['Status:', data.status === 'completed' ? 'Concluído' : 'Em Andamento'],
    ]

    infoData.forEach(([label, value]) => {
      pdf.text(`${label} ${value}`, margin, yPosition)
      yPosition += 6
    })

    yPosition += 10

    // Resumo estatístico
    pdf.setFont('helvetica', 'bold')
    pdf.text('Resumo Estatístico', margin, yPosition)
    yPosition += 8

    pdf.setFont('helvetica', 'normal')
    const statsData = [
      ['Total de Itens:', data.totalItems.toString()],
      ['Encontrados:', data.foundCount.toString()],
      ['Não Encontrados:', data.notFoundCount.toString()],
      ['Taxa de Encontro:', `${((data.foundCount / data.totalItems) * 100).toFixed(1)}%`],
    ]

    statsData.forEach(([label, value]) => {
      pdf.text(`${label} ${value}`, margin, yPosition)
      yPosition += 6
    })

    yPosition += 10

    // Tabela de itens
    pdf.setFont('helvetica', 'bold')
    pdf.text('Detalhamento dos Itens', margin, yPosition)
    yPosition += 8

    // Cabeçalho da tabela
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Nº Patrimônio', margin, yPosition)
    pdf.text('Descrição', margin + 40, yPosition)
    pdf.text('Status', margin + 120, yPosition)
    yPosition += 6

    // Linha separadora
    pdf.line(margin, yPosition, pdfWidth - margin, yPosition)
    yPosition += 3

    // Itens da tabela
    pdf.setFont('helvetica', 'normal')
    data.items.forEach((item, index) => {
      // Verificar se precisa de nova página
      if (yPosition > pdfHeight - 30) {
        pdf.addPage()
        yPosition = margin
      }

      pdf.text(item.numero_patrimonio, margin, yPosition)
      pdf.text(item.descricao_bem.substring(0, 30) + (item.descricao_bem.length > 30 ? '...' : ''), margin + 40, yPosition)
      pdf.text(item.status === 'found' ? 'Encontrado' : 'Não Encontrado', margin + 120, yPosition)
      yPosition += 5
    })

    // Rodapé
    addPDFFooter(pdf, options)

    // Salvar o PDF
    pdf.save(filename)
  } catch (error) {
    console.error('Erro ao gerar PDF do inventário:', error)
    throw new Error('Falha ao gerar PDF do inventário')
  }
}

/**
 * Adiciona cabeçalho ao PDF
 */
const addPDFHeader = (pdf: jsPDF, options: PDFOptions): void => {
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const margin = options.margin || 20

  if (options.includeLogo && options.logoUrl) {
    // Por enquanto, apenas texto do município
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(MUNICIPALITY_NAME, margin, 15)
  }

  if (options.title) {
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(options.title, margin, 25)
  }

  if (options.subtitle) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(options.subtitle, margin, 32)
  }

  if (options.includeDate) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(
      `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      pdfWidth - margin - 50,
      15
    )
  }
}

/**
 * Adiciona rodapé ao PDF
 */
const addPDFFooter = (pdf: jsPDF, options: PDFOptions): void => {
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()
  const margin = options.margin || 20

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  
  // Linha separadora
  pdf.line(margin, pdfHeight - 20, pdfWidth - margin, pdfHeight - 20)
  
  // Texto do rodapé
  pdf.text(
    `Sistema SISPAT 2.0 - ${MUNICIPALITY_NAME}`,
    margin,
    pdfHeight - 15
  )
  
  pdf.text(
    `Página ${pdf.getCurrentPageInfo().pageNumber}`,
    pdfWidth - margin - 20,
    pdfHeight - 15
  )
}

/**
 * Gera PDF de relatório genérico
 */
export const generateReportPDF = async (
  title: string,
  content: string,
  filename: string,
  options: PDFOptions = { title }
): Promise<void> => {
  try {
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4',
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const margin = options.margin || 20
    let yPosition = margin

    // Cabeçalho
    addPDFHeader(pdf, options)
    yPosition = margin + 40

    // Conteúdo
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    
    const lines = pdf.splitTextToSize(content, pdfWidth - (margin * 2))
    
    lines.forEach((line: string) => {
      if (yPosition > pdf.internal.pageSize.getHeight() - 30) {
        pdf.addPage()
        yPosition = margin
      }
      pdf.text(line, margin, yPosition)
      yPosition += 6
    })

    // Rodapé
    addPDFFooter(pdf, options)

    // Salvar o PDF
    pdf.save(filename)
  } catch (error) {
    console.error('Erro ao gerar PDF do relatório:', error)
    throw new Error('Falha ao gerar PDF do relatório')
  }
}
