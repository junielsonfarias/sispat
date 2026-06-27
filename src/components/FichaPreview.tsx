import { Patrimonio, Imovel } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SampleData {
  numero_patrimonio: string
  descricao_bem: string
  tipo: string
  marca: string
  modelo: string
  cor: string
  numero_serie: string
  data_aquisicao: string
  valor_aquisicao: string
  forma_aquisicao: string
  setor_responsavel: string
  local_objeto: string
  status: string
  situacao_bem: string
  metodo_depreciacao: string
  vida_util_anos: string
  valor_residual: string
}

interface PreviewProps {
  config: any
  type: 'bens' | 'imoveis'
  sampleData?: Patrimonio | Imovel | null
}

export const FichaPreview = ({ config, type, sampleData }: PreviewProps) => {
  const { header, sections, signatures, styling } = config

  // ✅ CORREÇÃO: Usar dados de exemplo se não houver dados reais
  // Quando sampleData é Patrimonio, mapeia as propriedades para o tipo local.
  // Quando sampleData é Imovel ou null/undefined, usa valores padrão.
  const previewData: SampleData = ('descricao_bem' in (sampleData ?? {}))
    ? (() => {
        const p = sampleData as Patrimonio
        return {
          numero_patrimonio: p.numero_patrimonio,
          descricao_bem: p.descricao_bem,
          tipo: p.tipo,
          marca: p.marca,
          modelo: p.modelo,
          cor: p.cor,
          numero_serie: p.numero_serie,
          data_aquisicao: p.data_aquisicao instanceof Date
            ? p.data_aquisicao.toLocaleDateString('pt-BR')
            : String(p.data_aquisicao),
          valor_aquisicao: typeof p.valor_aquisicao === 'number'
            ? formatCurrency(p.valor_aquisicao)
            : String(p.valor_aquisicao),
          forma_aquisicao: p.forma_aquisicao,
          setor_responsavel: p.setor_responsavel,
          local_objeto: p.local_objeto,
          status: p.status,
          situacao_bem: p.situacao_bem,
          metodo_depreciacao: p.metodo_depreciacao ?? 'Linear',
          vida_util_anos: p.vida_util_anos != null ? `${p.vida_util_anos} anos` : '—',
          valor_residual: p.valor_residual != null
            ? formatCurrency(p.valor_residual)
            : '—',
        }
      })()
    : {
        numero_patrimonio: '202501000001',
        descricao_bem: 'Notebook Dell Latitude 5420',
        tipo: 'Equipamento de Informática',
        marca: 'Dell',
        modelo: 'Latitude 5420',
        cor: 'Preto',
        numero_serie: 'SN123456789',
        data_aquisicao: '15/01/2024',
        valor_aquisicao: 'R$ 4.500,00',
        forma_aquisicao: 'Compra Direta',
        setor_responsavel: 'Secretaria de Educação',
        local_objeto: 'Sala 101',
        status: 'Ativo',
        situacao_bem: 'Ótimo',
        metodo_depreciacao: 'Linear',
        vida_util_anos: '5 anos',
        valor_residual: 'R$ 450,00',
      }

  const logoSizeMap: Record<'small' | 'medium' | 'large', string> = {
    small: 'h-12',
    medium: 'h-16',
    large: 'h-20'
  }

  const photoSizeMap: Record<'small' | 'medium' | 'large', string> = {
    small: 'w-24 h-24',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  }

  return (
    <div 
      className="bg-white shadow-sm"
      style={{
        padding: `${styling.margins.top}px ${styling.margins.right}px ${styling.margins.bottom}px ${styling.margins.left}px`,
        fontFamily: styling.fonts.family,
        fontSize: `${styling.fonts.size}px`
      }}
    >
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        {header.showLogo && (
          <div className="flex justify-center mb-2">
            <div className={`${logoSizeMap[(header.logoSize as 'small' | 'medium' | 'large') ?? 'medium']} w-auto bg-gray-200 rounded flex items-center justify-center px-4`}>
              <span className="text-xs text-gray-500">Logo</span>
            </div>
          </div>
        )}
        {header.showSecretariat && (
          <>
            <h1 className="text-lg font-bold uppercase">{header.customTexts.secretariat}</h1>
            <h2 className="text-sm font-semibold">{header.customTexts.department}</h2>
          </>
        )}
        <h3 className="text-base font-bold mt-2">
          FICHA DE CADASTRO DE {type === 'bens' ? 'BENS MÓVEIS' : 'IMÓVEIS'}
        </h3>
        {header.showDate && (
          <p className="text-xs mt-1">Data: {new Date().toLocaleDateString('pt-BR')}</p>
        )}
      </div>

      {/* Número do Patrimônio */}
      <div className="mb-4 p-2 bg-gray-100 border border-gray-300">
        <p className="text-sm font-bold">Nº PATRIMÔNIO: {previewData.numero_patrimonio}</p>
      </div>

      {/* Seção de Informações do Patrimônio */}
      {sections.patrimonioInfo.enabled && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 border-b border-gray-400">INFORMAÇÕES DO PATRIMÔNIO</h4>
          <div className={sections.patrimonioInfo.layout === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {sections.patrimonioInfo.showPhoto && (
              <div className="col-span-2 flex justify-center mb-2">
                <div className={`${photoSizeMap[(sections.patrimonioInfo.photoSize as 'small' | 'medium' | 'large') ?? 'medium']} bg-gray-200 rounded flex items-center justify-center`}>
                  <span className="text-xs text-gray-500">Foto</span>
                </div>
              </div>
            )}
            {sections.patrimonioInfo.fields.includes('descricao_bem') && (
              <div className={sections.patrimonioInfo.layout === 'grid' ? 'col-span-2' : ''}>
                <span className="text-xs font-semibold">Descrição:</span>
                <p className="text-xs">{previewData.descricao_bem}</p>
              </div>
            )}
            {sections.patrimonioInfo.fields.includes('tipo') && (
              <div>
                <span className="text-xs font-semibold">Tipo:</span>
                <p className="text-xs">{previewData.tipo}</p>
              </div>
            )}
            {sections.patrimonioInfo.fields.includes('marca') && (
              <div>
                <span className="text-xs font-semibold">Marca:</span>
                <p className="text-xs">{previewData.marca}</p>
              </div>
            )}
            {sections.patrimonioInfo.fields.includes('modelo') && (
              <div>
                <span className="text-xs font-semibold">Modelo:</span>
                <p className="text-xs">{previewData.modelo}</p>
              </div>
            )}
            {sections.patrimonioInfo.fields.includes('cor') && (
              <div>
                <span className="text-xs font-semibold">Cor:</span>
                <p className="text-xs">{previewData.cor}</p>
              </div>
            )}
            {sections.patrimonioInfo.fields.includes('numero_serie') && (
              <div>
                <span className="text-xs font-semibold">Nº Série:</span>
                <p className="text-xs">{previewData.numero_serie}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção de Aquisição */}
      {sections.acquisition.enabled && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 border-b border-gray-400">INFORMAÇÕES DE AQUISIÇÃO</h4>
          <div className="grid grid-cols-2 gap-2">
            {sections.acquisition.fields.map((field: string) => (
              <div key={field}>
                <span className="text-xs font-semibold">
                  {field === 'data_aquisicao' && 'Data de Aquisição:'}
                  {field === 'valor_aquisicao' && 'Valor de Aquisição:'}
                  {field === 'forma_aquisicao' && 'Forma de Aquisição:'}
                </span>
                <p className="text-xs">{previewData[field as keyof SampleData]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção de Localização */}
      {sections.location.enabled && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 border-b border-gray-400">LOCALIZAÇÃO E ESTADO</h4>
          <div className="grid grid-cols-2 gap-2">
            {sections.location.fields.map((field: string) => (
              <div key={field}>
                <span className="text-xs font-semibold">
                  {field === 'setor_responsavel' && 'Setor Responsável:'}
                  {field === 'local_objeto' && 'Local:'}
                  {field === 'status' && 'Status:'}
                </span>
                <p className="text-xs">{previewData[field as keyof SampleData]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção de Depreciação */}
      {sections.depreciation.enabled && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 border-b border-gray-400">INFORMAÇÕES DE DEPRECIAÇÃO</h4>
          <div className="grid grid-cols-2 gap-2">
            {sections.depreciation.fields.map((field: string) => (
              <div key={field}>
                <span className="text-xs font-semibold">
                  {field === 'metodo_depreciacao' && 'Método:'}
                  {field === 'vida_util_anos' && 'Vida Útil:'}
                  {field === 'valor_residual' && 'Valor Residual:'}
                </span>
                <p className="text-xs">{previewData[field as keyof SampleData]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assinaturas */}
      {signatures.enabled && (
        <div className="mt-6 pt-4 border-t-2 border-gray-800">
          <div className={`grid gap-6 ${signatures.layout === 'horizontal' ? `grid-cols-${signatures.count}` : 'grid-cols-1'}`}>
            {signatures.labels.slice(0, signatures.count).map((label: string, index: number) => (
              <div key={index} className="text-center">
                <div className="border-t border-gray-800 mt-10 pt-2">
                  <p className="text-xs font-semibold">{label}</p>
                  {signatures.showDates && (
                    <p className="text-xs text-gray-600 mt-1">Data: ___/___/___</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

