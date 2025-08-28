import * as z from 'zod'

export const patrimonioBaseSchema = z.object({
  descricao: z
    .string()
    .min(3, 'A descrição deve ter no mínimo 3 caracteres.')
    .max(200, 'A descrição deve ter no máximo 200 caracteres.'),
  tipo: z
    .string()
    .min(1, 'Tipo é obrigatório.')
    .max(50, 'O tipo deve ter no máximo 50 caracteres.'),
  marca: z
    .string()
    .max(50, 'A marca deve ter no máximo 50 caracteres.')
    .optional(),
  modelo: z
    .string()
    .max(50, 'O modelo deve ter no máximo 50 caracteres.')
    .optional(),
  cor: z.string().max(30, 'A cor deve ter no máximo 30 caracteres.').optional(),
  numero_serie: z
    .string()
    .max(50, 'O número de série deve ter no máximo 50 caracteres.')
    .optional(),
  data_aquisicao: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de aquisição inválida.',
  }),
  valor_aquisicao: z.coerce
    .number({ invalid_type_error: 'O valor deve ser um número.' })
    .min(0.01, 'O valor deve ser maior que zero.'),
  quantidade: z.coerce
    .number({ invalid_type_error: 'A quantidade deve ser um número.' })
    .int('A quantidade deve ser um número inteiro.')
    .min(1, 'A quantidade deve ser no mínimo 1.')
    .default(1),
  numero_nota_fiscal: z
    .string()
    .min(1, 'Nota fiscal é obrigatória.')
    .max(50, 'A nota fiscal deve ter no máximo 50 caracteres.'),
  forma_aquisicao: z
    .string()
    .min(1, 'Forma de aquisição é obrigatória.')
    .max(50, 'A forma de aquisição deve ter no máximo 50 caracteres.'),
  setor_responsavel: z.string().min(1, 'Setor é obrigatório.'),
  local_objeto: z.string().min(1, 'Localização é obrigatória.'),
  situacao_bem: z.enum(['OTIMO', 'BOM', 'REGULAR', 'RUIM', 'PESSIMO'], {
    required_error: 'Situação é obrigatória.',
  }),
  fotos: z.array(z.any()).optional(),
  documentos: z.array(z.any()).optional(),
  metodo_depreciacao: z.enum(['Linear']).optional(),
  vida_util_anos: z.coerce
    .number()
    .min(0, 'Vida útil não pode ser negativa.')
    .optional(),
  valor_residual: z.coerce
    .number()
    .min(0, 'Valor residual não pode ser negativo.')
    .optional(),
})

export const patrimonioEditSchema = patrimonioBaseSchema.extend({
  numero_patrimonio: z.string().min(1, 'Número de patrimônio é obrigatório.'),
  status: z.enum(['ativo', 'inativo', 'manutencao', 'baixado', 'extraviado'], {
    required_error: 'Status é obrigatório.',
  }),
  data_baixa: z.string().optional(),
  motivo_baixa: z.string().optional(),
})
