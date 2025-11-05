import { Imovel } from '@/types'
import { formatDate, formatCurrency, getCloudImageUrl } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { generateQRCode } from '@/lib/qr-code-utils'

interface ImovelPDFGeneratorProps {
  imovel: Imovel
  municipalityName?: string
  municipalityLogo?: string
}

/**
 * ✅ OTIMIZAÇÃO: Redimensionar e comprimir imagem antes de adicionar ao PDF
 * Para logos: preserva transparência (PNG). Para fotos: detecta e preserva transparência.
 */
const compressImage = async (imageUrl: string, maxWidth: number = 800, quality: number = 0.75, preserveTransparency: boolean = false): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true })!
      
      // Calcular novo tamanho mantendo proporção
      let width = img.width
      let height = img.height
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      // ✅ CORREÇÃO: Sempre limpar o canvas para preservar transparência
      ctx.clearRect(0, 0, width, height)
      
      // ✅ CORREÇÃO: Verificar se a imagem tem transparência
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = Math.min(img.width, 100)
      tempCanvas.height = Math.min(img.height, 100)
      const tempCtx = tempCanvas.getContext('2d', { alpha: true })!
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)
      
      // Verificar se há pixels transparentes (alpha < 255)
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
      let hasTransparency = false
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] < 255) {
          hasTransparency = true
          break
        }
      }
      
      // Desenhar imagem redimensionada no canvas principal
      ctx.drawImage(img, 0, 0, width, height)
      
      // ✅ CORREÇÃO: Usar PNG se precisar preservar transparência OU se a imagem original tiver transparência
      const shouldUsePNG = preserveTransparency || hasTransparency
      const compressed = shouldUsePNG
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality)
      
      resolve(compressed)
    }
    
    img.onerror = () => {
      resolve(imageUrl)
    }
    
    img.src = imageUrl
  })
}

export const generateImovelPDF = async ({
  imovel,
  municipalityName = 'Prefeitura Municipal',
  municipalityLogo = '/logo-government.svg',
}: ImovelPDFGeneratorProps) => {
  // ✅ CORREÇÃO: Processar fotos ANTES de construir o HTML
  const processedPhotos: string[] = []
  
  if (imovel.fotos && imovel.fotos.length > 0) {
    try {
      console.log('📸 [PDF Imóvel] Processando fotos:', { total: imovel.fotos.length, fotos: imovel.fotos })
      for (const photo of imovel.fotos.slice(0, 6)) {
        // Converter foto (pode ser ID, objeto ou URL) para URL válida
        const photoUrl = getCloudImageUrl(photo)
        console.log('📸 [PDF Imóvel] Processando foto:', { original: photo, url: photoUrl })
        // Preservar transparência das fotos (caso tenham fundo transparente)
        const compressed = await compressImage(photoUrl, 600, 0.75, true)
        processedPhotos.push(compressed)
      }
    } catch (error) {
      console.warn('❌ [PDF Imóvel] Erro ao processar fotos:', error)
      // Fallback: usar URLs convertidas sem compressão
      imovel.fotos.slice(0, 6).forEach(photo => {
        processedPhotos.push(getCloudImageUrl(photo))
      })
    }
  }
  
  // Processar logo - preservar transparência
  let processedLogo = municipalityLogo
  if (municipalityLogo) {
    try {
      // Se for SVG, não comprimir (mantém qualidade e transparência)
      if (municipalityLogo.endsWith('.svg') || municipalityLogo.includes('data:image/svg')) {
        processedLogo = municipalityLogo
      } else {
        // Para outros formatos, comprimir preservando transparência
        processedLogo = await compressImage(municipalityLogo, 200, 0.9, true)
      }
    } catch (error) {
      console.warn('Erro ao processar logo:', error)
      processedLogo = municipalityLogo
    }
  }

  // Gerar QR Code para consulta pública de imóvel - tamanho maior para melhor legibilidade
  let qrCodeUrl = ''
  try {
    // Gerar QR code com tamanho maior (250px) para melhor qualidade no PDF
    const publicUrl = `${window.location.origin}/consulta-publica/imovel/${imovel.numero_patrimonio}`
    qrCodeUrl = await generateQRCode(publicUrl, { size: 250, errorCorrectionLevel: 'H' })
    console.log('✅ QR Code gerado com sucesso para PDF de imóvel (250px)')
  } catch (error) {
    console.warn('⚠️ Erro ao gerar QR Code para PDF de imóvel:', error)
  }
  
  // Criar elemento temporário para renderizar o conteúdo
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.width = '210mm' // A4 width
  container.style.padding = '20mm'
  container.style.backgroundColor = '#ffffff'
  container.style.fontFamily = 'Arial, sans-serif'
  
  // HTML do PDF
  container.innerHTML = `
    <div style="width: 100%; max-width: 170mm;">
      <!-- Cabeçalho -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #10b981;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="${processedLogo}" alt="Logo" style="height: 60px; width: auto;" onerror="this.style.display='none'" />
          <div>
            <h1 style="margin: 0; font-size: 20px; color: #047857; font-weight: bold;">${municipalityName}</h1>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Ficha de Cadastro de Imóvel</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">Data de Emissão</p>
          <p style="margin: 3px 0 0 0; font-size: 12px; font-weight: bold;">${formatDate(new Date())}</p>
        </div>
      </div>

      <!-- QR Code para consulta pública - tamanho aumentado para melhor legibilidade -->
      ${qrCodeUrl ? `
      <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
        <div style="text-align: center; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
          <p style="margin: 0 0 6px 0; font-size: 10px; color: #64748b; font-weight: 600;">CONSULTA PÚBLICA</p>
          <img src="${qrCodeUrl}" alt="QR Code" style="width: 110px; height: 110px; margin: 0 auto; display: block; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
          <p style="margin: 6px 0 0 0; font-size: 9px; color: #94a3b8;">Escaneie para acessar</p>
        </div>
      </div>
      ` : ''}

      <!-- Número do Patrimônio em Destaque -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 12px; opacity: 0.9;">NÚMERO DO PATRIMÔNIO</p>
        <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${imovel.numero_patrimonio}</p>
      </div>

      <!-- Seção 1: Identificação -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          🏢 IDENTIFICAÇÃO DO IMÓVEL
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="grid-column: 1 / -1;">
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">DENOMINAÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 14px; color: #1e293b; font-weight: bold;">${imovel.denominacao || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">TIPO DE IMÓVEL</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${imovel.tipo_imovel || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">SITUAÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; ${
                imovel.situacao === 'ativo' ? 'background: #dcfce7; color: #166534;' :
                imovel.situacao === 'alugado' ? 'background: #dbeafe; color: #1e40af;' :
                imovel.situacao === 'desativado' ? 'background: #fee2e2; color: #991b1b;' :
                'background: #f3f4f6; color: #374151;'
              }">
                ${imovel.situacao?.toUpperCase() || '-'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Seção 2: Localização -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📍 LOCALIZAÇÃO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">ENDEREÇO COMPLETO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${imovel.endereco || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">SETOR RESPONSÁVEL</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${imovel.setor || '-'}</p>
          </div>
          ${imovel.latitude && imovel.longitude ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">LATITUDE</p>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #1e293b; font-family: monospace;">${imovel.latitude}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">LONGITUDE</p>
              <p style="margin: 3px 0 0 0; font-size: 11px; color: #1e293b; font-family: monospace;">${imovel.longitude}</p>
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Seção 3: Informações Financeiras -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          💰 INFORMAÇÕES FINANCEIRAS
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">DATA DE AQUISIÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${imovel.data_aquisicao ? formatDate(imovel.data_aquisicao) : '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">VALOR DE AQUISIÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b; font-weight: bold;">${imovel.valor_aquisicao ? formatCurrency(imovel.valor_aquisicao) : '-'}</p>
          </div>
        </div>
      </div>

      <!-- Seção 4: Medidas -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📏 MEDIDAS E DIMENSÕES
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">ÁREA DO TERRENO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${imovel.area_terreno ? `${imovel.area_terreno} m²` : '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">ÁREA CONSTRUÍDA</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${imovel.area_construida ? `${imovel.area_construida} m²` : '-'}</p>
          </div>
        </div>
      </div>

      ${imovel.descricao ? `
      <!-- Seção 5: Descrição -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📝 DESCRIÇÃO
        </h2>
        <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.6; text-align: justify;">${imovel.descricao}</p>
      </div>
      ` : ''}

      ${imovel.observacoes ? `
      <!-- Seção 6: Observações -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📋 OBSERVAÇÕES
        </h2>
        <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.6; text-align: justify;">${imovel.observacoes}</p>
      </div>
      ` : ''}

      ${processedPhotos.length > 0 ? `
      <!-- Seção 7: Fotos do Imóvel -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📷 FOTOS DO IMÓVEL (${imovel.fotos.length})
        </h2>
        <div style="display: grid; grid-template-columns: repeat(${processedPhotos.length === 1 ? '1' : processedPhotos.length === 2 ? '2' : '3'}, 1fr); gap: 10px; margin-top: 12px;">
          ${processedPhotos.map((foto, index) => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #f9fafb;">
              <img 
                src="${foto}" 
                alt="Foto ${index + 1}" 
                style="width: 100%; height: 120px; object-fit: cover; display: block;"
                crossorigin="anonymous"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <div style="display: none; width: 100%; height: 120px; align-items: center; justify-content: center; background: #f3f4f6; color: #9ca3af; font-size: 10px;">
                Imagem indisponível
              </div>
              <p style="margin: 0; padding: 6px; font-size: 9px; color: #64748b; text-align: center; background: white;">
                Foto ${index + 1}
              </p>
            </div>
          `).join('')}
        </div>
        ${imovel.fotos.length > 6 ? `
          <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; text-align: center;">
            + ${imovel.fotos.length - 6} foto(s) adicional(is)
          </p>
        ` : ''}
      </div>
      ` : ''}

      ${imovel.customFields && Object.keys(imovel.customFields).length > 0 ? `
      <!-- Seção 8: Campos Personalizados -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          🔧 INFORMAÇÕES ADICIONAIS
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${Object.entries(imovel.customFields).map(([key, value]) => `
            <div>
              <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">${key.replace(/_/g, ' ').toUpperCase()}</p>
              <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${value || '-'}</p>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Seção 9: Informações do Sistema -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 10px; color: #64748b;">
          <div>
            <p style="margin: 0; font-weight: 600;">CADASTRADO EM</p>
            <p style="margin: 3px 0 0 0;">${formatDate(imovel.createdAt)}</p>
          </div>
          ${imovel.updatedAt ? `
          <div>
            <p style="margin: 0; font-weight: 600;">ÚLTIMA ATUALIZAÇÃO</p>
            <p style="margin: 3px 0 0 0;">${formatDate(imovel.updatedAt)}</p>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Rodapé -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 10px; color: #94a3b8;">
          Documento gerado automaticamente pelo SISPAT - Sistema de Patrimônio
        </p>
        <p style="margin: 5px 0 0 0; font-size: 9px; color: #cbd5e1;">
          ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  `

  document.body.appendChild(container)

  try {
    // Aguardar carregamento de imagens
    await new Promise(resolve => setTimeout(resolve, 500))

    // ✅ MELHORIA DE QUALIDADE: Aumentar scale para 2 para melhor resolução (especialmente QR code)
    // Converter para canvas
    const canvas = await html2canvas(container, {
      scale: 2, // ✅ Aumentado para 2 - melhora qualidade e resolução do QR code
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      removeContainer: false,
      allowTaint: false,
    })

    // Criar PDF com compressão ativada
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true, // ✅ Ativar compressão do PDF
    })

    // ✅ MELHORIA DE QUALIDADE: Aumentar qualidade JPEG de 0.85 para 0.95
    // Mantém tamanho ~250KB conforme solicitado, mas com melhor qualidade
    const imgData = canvas.toDataURL('image/jpeg', 0.95) // 95% de qualidade - melhor para QR code
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    // ✅ Usar formato JPEG com qualidade alta para melhor legibilidade do QR code
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

    // Salvar PDF
    pdf.save(`Ficha_Imovel_${imovel.numero_patrimonio}.pdf`)

    return true
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return false
  } finally {
    // Remover elemento temporário
    document.body.removeChild(container)
  }
}
