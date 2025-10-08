import { Patrimonio } from '@/types'

type PatrimonioField = {
  id: keyof Patrimonio
  label: string
}

export const patrimonioFields: PatrimonioField[] = [
  { id: 'numero_patrimonio', label: 'Nº Patrimônio' },
  { id: 'descricao_bem', label: 'Descrição' },
  { id: 'tipo', label: 'Tipo' },
  { id: 'marca', label: 'Marca' },
  { id: 'modelo', label: 'Modelo' },
  { id: 'cor', label: 'Cor' },
  { id: 'numero_serie', label: 'Nº de Série' },
  { id: 'data_aquisicao', label: 'Data de Aquisição' },
  { id: 'valor_aquisicao', label: 'Valor de Aquisição' },
  { id: 'quantidade', label: 'Quantidade' },
  { id: 'numero_nota_fiscal', label: 'Nota Fiscal' },
  { id: 'forma_aquisicao', label: 'Forma de Aquisição' },
  { id: 'setor_responsavel', label: 'Setor Responsável' },
  { id: 'local_objeto', label: 'Localização' },
  { id: 'status', label: 'Status' },
  { id: 'situacao_bem', label: 'Situação do Bem' },
  { id: 'data_baixa', label: 'Data da Baixa' },
  { id: 'motivo_baixa', label: 'Motivo da Baixa' },
  { id: 'entityName', label: 'Nome da Entidade' },
  { id: 'fotos', label: 'Qtd. Fotos' },
  { id: 'documentos', label: 'Qtd. Documentos' },
]
