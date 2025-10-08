import { Imovel } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface ImovelPDFGeneratorProps {
  imovel: Imovel
  municipalityName?: string
  municipalityLogo?: string
}

export const generateImovelPDF = async ({
  imovel,
  municipalityName = 'Prefeitura Municipal',
  municipalityLogo = '/logo-government.svg',
}: ImovelPDFGeneratorProps) => {
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
          <img src="${municipalityLogo}" alt="Logo" style="height: 60px; width: auto;" onerror="this.style.display='none'" />
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

      ${imovel.fotos && imovel.fotos.length > 0 ? `
      <!-- Seção 7: Fotos do Imóvel -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #047857; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📷 FOTOS DO IMÓVEL (${imovel.fotos.length})
        </h2>
        <div style="display: grid; grid-template-columns: repeat(${imovel.fotos.length === 1 ? '1' : imovel.fotos.length === 2 ? '2' : '3'}, 1fr); gap: 10px; margin-top: 12px;">
          ${imovel.fotos.slice(0, 6).map((foto, index) => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #f9fafb;">
              <img 
                src="${foto.startsWith('http') ? foto : foto}" 
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
