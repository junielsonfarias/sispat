import { Imovel, ImovelFieldConfig } from '@/types'

type ImovelField = {
  id: keyof Imovel | `customFields.${string}`
  label: string
}

export const imovelBaseFields: ImovelField[] = [
  { id: 'numero_patrimonio', label: 'Nº Patrimônio' },
  { id: 'denominacao', label: 'Denominação' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'data_aquisicao', label: 'Data de Aquisição' },
  { id: 'valor_aquisicao', label: 'Valor de Aquisição' },
  { id: 'area_terreno', label: 'Área do Terreno (m²)' },
  { id: 'area_construida', label: 'Área Construída (m²)' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'documentos', label: 'Documentos' },
]

export const getImovelFields = (
  customFields: ImovelFieldConfig[],
): ImovelField[] => {
  const customFieldsMapped = customFields
    .filter((f) => f.isCustom)
    .map((f) => ({ id: `customFields.${f.key}` as const, label: f.label }))
  return [...imovelBaseFields, ...customFieldsMapped]
}
