// Definições de campos da ficha por TIPO (bens × imóveis), por seção.
// Usado pelo editor de template (EditorTemplateFicha/NovoTemplateFicha) para as
// caixas de seleção e pelos geradores de PDF para o field-level. As 4 seções do
// editor (patrimonioInfo/acquisition/location/depreciation) são reaproveitadas
// para imóvel com rótulos próprios (ver FICHA_SECTION_META_BY_TYPE).

export type FichaType = 'bens' | 'imoveis'

export type FichaSectionKey =
  | 'patrimonioInfo'
  | 'acquisition'
  | 'location'
  | 'depreciation'

export interface FichaFieldOption {
  value: string
  label: string
}

export interface FichaSectionMeta {
  title: string
  description: string
}

export const FICHA_SECTION_KEYS: FichaSectionKey[] = [
  'patrimonioInfo',
  'acquisition',
  'location',
  'depreciation',
]

// Campos disponíveis (todos os selecionáveis) por tipo e seção.
export const FICHA_FIELDS_BY_TYPE: Record<
  FichaType,
  Record<FichaSectionKey, FichaFieldOption[]>
> = {
  bens: {
    patrimonioInfo: [
      { value: 'descricao_bem', label: 'Descrição do Bem' },
      { value: 'tipo', label: 'Tipo' },
      { value: 'marca', label: 'Marca' },
      { value: 'modelo', label: 'Modelo' },
      { value: 'cor', label: 'Cor' },
      { value: 'numero_serie', label: 'Número de Série' },
    ],
    acquisition: [
      { value: 'data_aquisicao', label: 'Data de Aquisição' },
      { value: 'valor_aquisicao', label: 'Valor de Aquisição' },
      { value: 'forma_aquisicao', label: 'Forma de Aquisição' },
    ],
    location: [
      { value: 'setor_responsavel', label: 'Setor Responsável' },
      { value: 'local_objeto', label: 'Local' },
      { value: 'status', label: 'Status' },
    ],
    depreciation: [
      { value: 'metodo_depreciacao', label: 'Método de Depreciação' },
      { value: 'vida_util_anos', label: 'Vida Útil (anos)' },
      { value: 'valor_residual', label: 'Valor Residual' },
    ],
  },
  imoveis: {
    patrimonioInfo: [
      { value: 'denominacao', label: 'Denominação' },
      { value: 'tipo_imovel', label: 'Tipo de Imóvel' },
      { value: 'situacao', label: 'Situação' },
    ],
    acquisition: [
      { value: 'data_aquisicao', label: 'Data de Aquisição' },
      { value: 'valor_aquisicao', label: 'Valor de Aquisição' },
    ],
    location: [
      { value: 'endereco', label: 'Endereço Completo' },
      { value: 'setor', label: 'Setor Responsável' },
      { value: 'latitude', label: 'Latitude' },
      { value: 'longitude', label: 'Longitude' },
    ],
    depreciation: [
      { value: 'area_terreno', label: 'Área do Terreno' },
      { value: 'area_construida', label: 'Área Construída' },
    ],
  },
}

// Campos pré-selecionados ao criar um template novo / quando o config não traz
// fields para a seção.
export const FICHA_DEFAULT_FIELDS_BY_TYPE: Record<
  FichaType,
  Record<FichaSectionKey, string[]>
> = {
  bens: {
    patrimonioInfo: ['descricao_bem', 'tipo', 'marca', 'modelo'],
    acquisition: ['data_aquisicao', 'valor_aquisicao', 'forma_aquisicao'],
    location: ['setor_responsavel', 'local_objeto', 'status'],
    depreciation: ['metodo_depreciacao', 'vida_util_anos', 'valor_residual'],
  },
  imoveis: {
    patrimonioInfo: ['denominacao', 'tipo_imovel', 'situacao'],
    acquisition: ['data_aquisicao', 'valor_aquisicao'],
    location: ['endereco', 'setor', 'latitude', 'longitude'],
    depreciation: ['area_terreno', 'area_construida'],
  },
}

// Título + descrição de cada seção, por tipo (as 4 seções servem para os dois).
export const FICHA_SECTION_META_BY_TYPE: Record<
  FichaType,
  Record<FichaSectionKey, FichaSectionMeta>
> = {
  bens: {
    patrimonioInfo: {
      title: 'Informações do Bem',
      description: 'Campos de identificação do bem (descrição, marca, modelo…).',
    },
    acquisition: {
      title: 'Informações de Aquisição',
      description: 'Data, valor e forma de aquisição.',
    },
    location: {
      title: 'Localização e Estado',
      description: 'Setor responsável, local e status.',
    },
    depreciation: {
      title: 'Informações de Depreciação',
      description: 'Método, vida útil e valor residual.',
    },
  },
  imoveis: {
    patrimonioInfo: {
      title: 'Identificação do Imóvel',
      description: 'Denominação, tipo de imóvel e situação.',
    },
    acquisition: {
      title: 'Informações Financeiras',
      description: 'Data e valor de aquisição.',
    },
    location: {
      title: 'Localização',
      description: 'Endereço, setor responsável e coordenadas.',
    },
    depreciation: {
      title: 'Medidas e Dimensões',
      description: 'Área do terreno e área construída.',
    },
  },
}
