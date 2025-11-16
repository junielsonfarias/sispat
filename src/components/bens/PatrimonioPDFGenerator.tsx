import { Patrimonio } from '@/types'
import { formatDate, formatCurrency, getCloudImageUrl } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { api } from '@/services/http-api'
import { generatePatrimonioQRCode } from '@/lib/qr-code-utils'

interface PatrimonioPDFGeneratorProps {
  patrimonio: Patrimonio
  municipalityName?: string
  municipalityLogo?: string
  selectedSections?: string[]
  templateId?: string
}

/**
 * ✅ OTIMIZAÇÃO: Redimensionar e comprimir imagem antes de adicionar ao PDF
 * Para logos: preserva transparência (PNG). Para fotos: detecta e preserva transparência.
 */
const compressImage = async (imageUrl: string, maxWidth: number = 800, quality: number = 0.75, preserveTransparency: boolean = false): Promise<string> => {
  return new Promise((resolve) => {
    // ✅ CORREÇÃO: Verificar se a URL é válida antes de tentar carregar
    // Detectar URLs blob inválidas (sem extensão de arquivo)
    if (imageUrl && (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/'))) {
      const filename = imageUrl.split('/').pop() || ''
      const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(filename)
      const isBlobUrl = filename.startsWith('blob-')
      
      // Se for blob URL sem extensão, retornar placeholder
      if (isBlobUrl && !hasValidExtension) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ URL blob inválida detectada no PDF (sem extensão):', imageUrl)
        }
        // Retornar um data URL de placeholder transparente
        resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbSBpbmRpc3BvbsOtdmVsPC90ZXh0Pjwvc3ZnPg==')
        return
      }
    }
    
    // Verificar se é uma URL válida (não vazia e não placeholder inválido)
    if (!imageUrl || imageUrl.includes('invalid') || imageUrl.includes('error')) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ URL de imagem inválida no PDF:', imageUrl)
      }
      // Retornar placeholder transparente
      resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbSBpbmRpc3BvbsOtdmVsPC90ZXh0Pjwvc3ZnPg==')
      return
    }
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // ✅ CORREÇÃO: Usar '2d' que suporta transparência (não '2d-premultiplied-alpha')
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
      // Desenhar em um canvas temporário para verificar transparência
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = Math.min(img.width, 100) // Usar área menor para verificação rápida
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
      // Usar JPEG apenas se não houver transparência e não for necessário preservar
      const shouldUsePNG = preserveTransparency || hasTransparency
      const compressed = shouldUsePNG
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality)
      
      resolve(compressed)
    }
    
    img.onerror = () => {
      // ✅ CORREÇÃO: Se falhar ao carregar, retornar placeholder em vez da URL original
      if (import.meta.env.DEV) {
        console.warn('⚠️ Erro ao carregar imagem no PDF:', imageUrl)
      }
      // Retornar placeholder transparente
      resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbSBpbmRpc3BvbsOtdmVsPC90ZXh0Pjwvc3ZnPg==')
    }
    
    img.src = imageUrl
  })
}

export const generatePatrimonioPDF = async ({
  patrimonio,
  municipalityName = 'Prefeitura Municipal',
  municipalityLogo = '/logo-government.svg',
  selectedSections = ['header', 'numero', 'identificacao', 'aquisicao', 'localizacao', 'status', 'baixa', 'depreciacao', 'observacoes', 'fotos', 'sistema', 'rodape'],
  templateId,
}: PatrimonioPDFGeneratorProps) => {
  console.log('🔍 [PDF Generator] Iniciando geração de PDF:', {
    patrimonioId: patrimonio.id,
    numeroPatrimonio: patrimonio.numero_patrimonio,
    templateId,
    selectedSections,
    municipalityName
  })

  // Buscar template se fornecido
  let template: any = null
  if (templateId) {
    try {
      console.log('🔍 [PDF Generator] Buscando template com ID:', templateId)
      template = await api.get(`/ficha-templates/${templateId}`)
      console.log('✅ [PDF Generator] Template carregado com sucesso:', {
        id: template.id,
        name: template.name,
        type: template.type,
        isDefault: template.isDefault,
        config: template.config
      })
    } catch (error) {
      console.error('❌ [PDF Generator] Erro ao carregar template:', error)
      console.error('❌ [PDF Generator] Detalhes do erro:', {
        templateId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        response: error.response?.data || 'N/A'
      })
    }
  } else {
    console.log('⚠️ [PDF Generator] Nenhum templateId fornecido, usando configurações padrão')
  }

  // Aplicar configurações do template se disponível
  const config = template?.config || {}
  const margins = config.styling?.margins || { top: 40, bottom: 20, left: 15, right: 15 }
  const fonts = config.styling?.fonts || { family: 'Arial', size: 12 }
  const headerConfig = config.header || {}
  const signaturesConfig = config.signatures || { enabled: true, count: 2, layout: 'horizontal', labels: ['Responsável pelo Setor', 'Responsável pelo Patrimônio'], showDates: true }

  console.log('🔧 [PDF Generator] Configurações aplicadas:', {
    templateName: template?.name || 'Padrão',
    margins,
    fonts,
    headerConfig,
    signaturesConfig,
    selectedSectionsCount: selectedSections.length
  })

  // Função auxiliar para verificar se uma seção deve ser incluída
  const shouldInclude = (sectionId: string) => selectedSections.includes(sectionId)
  
  // ✅ OTIMIZAÇÃO: Processar e comprimir imagens ANTES de construir o HTML
  let compressedLogo = municipalityLogo
  let compressedPhoto = ''
  const compressedPhotos: string[] = [] // Para múltiplas fotos se necessário
  
  // Processar logo - preservar transparência para SVGs/PNGs
  if (municipalityLogo && headerConfig.showLogo !== false) {
    try {
      // Se for SVG, não comprimir (mantém qualidade e transparência)
      if (municipalityLogo.endsWith('.svg') || municipalityLogo.includes('data:image/svg')) {
        compressedLogo = municipalityLogo
      } else {
        // Para outros formatos, comprimir preservando transparência
        compressedLogo = await compressImage(municipalityLogo, 200, 0.9, true)
      }
    } catch (error) {
      console.warn('Erro ao processar logo:', error)
      compressedLogo = municipalityLogo // Usar original se falhar
    }
  }
  
  // Comprimir primeira foto para seção de identificação
  // ✅ CORREÇÃO: Usar getCloudImageUrl para converter ID/objeto em URL válida
  // ✅ CORREÇÃO: Preservar transparência das fotos (caso tenham fundo transparente)
  if (shouldInclude('identificacao') && patrimonio.fotos && patrimonio.fotos.length > 0) {
    try {
      // Converter foto (pode ser ID, objeto ou URL) para URL válida
      const fotoUrl = getCloudImageUrl(patrimonio.fotos[0])
      console.log('📸 Processando foto para PDF:', { original: patrimonio.fotos[0], url: fotoUrl })
      // Preservar transparência para fotos também (caso tenham fundo transparente)
      compressedPhoto = await compressImage(fotoUrl, 400, 0.75, true)
    } catch (error) {
      console.warn('Erro ao comprimir foto:', error)
      // Tentar usar getCloudImageUrl como fallback
      compressedPhoto = getCloudImageUrl(patrimonio.fotos[0])
    }
  }
  
  // Comprimir todas as fotos se houver seção específica de fotos
  if (shouldInclude('fotos') && patrimonio.fotos && patrimonio.fotos.length > 0) {
    try {
      // Comprimir até 3 fotos (limite razoável para PDF)
      const photosToCompress = patrimonio.fotos.slice(0, 3)
      for (const photo of photosToCompress) {
        // ✅ CORREÇÃO: Converter para URL válida antes de comprimir
        // ✅ CORREÇÃO: Preservar transparência das fotos
        const photoUrl = getCloudImageUrl(photo)
        const compressed = await compressImage(photoUrl, 600, 0.75, true)
        compressedPhotos.push(compressed)
      }
    } catch (error) {
      console.warn('Erro ao comprimir fotos:', error)
    }
  }

  // Gerar QR Code para consulta pública - tamanho maior para melhor legibilidade
  let qrCodeUrl = ''
  try {
    // Gerar QR code com tamanho maior (250px) para melhor qualidade no PDF
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const publicUrl = `${origin}/consulta-publica/bem/${patrimonio.numero_patrimonio}`
    const { generateQRCode } = await import('@/lib/qr-code-utils')
    qrCodeUrl = await generateQRCode(publicUrl, { size: 250, errorCorrectionLevel: 'H' })
    console.log('✅ QR Code gerado com sucesso para PDF (250px)')
  } catch (error) {
    console.warn('⚠️ Erro ao gerar QR Code para PDF:', error)
  }
  
  // Criar elemento temporário para renderizar o conteúdo
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.width = '210mm' // A4 width
  container.style.paddingTop = `${margins.top}px`
  container.style.paddingBottom = `${margins.bottom}px`
  container.style.paddingLeft = `${margins.left}px`
  container.style.paddingRight = `${margins.right}px`
  container.style.backgroundColor = '#ffffff'
  container.style.fontFamily = fonts.family
  container.style.fontSize = `${fonts.size}px`
  
  // HTML do PDF
  container.innerHTML = `
    <div style="width: 100%; max-width: ${210 - margins.left - margins.right}mm; margin: 0 auto;">
      ${shouldInclude('header') ? `
      <!-- Cabeçalho -->
      <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000;">
        <!-- Logo e Nome do Município -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
            ${headerConfig.showLogo !== false && compressedLogo ? `<img src="${compressedLogo}" alt="Logo" style="height: ${headerConfig.logoSize === 'small' ? '45px' : headerConfig.logoSize === 'large' ? '70px' : '60px'}; width: auto; flex-shrink: 0;" onerror="this.style.display='none'" />` : ''}
            <div style="flex: 1; min-width: 0;">
              <h1 style="margin: 0; font-size: 18px; color: #000; font-weight: bold; line-height: 1.1; word-wrap: break-word; hyphens: auto; text-align: left;">${municipalityName}</h1>
            </div>
          </div>
          ${headerConfig.showDate !== false ? `
          <div style="text-align: right; flex-shrink: 0; min-width: 80px;">
            <p style="margin: 0; font-size: 10px; color: #000; font-weight: 500;">Data de Emissão</p>
            <p style="margin: 2px 0 0 0; font-size: 11px;">${formatDate(new Date())}</p>
          </div>
          ` : ''}
        </div>

        ${headerConfig.showSecretariat !== false ? `
        <!-- Informações da Secretaria Gestora -->
        <div style="margin-bottom: 8px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #000; font-weight: 500;">${headerConfig.customTexts?.secretariat || 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS'}</p>
          <p style="margin: 0; font-size: 12px; color: #000; font-weight: 500;">${headerConfig.customTexts?.department || 'DEPARTAMENTO DE GESTÃO E CONTROLE DE PATRIMÔNIO'}</p>
          <p style="margin: 3px 0 0 0; font-size: 14px; color: #000; font-weight: bold;">Ficha de Cadastro de Bem Móvel</p>
        </div>
        ` : ''}

        <!-- Linha Separadora -->
        <div style="border-top: 1px solid #ccc; padding-top: 8px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #000; font-weight: bold;">${patrimonio.setor_responsavel ? patrimonio.setor_responsavel.toUpperCase() : 'SECRETARIA RESPONSÁVEL'}</p>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('numero') ? `
      <!-- Número do Patrimônio -->
      <div style="margin-bottom: 25px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <!-- Número do Patrimônio -->
          <div style="padding: 12px; background: #f3f4f6; border-left: 4px solid #3B82F6; border-radius: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px; font-weight: bold; color: #3B82F6;">#</span>
              <div>
                <p style="margin: 0; font-size: 10px; color: #6b7280; font-weight: 500;">NÚMERO DO PATRIMÔNIO</p>
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #000;">${patrimonio.numero_patrimonio}</p>
              </div>
            </div>
          </div>
          
          <!-- Dados de Cadastro -->
          <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; text-align: center;">
            <p style="margin: 0; font-size: 10px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">CADASTRADO EM</p>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #000;">${formatDate(new Date(patrimonio.createdAt))}</p>
          </div>
          
          <!-- Dados de Atualização -->
          <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; text-align: center;">
            <p style="margin: 0; font-size: 10px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">ÚLTIMA ATUALIZAÇÃO</p>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #000;">${formatDate(new Date(patrimonio.updatedAt))}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('identificacao') ? `
      <!-- Seção 1: Identificação -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px;">
          IDENTIFICAÇÃO DO BEM
        </h2>
        
        <!-- Layout com foto integrada e melhorada -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: start;">
          <!-- Descrição, Tipo e Número de Série -->
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">DESCRIÇÃO</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #000; line-height: 1.4;">${patrimonio.descricao_bem || '-'}</p>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">TIPO</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #000;">${patrimonio.tipo || '-'}</p>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">NÚMERO DE SÉRIE</p>
            <p style="margin: 0; font-size: 14px; color: #000;">${patrimonio.numero_serie || '-'}</p>
          </div>
          
          <!-- Marca, Modelo e Cor -->
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">MARCA</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #000; line-height: 1.4;">${patrimonio.marca || '-'}</p>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">MODELO</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #000;">${patrimonio.modelo || '-'}</p>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">COR</p>
            <p style="margin: 0; font-size: 14px; color: #000;">${patrimonio.cor || '-'}</p>
          </div>
          
          <!-- Foto - Otimizada -->
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 8px;">FOTO</p>
            <div style="width: 100%; height: 160px; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
              ${compressedPhoto ? `
                <img src="${compressedPhoto}" alt="Foto do bem" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <span style="display: none; font-size: 12px; color: #6b7280;">Sem foto</span>
              ` : '<span style="font-size: 12px; color: #6b7280;">Sem foto</span>'}
            </div>
            
            <!-- QR Code para consulta pública - tamanho aumentado para melhor legibilidade -->
            ${qrCodeUrl ? `
            <div style="margin-top: 12px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
              <p style="margin: 0; font-size: 9px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">CONSULTA PÚBLICA</p>
              <img src="${qrCodeUrl}" alt="QR Code" style="width: 90px; height: 90px; margin: 0 auto; display: block; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
              <p style="margin: 4px 0 0 0; font-size: 8px; color: #9ca3af;">Escaneie para acessar</p>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('aquisicao') ? `
      <!-- Seção 2: Aquisição -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; text-align: left;">
          INFORMAÇÕES DE AQUISIÇÃO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">DATA DE AQUISIÇÃO</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #000;">${patrimonio.data_aquisicao ? formatDate(patrimonio.data_aquisicao) : '-'}</p>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">VALOR DE AQUISIÇÃO</p>
            <p style="margin: 0; font-size: 14px; color: #000; font-weight: bold;">${patrimonio.valor_aquisicao ? formatCurrency(patrimonio.valor_aquisicao) : '-'}</p>
            ${(patrimonio.numero_licitacao || patrimonio.ano_licitacao) ? `
            <div style="margin-top: 12px; padding: 10px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
              <p style="margin: 0; font-size: 10px; color: #1e40af; font-weight: 700; margin-bottom: 6px;">REFERÊNCIA DA AQUISIÇÃO</p>
              ${patrimonio.numero_licitacao ? `<p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 2px;">Número: <span style="color: #000; font-weight: 700;">${patrimonio.numero_licitacao}</span></p>` : ''}
              ${patrimonio.ano_licitacao ? `<p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600;">Ano: <span style="color: #000; font-weight: 700;">${patrimonio.ano_licitacao}</span></p>` : ''}
            </div>
            ` : ''}
          </div>
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">NOTA FISCAL</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #000;">${patrimonio.numero_nota_fiscal || '-'}</p>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">FORMA DE AQUISIÇÃO</p>
            <p style="margin: 0; font-size: 14px; color: #000;">${patrimonio.forma_aquisicao || '-'}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('localizacao') ? `
      <!-- Seção 3: Localização -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; text-align: left;">
          LOCALIZAÇÃO E ESTADO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">LOCALIZAÇÃO</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #000;">${patrimonio.local_objeto || '-'}</p>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">STATUS</p>
            <p style="margin: 0; font-size: 14px; color: #000; font-weight: bold;">${patrimonio.status?.toUpperCase() || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">SITUAÇÃO DO BEM</p>
            <p style="margin: 0; font-size: 14px; color: #000; font-weight: bold;">${patrimonio.situacao_bem || '-'}</p>
          </div>
        </div>
      </div>
      ` : ''}


      ${shouldInclude('baixa') && patrimonio.status === 'baixado' && patrimonio.data_baixa ? `
      <!-- Seção 5: Informações de Baixa -->
      <div style="margin-bottom: 20px; background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 15px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #991b1b;">
          ⚠️ INFORMAÇÕES DE BAIXA
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #7f1d1d; font-weight: 600;">DATA DA BAIXA</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #991b1b;">${formatDate(patrimonio.data_baixa)}</p>
          </div>
          <div style="grid-column: 1 / -1;">
            <p style="margin: 0; font-size: 10px; color: #7f1d1d; font-weight: 600;">MOTIVO DA BAIXA</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #991b1b;">${patrimonio.motivo_baixa || '-'}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('depreciacao') && patrimonio.metodo_depreciacao ? `
      <!-- Seção 6: Depreciação -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; text-align: left;">
          INFORMAÇÕES DE DEPRECIAÇÃO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">MÉTODO</p>
            <p style="margin: 0; font-size: 14px; color: #000;">${patrimonio.metodo_depreciacao}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">VIDA ÚTIL (ANOS)</p>
            <p style="margin: 0; font-size: 14px; color: #000;">${patrimonio.vida_util_anos || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 4px;">VALOR RESIDUAL</p>
            <p style="margin: 0; font-size: 14px; color: #000;">${patrimonio.valor_residual ? formatCurrency(patrimonio.valor_residual) : '-'}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('observacoes') && patrimonio.observacoes ? `
      <!-- Seção 7: Observações -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📝 OBSERVAÇÕES
        </h2>
        <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.6; text-align: justify;">${patrimonio.observacoes}</p>
      </div>
      ` : ''}



      ${signaturesConfig.enabled !== false ? `
      <!-- Linhas para Assinaturas -->
      <div style="margin-top: 50px;">
        <div style="display: grid; grid-template-columns: ${signaturesConfig.layout === 'vertical' ? '1fr' : `repeat(${signaturesConfig.count || 2}, 1fr)`}; gap: ${signaturesConfig.layout === 'vertical' ? '30px' : '40px'};">
          ${[...Array(signaturesConfig.count || 2)].map((_, i) => `
            <div style="text-align: center;">
              <div style="border-top: 1px solid #000; width: 100%; padding-top: 8px;">
                <p style="margin: 0; font-size: 11px; color: #000; font-weight: 500;">${signaturesConfig.labels?.[i] || `Assinatura ${i + 1}`}</p>
                ${signaturesConfig.showDates !== false ? `<p style="margin: 5px 0 0 0; font-size: 10px; color: #666;">Data: ___/___/_______</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${shouldInclude('rodape') ? `
      <!-- Rodapé -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #ccc; text-align: center;">
        <p style="margin: 0; font-size: 10px; color: #666;">
          Documento gerado automaticamente pelo SISPAT - Sistema de Patrimônio
        </p>
        <p style="margin: 5px 0 0 0; font-size: 9px; color: #999;">
          ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
      ` : ''}
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
      // ✅ Otimizações adicionais
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
    const fileName = `Ficha_Patrimonio_${patrimonio.numero_patrimonio}.pdf`
    pdf.save(fileName)

    console.log('✅ [PDF Generator] PDF gerado com sucesso:', {
      fileName,
      templateUsed: template?.name || 'Padrão',
      sectionsIncluded: selectedSections,
      patrimonioId: patrimonio.id
    })

    return true
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return false
  } finally {
    // Remover elemento temporário
    document.body.removeChild(container)
  }
}
