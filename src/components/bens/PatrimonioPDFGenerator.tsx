import { Patrimonio } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface PatrimonioPDFGeneratorProps {
  patrimonio: Patrimonio
  municipalityName?: string
  municipalityLogo?: string
  selectedSections?: string[]
}

export const generatePatrimonioPDF = async ({
  patrimonio,
  municipalityName = 'Prefeitura Municipal',
  municipalityLogo = '/logo-government.svg',
  selectedSections = ['header', 'numero', 'identificacao', 'aquisicao', 'localizacao', 'status', 'baixa', 'depreciacao', 'observacoes', 'fotos', 'sistema', 'rodape'],
}: PatrimonioPDFGeneratorProps) => {
  // Função auxiliar para verificar se uma seção deve ser incluída
  const shouldInclude = (sectionId: string) => selectedSections.includes(sectionId)
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
      ${shouldInclude('header') ? `
      <!-- Cabeçalho -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #3B82F6;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="${municipalityLogo}" alt="Logo" style="height: 60px; width: auto;" onerror="this.style.display='none'" />
          <div>
            <h1 style="margin: 0; font-size: 20px; color: #1e40af; font-weight: bold;">${municipalityName}</h1>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Ficha de Cadastro de Bem Móvel</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">Data de Emissão</p>
          <p style="margin: 3px 0 0 0; font-size: 12px; font-weight: bold;">${formatDate(new Date())}</p>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('numero') ? `
      <!-- Número do Patrimônio em Destaque -->
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1e40af 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 12px; opacity: 0.9;">NÚMERO DO PATRIMÔNIO</p>
        <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${patrimonio.numero_patrimonio}</p>
      </div>
      ` : ''}

      ${shouldInclude('identificacao') ? `
      <!-- Seção 1: Identificação -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📋 IDENTIFICAÇÃO DO BEM
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">DESCRIÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.descricao_bem || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">TIPO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.tipo || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">MARCA</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.marca || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">MODELO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.modelo || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">COR</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.cor || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">NÚMERO DE SÉRIE</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.numero_serie || '-'}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('aquisicao') ? `
      <!-- Seção 2: Aquisição -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          💰 DADOS DE AQUISIÇÃO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">DATA DE AQUISIÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.data_aquisicao ? formatDate(patrimonio.data_aquisicao) : '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">VALOR DE AQUISIÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b; font-weight: bold;">${patrimonio.valor_aquisicao ? formatCurrency(patrimonio.valor_aquisicao) : '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">FORMA DE AQUISIÇÃO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.forma_aquisicao || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">NOTA FISCAL</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.numero_nota_fiscal || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">QUANTIDADE</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.quantidade || 1}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('localizacao') ? `
      <!-- Seção 3: Localização -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📍 LOCALIZAÇÃO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">SETOR RESPONSÁVEL</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.setor_responsavel || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">LOCAL DO OBJETO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.local_objeto || '-'}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${shouldInclude('status') ? `
      <!-- Seção 4: Status e Situação -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📊 STATUS E SITUAÇÃO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">STATUS</p>
            <p style="margin: 3px 0 0 0; font-size: 12px;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; ${
                patrimonio.status === 'ativo' ? 'background: #dcfce7; color: #166534;' :
                patrimonio.status === 'baixado' ? 'background: #fee2e2; color: #991b1b;' :
                patrimonio.status === 'manutencao' ? 'background: #fef3c7; color: #92400e;' :
                'background: #f3f4f6; color: #374151;'
              }">
                ${patrimonio.status?.toUpperCase() || '-'}
              </span>
            </p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">SITUAÇÃO DO BEM</p>
            <p style="margin: 3px 0 0 0; font-size: 12px;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; ${
                patrimonio.situacao_bem === 'bom' ? 'background: #dcfce7; color: #166534;' :
                patrimonio.situacao_bem === 'regular' ? 'background: #fef3c7; color: #92400e;' :
                patrimonio.situacao_bem === 'ruim' ? 'background: #fed7aa; color: #9a3412;' :
                patrimonio.situacao_bem === 'pessimo' ? 'background: #fee2e2; color: #991b1b;' :
                'background: #f3f4f6; color: #374151;'
              }">
                ${patrimonio.situacao_bem?.toUpperCase() || '-'}
              </span>
            </p>
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
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📉 INFORMAÇÕES DE DEPRECIAÇÃO
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">MÉTODO</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.metodo_depreciacao}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">VIDA ÚTIL (ANOS)</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.vida_util_anos || '-'}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">VALOR RESIDUAL</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #1e293b;">${patrimonio.valor_residual ? formatCurrency(patrimonio.valor_residual) : '-'}</p>
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

      ${shouldInclude('fotos') && patrimonio.fotos && patrimonio.fotos.length > 0 ? `
      <!-- Seção 8: Fotos do Bem -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          📷 FOTOS DO BEM (${patrimonio.fotos.length})
        </h2>
        <div style="display: grid; grid-template-columns: repeat(${patrimonio.fotos.length === 1 ? '1' : patrimonio.fotos.length === 2 ? '2' : '3'}, 1fr); gap: 10px; margin-top: 12px;">
          ${patrimonio.fotos.slice(0, 6).map((foto, index) => `
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
        ${patrimonio.fotos.length > 6 ? `
          <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b; text-align: center;">
            + ${patrimonio.fotos.length - 6} foto(s) adicional(is)
          </p>
        ` : ''}
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

      ${shouldInclude('rodape') ? `
      <!-- Rodapé -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 10px; color: #94a3b8;">
          Documento gerado automaticamente pelo SISPAT - Sistema de Patrimônio
        </p>
        <p style="margin: 5px 0 0 0; font-size: 9px; color: #cbd5e1;">
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
    pdf.save(`Ficha_Patrimonio_${patrimonio.numero_patrimonio}.pdf`)

    return true
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return false
  } finally {
    // Remover elemento temporário
    document.body.removeChild(container)
  }
}
