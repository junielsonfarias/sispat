import * as z from 'zod'

export const patrimonioBaseSchema = z.object({
  descricao_bem: z
    .string()
    .min(3, 'A descrição deve ter no mínimo 3 caracteres.')
    .max(200, 'A descrição deve ter no máximo 200 caracteres.'),
  tipo: z
    .string()
    .min(1, 'Tipo é obrigatório.')
    .max(50, 'O tipo deve ter no máximo 50 caracteres.'),
  tipoBemId: z.string().optional(),
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
  situacao_bem: z.enum(['bom', 'regular', 'ruim', 'pessimo'], {
    required_error: 'Situação é obrigatória.',
  }).optional(),
  status: z.enum(['ativo', 'inativo', 'manutencao'], {
    required_error: 'Status é obrigatório.',
  }).default('ativo'),
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
  eh_kit: z.boolean().default(false),
  quantidade_unidades: z.coerce
    .number()
    .int('A quantidade de unidades deve ser um número inteiro.')
    .min(2, 'A quantidade de unidades deve ser no mínimo 2.')
    .optional(),
  url_documentos: z
    .string()
    .url('URL inválida.')
    .optional()
    .or(z.literal('')),
  documentos_pdf: z.array(z.any()).optional(),
  observacoes: z.string().optional().nullable(),
})

export const patrimonioEditSchema = patrimonioBaseSchema
  .omit({ situacao_bem: true })
  .extend({
    numero_patrimonio: z.string().min(1, 'Número de patrimônio é obrigatório.'),
    status: z.enum(['ativo', 'inativo', 'manutencao', 'baixado', 'extraviado'], {
      required_error: 'Status é obrigatório.',
    }),
    // situacao_bem pode incluir 'baixado' na edição (quando já está baixado)
    situacao_bem: z.enum(['bom', 'regular', 'ruim', 'pessimo', 'baixado'], {
      required_error: 'Situação é obrigatória.',
    }).optional().nullable(),
    data_baixa: z.string().optional().nullable(),
    motivo_baixa: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // Se status é 'baixado', motivo_baixa é obrigatório
      if (data.status === 'baixado') {
        return !!data.motivo_baixa && data.motivo_baixa.length > 0
      }
      return true
    },
    {
      message: 'Motivo da baixa é obrigatório quando o status é "baixado"',
      path: ['motivo_baixa'],
    }
  )
