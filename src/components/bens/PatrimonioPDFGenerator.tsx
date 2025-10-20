import { Patrimonio } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { api } from '@/services/http-api'

interface PatrimonioPDFGeneratorProps {
  patrimonio: Patrimonio
  municipalityName?: string
  municipalityLogo?: string
  selectedSections?: string[]
  templateId?: string
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
            ${headerConfig.showLogo !== false ? `<img src="${municipalityLogo}" alt="Logo" style="height: ${headerConfig.logoSize === 'small' ? '45px' : headerConfig.logoSize === 'large' ? '70px' : '60px'}; width: auto; flex-shrink: 0;" onerror="this.style.display='none'" />` : ''}
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
      <!-- Número do Patrimônio e Dados de Cadastro/Atualização -->
      <div style="margin-bottom: 25px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <!-- Número do Patrimônio - Reduzido -->
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
          
          <!-- Foto - Altura Aumentada -->
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 8px;">FOTO</p>
            <div style="width: 100%; height: 160px; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
              ${patrimonio.fotos && patrimonio.fotos.length > 0 ? `
                <img src="${patrimonio.fotos[0]}" alt="Foto do bem" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <span style="display: none; font-size: 12px; color: #6b7280;">Sem foto</span>
              ` : '<span style="font-size: 12px; color: #6b7280;">Sem foto</span>'}
            </div>
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


      ${shouldInclude('sistema') ? `
      <!-- Seção 9: Informações do Sistema -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 10px; color: #64748b;">
          <div>
            <p style="margin: 0; font-weight: 600;">CADASTRADO EM</p>
            <p style="margin: 3px 0 0 0;">${formatDate(patrimonio.createdAt)}</p>
          </div>
          ${patrimonio.updatedAt ? `
          <div>
            <p style="margin: 0; font-weight: 600;">ÚLTIMA ATUALIZAÇÃO</p>
            <p style="margin: 3px 0 0 0;">${formatDate(patrimonio.updatedAt)}</p>
          </div>
          ` : ''}
        </div>
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

    // Converter para canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

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
