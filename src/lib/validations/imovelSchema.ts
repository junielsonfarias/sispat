import * as z from 'zod'
import { cepSchema, cpfOrCnpjSchema } from './documentValidators'

export const imovelBaseSchema = z.object({
  numero_patrimonio: z
    .string()
    .min(1, 'Número patrimonial é obrigatório.')
    .max(50, 'Número deve ter no máximo 50 caracteres.'),
  denominacao: z
    .string()
    .min(3, 'Denominação deve ter no mínimo 3 caracteres.')
    .max(200, 'Denominação deve ter no máximo 200 caracteres.'),
  // ✅ NOVO: Validação de CEP
  cep: cepSchema.optional().or(z.literal('')),
  endereco: z
    .string()
    .min(5, 'Endereço deve ter no mínimo 5 caracteres.')
    .max(200, 'Endereço deve ter no máximo 200 caracteres.'),
  bairro: z
    .string()
    .max(100, 'Bairro deve ter no máximo 100 caracteres.')
    .optional(),
  cidade: z
    .string()
    .min(2, 'Cidade é obrigatória.')
    .max(100, 'Cidade deve ter no máximo 100 caracteres.'),
  estado: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres (UF).')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser uma UF válida (ex: SP, RJ)'),
  // ✅ NOVO: Validação de CPF/CNPJ do responsável
  cpf_responsavel: cpfOrCnpjSchema.optional().or(z.literal('')),
  nome_responsavel: z
    .string()
    .max(200, 'Nome do responsável deve ter no máximo 200 caracteres.')
    .optional(),
  area_total: z.coerce
    .number({ invalid_type_error: 'Área total deve ser um número.' })
    .positive('Área total deve ser positiva.')
    .optional(),
  area_construida: z.coerce
    .number({ invalid_type_error: 'Área construída deve ser um número.' })
    .positive('Área construída deve ser positiva.')
    .optional(),
  data_aquisicao: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de aquisição inválida.',
  }),
  valor_aquisicao: z.coerce
    .number({ invalid_type_error: 'Valor deve ser um número.' })
    .min(0.01, 'Valor deve ser maior que zero.'),
  escritura_numero: z
    .string()
    .max(100, 'Número da escritura deve ter no máximo 100 caracteres.')
    .optional(),
  escritura_data: z.string().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Data da escritura inválida.',
  }).optional(),
  registro_cartorio: z
    .string()
    .max(200, 'Registro do cartório deve ter no máximo 200 caracteres.')
    .optional(),
  observacoes: z.string().max(1000, 'Observações muito longas.').optional(),
})

export const imovelCreateSchema = imovelBaseSchema.extend({
  sectorId: z.string().uuid('Setor inválido'),
  municipalityId: z.string().uuid('Município inválido'),
})

export const imovelUpdateSchema = imovelBaseSchema.partial()

export type ImovelFormData = z.infer<typeof imovelBaseSchema>
