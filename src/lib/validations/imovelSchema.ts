import * as z from 'zod'

export const imovelBaseSchema = z.object({
  numero_patrimonio: z.string().min(1, 'O número de patrimônio é obrigatório.'),
  denominacao: z.string().min(1, 'A denominação é obrigatória.'),
  endereco: z.string().min(1, 'O endereço é obrigatório.'),
  setor: z.string().min(1, 'O setor é obrigatório.'),
  data_aquisicao: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de aquisição inválida.',
  }),
  valor_aquisicao: z.coerce
    .number()
    .min(0.01, 'O valor deve ser maior que zero.'),
  area_terreno: z.coerce.number().optional(),
  area_construida: z.coerce.number().optional(),
  latitude: z.coerce
    .number({ invalid_type_error: 'Latitude deve ser um número.' })
    .min(-90, 'Latitude deve ser maior que -90.')
    .max(90, 'Latitude deve ser menor que 90.')
    .optional()
    .or(z.literal('')),
  longitude: z.coerce
    .number({ invalid_type_error: 'Longitude deve ser um número.' })
    .min(-180, 'Longitude deve ser maior que -180.')
    .max(180, 'Longitude deve ser menor que 180.')
    .optional()
    .or(z.literal('')),
  fotos: z.array(z.string()).optional(),
  documentos: z.array(z.string()).optional(),
})
