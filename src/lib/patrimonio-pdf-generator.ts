import jsPDF from 'jspdf'
import { Patrimonio } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MUNICIPALITY_NAME } from '@/config/municipality'

interface PatrimonioPDFOptions {
  patrimonio: Patrimonio
  fieldsToPrint: string[]
  includeLogo?: boolean
  logoUrl?: string
}

export const generatePatrimonioPDF = async ({
  patrimonio,
  fieldsToPrint,
  includeLogo = false,
  logoUrl
}: PatrimonioPDFOptions): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm
  const margin = 20 // Margem segura de 20mm
  const contentWidth = pageWidth - (margin * 2) // 170mm
  const maxContentHeight = pageHeight - (margin * 2) // 257mm
  
  let yPosition = margin

  // Função para verificar se deve imprimir um campo
  const shouldPrint = (fieldId: keyof Patrimonio) =>
    fieldsToPrint.includes(fieldId)

  // Função para verificar se cabe na página
  const checkPageSpace = (requiredHeight: number) => {
    return (yPosition + requiredHeight) <= (pageHeight - margin - 30) // 30mm para rodapé
  }

  // Função para adicionar nova página se necessário
  const addPageIfNeeded = (requiredHeight: number) => {
    if (!checkPageSpace(requiredHeight)) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Função para adicionar texto com quebra de linha
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const maxWidth = options.maxWidth || contentWidth - (x - margin)
    const lines = doc.splitTextToSize(text, maxWidth)
    doc.text(lines, x, y)
    return y + (lines.length * (options.lineHeight || 4))
  }

  // Função para adicionar linha de informação otimizada
  const addInfoLine = (label: string, value: string, y: number, isImportant = false) => {
    const labelWidth = 45
    const valueX = margin + labelWidth
    const lineHeight = 4
    const spacing = 2
    
    // Verificar se cabe na página
    if (!checkPageSpace(lineHeight + spacing + 5)) {
      doc.addPage()
      yPosition = margin
      y = yPosition
    }
    
    // Background para linha importante
    if (isImportant) {
      doc.setFillColor(245, 245, 245)
      doc.rect(margin - 1, y - 2, contentWidth + 2, lineHeight + 1, 'F')
    }
    
    // Label em negrito
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(label + ':', margin, y)
    
    // Valor
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const maxValueWidth = contentWidth - labelWidth - 5
    const valueLines = doc.splitTextToSize(value || 'Não informado', maxValueWidth)
    doc.text(valueLines, valueX, y)
    
    return y + (valueLines.length * lineHeight) + spacing
  }

  // Função para adicionar foto do bem
  const addPhoto = async (y: number) => {
    if (!shouldPrint('fotos') || !patrimonio.fotos || patrimonio.fotos.length === 0) {
      return y
    }

    try {
      const photoUrl = patrimonio.fotos[0]
      const photoResponse = await fetch(photoUrl)
      const photoBlob = await photoResponse.blob()
      const photoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(photoBlob)
      })

      // Dimensões da foto - ajustadas para não sobrepor
      const photoWidth = 45
      const photoHeight = 35
      const photoX = pageWidth - margin - photoWidth - 5
      
      // Verificar se cabe na página
      if (!checkPageSpace(photoHeight + 10)) {
        doc.addPage()
        yPosition = margin
        y = yPosition
      }

      // Título da foto - posicionado acima
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      doc.text('FOTO DO BEM', photoX, y - 2)

      // Borda da foto com sombra sutil
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.8)
      doc.rect(photoX, y, photoWidth, photoHeight)

      // Adicionar a foto
      doc.addImage(photoDataUrl, 'JPEG', photoX + 1, y + 1, photoWidth - 2, photoHeight - 2)

      return y + photoHeight + 10
    } catch (error) {
      console.warn('Erro ao carregar foto:', error)
      return y
    }
  }

  // Função para adicionar seção compacta
  const addSection = (title: string, y: number) => {
    const sectionHeight = 6
    
    // Verificar se cabe na página
    if (!checkPageSpace(sectionHeight + 8)) {
      doc.addPage()
      yPosition = margin
      y = yPosition
    }
    
    // Título da seção - compacto
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(title, margin, y + 4)
    
    // Linha separadora elegante
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(margin, y + 5, pageWidth - margin, y + 5)
    
    return y + sectionHeight + 6
  }

  // Função para adicionar linha de informação compacta
  const addInfoLineImproved = (label: string, value: string, y: number, isImportant = false, availableWidth?: number) => {
    const labelWidth = 55
    const valueX = margin + labelWidth
    const lineHeight = 4.5
    const spacing = 1.5
    const currentWidth = availableWidth || contentWidth
    
    // Verificar se cabe na página
    if (!checkPageSpace(lineHeight + spacing + 5)) {
      doc.addPage()
      yPosition = margin
      y = yPosition
    }
    
    // Linha separadora sutil para campos importantes
    if (isImportant) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(margin, y - 0.5, margin + currentWidth, y - 0.5)
    }
    
    // Label em negrito
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(label + ':', margin, y)
    
    // Valor
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const maxValueWidth = currentWidth - labelWidth - 5
    const valueLines = doc.splitTextToSize(value || 'Não informado', maxValueWidth)
    doc.text(valueLines, valueX, y)
    
    return y + (valueLines.length * lineHeight) + spacing
  }

  // Cabeçalho limpo e profissional
  const headerHeight = 20
  doc.setFillColor(0, 0, 0)
  doc.rect(margin, yPosition, contentWidth, headerHeight, 'F')
  
  // Logo (se disponível) - simples e elegante
  if (includeLogo && logoUrl) {
    try {
      const logoResponse = await fetch(logoUrl)
      const logoBlob = await logoResponse.blob()
      const logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(logoBlob)
      })
      
      // Logo simples
      doc.addImage(logoDataUrl, 'PNG', margin + 2, yPosition + 2, 16, 16)
    } catch (error) {
      console.warn('Erro ao carregar logo:', error)
    }
  }

  // Título do município - elegante
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(MUNICIPALITY_NAME, margin + 20, yPosition + 8)

  // Título da ficha - estilizado
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('FICHA DE CADASTRO PATRIMONIAL', margin + 20, yPosition + 15)

  // Número do patrimônio (se selecionado) - destacado
  if (shouldPrint('numero_patrimonio')) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`Nº: ${patrimonio.numero_patrimonio}`, pageWidth - margin - 25, yPosition + 7)
  }

  // Data de geração - discreta
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Gerado: ${formatDate(new Date())}`, pageWidth - margin - 25, yPosition + 15)

  doc.setTextColor(0, 0, 0)
  yPosition += headerHeight + 10

  // Seção: INFORMAÇÕES DO BEM
  yPosition = addSection('INFORMAÇÕES DO BEM', yPosition)

  // Adicionar foto do bem (se disponível) - posicionada no canto direito
  const photoY = yPosition
  const photoWidth = 50
  const photoHeight = 40
  const photoX = pageWidth - margin - photoWidth - 5
  
  // Verificar se há foto e se deve imprimir
  let hasPhoto = false
  if (shouldPrint('fotos') && patrimonio.fotos && patrimonio.fotos.length > 0) {
    try {
      const photoUrl = patrimonio.fotos[0]
      const photoResponse = await fetch(photoUrl)
      const photoBlob = await photoResponse.blob()
      const photoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(photoBlob)
      })

      // Título da foto - simples
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('FOTO DO BEM', photoX, photoY - 3)

      // Borda da foto - simples e elegante
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.8)
      doc.rect(photoX, photoY, photoWidth, photoHeight)

      // Adicionar a foto
      doc.addImage(photoDataUrl, 'JPEG', photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2)
      hasPhoto = true
    } catch (error) {
      console.warn('Erro ao carregar foto:', error)
    }
  }

  // Ajustar largura das informações se houver foto
  const infoWidth = hasPhoto ? contentWidth - photoWidth - 15 : contentWidth

  // Informações do bem - com controle de espaço
  if (shouldPrint('descricao_bem')) {
    yPosition = addInfoLineImproved('Descrição', patrimonio.descricao_bem || '', yPosition, true, infoWidth)
  }
  
  if (shouldPrint('tipo')) {
    yPosition = addInfoLineImproved('Tipo', patrimonio.tipo || '', yPosition, false, infoWidth)
  }
  
  if (shouldPrint('marca')) {
    yPosition = addInfoLineImproved('Marca', patrimonio.marca || '', yPosition, false, infoWidth)
  }
  
  if (shouldPrint('modelo')) {
    yPosition = addInfoLineImproved('Modelo', patrimonio.modelo || '', yPosition, false, infoWidth)
  }
  
  if (shouldPrint('numero_serie')) {
    yPosition = addInfoLineImproved('Nº de Série', patrimonio.numero_serie || '', yPosition, false, infoWidth)
  }
  
  if (shouldPrint('cor')) {
    yPosition = addInfoLineImproved('Cor', patrimonio.cor || '', yPosition, false, infoWidth)
  }

  // Ajustar posição se houver foto
  if (hasPhoto) {
    yPosition = Math.max(yPosition, photoY + photoHeight + 15)
  }

  // Seção: INFORMAÇÕES DE AQUISIÇÃO
  yPosition = addSection('INFORMAÇÕES DE AQUISIÇÃO', yPosition)

  if (shouldPrint('data_aquisicao')) {
    yPosition = addInfoLineImproved('Data de Aquisição', formatDate(new Date(patrimonio.data_aquisicao)), yPosition)
  }
  
  if (shouldPrint('valor_aquisicao')) {
    yPosition = addInfoLineImproved('Valor de Aquisição', formatCurrency(patrimonio.valor_aquisicao), yPosition, true)
  }
  
  if (shouldPrint('numero_nota_fiscal')) {
    yPosition = addInfoLineImproved('Nota Fiscal', patrimonio.numero_nota_fiscal || '', yPosition)
  }
  
  if (shouldPrint('forma_aquisicao')) {
    yPosition = addInfoLineImproved('Forma de Aquisição', patrimonio.forma_aquisicao || '', yPosition)
  }

  // Seção: LOCALIZAÇÃO E ESTADO
  yPosition = addSection('LOCALIZAÇÃO E ESTADO', yPosition)

  if (shouldPrint('setor_responsavel')) {
    yPosition = addInfoLineImproved('Setor Responsável', patrimonio.setor_responsavel || '', yPosition, true)
  }
  
  if (shouldPrint('local_objeto')) {
    yPosition = addInfoLineImproved('Localização', patrimonio.local_objeto || '', yPosition)
  }
  
  if (shouldPrint('status')) {
    yPosition = addInfoLineImproved('Status', patrimonio.status.toUpperCase(), yPosition)
  }
  
  if (shouldPrint('situacao_bem')) {
    yPosition = addInfoLineImproved('Situação do Bem', patrimonio.situacao_bem || '', yPosition)
  }

  // Seção: OBSERVAÇÕES (se houver)
  if (shouldPrint('observacoes') && patrimonio.observacoes) {
    yPosition = addSection('OBSERVAÇÕES', yPosition)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    yPosition = addText(patrimonio.observacoes, margin, yPosition, { maxWidth: contentWidth })
  }

  // Verificar se precisa de nova página para o rodapé
  const footerHeight = 30
  if (yPosition > pageHeight - margin - footerHeight) {
    doc.addPage()
    yPosition = margin
  }

  // Rodapé limpo e profissional
  const footerY = pageHeight - margin - 18
  
  // Linha separadora simples
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.8)
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8)

  // Assinaturas - simples e elegantes
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  
  // Responsável pelo Setor
  doc.text('Responsável pelo Setor', margin + 20, footerY)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin + 20, footerY + 2, margin + 75, footerY + 2)
  
  // Responsável pelo Patrimônio
  doc.text('Responsável pelo Patrimônio', pageWidth - margin - 75, footerY)
  doc.line(pageWidth - margin - 75, footerY + 2, pageWidth - margin - 20, footerY + 2)

  // Data de geração no rodapé - simples
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `Documento gerado automaticamente por SISPAT em ${formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
    pageWidth / 2,
    pageHeight - margin - 5,
    { align: 'center' }
  )

  // Gerar nome do arquivo
  const fileName = `ficha_patrimonio_${patrimonio.numero_patrimonio}_${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`
  
  // Salvar o PDF
  doc.save(fileName)
}

// Função para gerar PDF com campos padrão
export const generateDefaultPatrimonioPDF = async (patrimonio: Patrimonio, logoUrl?: string): Promise<void> => {
  const defaultFields = [
    'numero_patrimonio',
    'descricao_bem',
    'tipo',
    'marca',
    'modelo',
    'data_aquisicao',
    'valor_aquisicao',
    'setor_responsavel',
    'local_objeto',
    'status',
    'observacoes'
  ]

  return generatePatrimonioPDF({
    patrimonio,
    fieldsToPrint: defaultFields,
    includeLogo: !!logoUrl,
    logoUrl
  })
}
