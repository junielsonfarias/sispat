import { Patrimonio } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { MUNICIPALITY_NAME } from '@/config/municipality'

interface FichaPreviewRealProps {
  config: any
  patrimonio?: Patrimonio
  selectedSections?: string[]
  municipalityName?: string
  municipalityLogo?: string
}

export const FichaPreviewReal = ({ 
  config, 
  patrimonio,
  selectedSections = ['header', 'numero', 'identificacao', 'aquisicao', 'localizacao', 'status', 'baixa', 'depreciacao', 'observacoes', 'fotos', 'sistema', 'rodape'],
  municipalityName = MUNICIPALITY_NAME,
  municipalityLogo = '/logo-government.svg'
}: FichaPreviewRealProps) => {
  
  // Dados de exemplo se não houver patrimônio
  const samplePatrimonio: Patrimonio = patrimonio || {
    id: 'sample',
    numero_patrimonio: '202501000001',
    descricao_bem: 'Notebook Dell Latitude 5420',
    tipo: 'Equipamento de Informática',
    marca: 'Dell',
    modelo: 'Latitude 5420',
    cor: 'Preto',
    numero_serie: 'SN123456789',
    data_aquisicao: new Date('2024-01-15'),
    valor_aquisicao: 4500.00,
    quantidade: 1,
    numero_nota_fiscal: '',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Educação',
    local_objeto: 'Sala 101',
    status: 'ativo',
    situacao_bem: 'OTIMO',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 450.00,
    fotos: [],
    documentos: [],
    historico_movimentacao: [],
    notes: [],
    municipalityId: '1',
    createdAt: new Date('2024-01-15'),
    createdBy: 'sistema',
    updatedAt: new Date('2024-01-15'),
    entityName: MUNICIPALITY_NAME,
  }

  // Aplicar configurações do template
  const margins = config.styling?.margins || { top: 40, bottom: 20, left: 15, right: 15 }
  const fonts = config.styling?.fonts || { family: 'Arial', size: 12 }
  const headerConfig = config.header || {}
  const signaturesConfig = config.signatures || { enabled: true, count: 2, layout: 'horizontal', labels: ['Responsável pelo Setor', 'Responsável pelo Patrimônio'], showDates: true }

  // Função auxiliar para verificar se uma seção deve ser incluída
  const shouldInclude = (sectionId: string) => selectedSections.includes(sectionId)

  // Campos por seção (config.sections.*.fields) — espelha o PatrimonioPDFGenerator
  // para a prévia mostrar exatamente os campos que sairão no PDF.
  const sectionsCfg = config.sections || {}
  const sectionFields = (key: string, fallback: string[]): string[] => {
    const f = sectionsCfg[key]?.fields
    return Array.isArray(f) && f.length > 0 ? f : fallback
  }
  const sectionEnabled = (key: string): boolean => sectionsCfg[key]?.enabled ?? true
  const labelStyle = { margin: 0, fontSize: '10px', color: '#6b7280', fontWeight: 500 } as const
  const valueStyle = { margin: '2px 0 0 0', fontSize: '12px', fontWeight: 600, color: '#000' } as const
  const FIELD_META: Record<string, { label: string; value: () => string }> = {
    descricao_bem: { label: 'DESCRIÇÃO', value: () => samplePatrimonio.descricao_bem || '—' },
    tipo: { label: 'TIPO', value: () => samplePatrimonio.tipo || '—' },
    marca: { label: 'MARCA', value: () => samplePatrimonio.marca || '—' },
    modelo: { label: 'MODELO', value: () => samplePatrimonio.modelo || '—' },
    cor: { label: 'COR', value: () => samplePatrimonio.cor || '—' },
    numero_serie: { label: 'NÚMERO DE SÉRIE', value: () => samplePatrimonio.numero_serie || '—' },
    data_aquisicao: { label: 'DATA DE AQUISIÇÃO', value: () => (samplePatrimonio.data_aquisicao ? formatDate(samplePatrimonio.data_aquisicao) : '—') },
    valor_aquisicao: { label: 'VALOR DE AQUISIÇÃO', value: () => (samplePatrimonio.valor_aquisicao != null ? formatCurrency(samplePatrimonio.valor_aquisicao) : '—') },
    forma_aquisicao: { label: 'FORMA DE AQUISIÇÃO', value: () => samplePatrimonio.forma_aquisicao || '—' },
    setor_responsavel: { label: 'SETOR RESPONSÁVEL', value: () => samplePatrimonio.setor_responsavel || '—' },
    local_objeto: { label: 'LOCAL DO OBJETO', value: () => samplePatrimonio.local_objeto || '—' },
    status: { label: 'STATUS', value: () => (samplePatrimonio.status ? String(samplePatrimonio.status).toUpperCase() : '—') },
    metodo_depreciacao: { label: 'MÉTODO DE DEPRECIAÇÃO', value: () => samplePatrimonio.metodo_depreciacao || '—' },
    vida_util_anos: { label: 'VIDA ÚTIL (ANOS)', value: () => (samplePatrimonio.vida_util_anos != null ? String(samplePatrimonio.vida_util_anos) : '—') },
    valor_residual: { label: 'VALOR RESIDUAL', value: () => (samplePatrimonio.valor_residual != null ? formatCurrency(samplePatrimonio.valor_residual) : '—') },
  }
  const renderFields = (keys: string[]) =>
    keys
      .filter((k) => FIELD_META[k])
      .map((k) => (
        <div key={k}>
          <p style={labelStyle}>{FIELD_META[k].label}</p>
          <p style={valueStyle}>{FIELD_META[k].value()}</p>
        </div>
      ))
  const piFields = sectionFields('patrimonioInfo', ['descricao_bem', 'tipo', 'marca', 'modelo', 'cor', 'numero_serie'])
  const acqFields = sectionFields('acquisition', ['data_aquisicao', 'valor_aquisicao', 'forma_aquisicao'])
  const locFields = sectionFields('location', ['setor_responsavel', 'local_objeto', 'status'])
  const depFields = sectionFields('depreciation', ['metodo_depreciacao', 'vida_util_anos', 'valor_residual'])

  return (
    <>
      {/* Estilos CSS para impressão A4 */}
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .ficha-a4-container {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              overflow: hidden !important;
            }
          }
        `}
      </style>
      
      <div 
        className="bg-white text-black ficha-a4-container"
        style={{
          width: '210mm',
          height: '297mm', // Altura fixa A4
          padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
          fontFamily: fonts.family,
          fontSize: `${fonts.size}px`,
          lineHeight: '1.4',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
      <div style={{ width: '100%', maxWidth: `${210 - margins.left - margins.right}mm` }}>
        
        {/* Cabeçalho */}
        {shouldInclude('header') && (
          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #000' }}>
            {/* Logo e Nome do Município */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                {headerConfig.showLogo !== false && (
                  <img 
                    src={municipalityLogo} 
                    alt="Logo" 
                    style={{ 
                      height: headerConfig.logoSize === 'small' ? '45px' : headerConfig.logoSize === 'large' ? '70px' : '60px',
                      width: 'auto',
                      flexShrink: 0
                    }} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    color: '#000', 
                    fontWeight: 'bold', 
                    lineHeight: 1.1,
                    wordWrap: 'break-word',
                    hyphens: 'auto',
                    textAlign: 'left'
                  }}>
                    {municipalityName}
                  </h1>
                </div>
              </div>
              {headerConfig.showDate !== false && (
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#000', fontWeight: 500 }}>Data de Emissão</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>{formatDate(new Date())}</p>
                </div>
              )}
            </div>

            {headerConfig.showSecretariat !== false && (
              <>
                {/* Informações da Secretaria Gestora */}
                <div style={{ marginBottom: '8px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#000', fontWeight: 500 }}>
                    {headerConfig.customTexts?.secretariat || 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#000', fontWeight: 500 }}>
                    {headerConfig.customTexts?.department || 'DEPARTAMENTO DE GESTÃO E CONTROLE DE PATRIMÔNIO'}
                  </p>
                  <p style={{ margin: '3px 0 0 0', fontSize: '14px', color: '#000', fontWeight: 'bold' }}>
                    Ficha de Cadastro de Bem Móvel
                  </p>
                </div>
              </>
            )}

            {/* Linha Separadora */}
            <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#000', fontWeight: 'bold' }}>
                {samplePatrimonio.setor_responsavel ? samplePatrimonio.setor_responsavel.toUpperCase() : 'SECRETARIA RESPONSÁVEL'}
              </p>
            </div>
          </div>
        )}

        {/* Número do Patrimônio */}
        {shouldInclude('numero') && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              {/* Número do Patrimônio */}
              <div style={{ padding: '12px', background: '#f3f4f6', borderLeft: '4px solid #3B82F6', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#3B82F6' }}>#</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>NÚMERO DO PATRIMÔNIO</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#000' }}>
                      {samplePatrimonio.numero_patrimonio}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Dados de Cadastro */}
              <div style={{ padding: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>CADASTRADO EM</p>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#000' }}>
                  {formatDate(new Date(samplePatrimonio.createdAt))}
                </p>
              </div>
              
              {/* Dados de Atualização */}
              <div style={{ padding: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>ÚLTIMA ATUALIZAÇÃO</p>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#000' }}>
                  {samplePatrimonio.updatedAt ? formatDate(new Date(samplePatrimonio.updatedAt)) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Identificação do Bem */}
        {shouldInclude('identificacao') && sectionEnabled('patrimonioInfo') && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
              IDENTIFICAÇÃO DO BEM
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {renderFields(piFields)}
            </div>
          </div>
        )}

        {/* Informações de Aquisição */}
        {shouldInclude('aquisicao') && sectionEnabled('acquisition') && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
              INFORMAÇÕES DE AQUISIÇÃO
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {renderFields(acqFields)}
            </div>
          </div>
        )}

        {/* Localização (status faz parte desta seção, espelhando o PDF) */}
        {shouldInclude('localizacao') && sectionEnabled('location') && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
              LOCALIZAÇÃO
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {renderFields(locFields)}
              {samplePatrimonio.situacao_bem && (
                <div>
                  <p style={labelStyle}>SITUAÇÃO DO BEM</p>
                  <p style={valueStyle}>{samplePatrimonio.situacao_bem}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Depreciação */}
        {shouldInclude('depreciacao') && sectionEnabled('depreciation') && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
              INFORMAÇÕES DE DEPRECIAÇÃO
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {renderFields(depFields)}
            </div>
          </div>
        )}

        {/* Observações */}
        {shouldInclude('observacoes') && (samplePatrimonio.notes?.length ?? 0) > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
              OBSERVAÇÕES
            </h3>
            <div style={{ padding: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
              {(samplePatrimonio.notes ?? []).map((note, index) => {
                const notes = samplePatrimonio.notes ?? []
                return (
                <div key={index} style={{ marginBottom: index < notes.length - 1 ? '8px' : '0' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#000', fontWeight: 600 }}>
                    {note.userName} - {formatDate(new Date(note.date))}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#000' }}>
                    {note.text}
                  </p>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Sistema */}
        {shouldInclude('sistema') && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
              INFORMAÇÕES DO SISTEMA
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>ENTIDADE</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 600, color: '#000' }}>
                  {samplePatrimonio.entityName}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>MUNICIPALITY ID</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 600, color: '#000' }}>
                  {samplePatrimonio.municipalityId}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé */}
        {shouldInclude('rodape') && signaturesConfig.enabled && (
          <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#000', fontWeight: 500 }}>
                  {signaturesConfig.labels[0]}
                </p>
                <div style={{ height: '40px', borderBottom: '1px solid #000', marginTop: '20px' }}></div>
                {signaturesConfig.showDates && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '9px', color: '#6b7280' }}>
                    Data: _____________
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#000', fontWeight: 500 }}>
                  {signaturesConfig.labels[1]}
                </p>
                <div style={{ height: '40px', borderBottom: '1px solid #000', marginTop: '20px' }}></div>
                {signaturesConfig.showDates && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '9px', color: '#6b7280' }}>
                    Data: _____________
                  </p>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <p style={{ margin: 0, fontSize: '8px', color: '#6b7280' }}>
                Documento gerado automaticamente por SISPAT em {formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
