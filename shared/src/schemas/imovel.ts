import { z } from 'zod';

// Imóvel — schemas Zod canônicos compartilhados (Sprint 22).
//
// DECISÃO DE DESIGN: os campos do formulário do frontend e os campos que o
// backend realmente lê/grava NÃO coincidem completamente:
//
//   Frontend usa: cep, bairro, cidade, estado, cpf_responsavel,
//                 nome_responsavel, area_total (≠ area_terreno!),
//                 escritura_numero, escritura_data, registro_cartorio.
//
//   Backend (service/DB) usa: setor, area_terreno (≠ area_total!),
//                             latitude, longitude, descricao,
//                             tipo_imovel, situacao, url_documentos,
//                             customFields, sectorId.
//
// Por causa dessa divergência de nomes (área_total vs area_terreno) e de
// campos que só existem num dos lados, NÃO é possível ter um único "base
// schema" verdadeiramente compartilhado sem ou renomear campos no DB/API
// (mudança invasiva) ou aceitar que o schema do frontend valide campos que
// o backend ignora (inofensivo, mas confuso).
//
// Estratégia adotada (menos risco):
//   - imovelFrontendSchema: valida o shape do formulário UI (campos do front).
//   - createImovelBodySchema / updateImovelBodySchema: validam o shape real
//     que o backend lê. Usam .passthrough() porque zodValidate substitui
//     req.body e o service lê campos extras (sectorId, customFields,
//     url_documentos). Sem passthrough esses campos seriam descartados.
//
// O frontend importa `imovelFrontendSchema` + `ImovelFormData`.
// O backend importa `createImovelBodySchema` + `updateImovelBodySchema`.

// ---------------------------------------------------------------------------
// Helpers de validação para o formulário de imóvel (frontend)
// ---------------------------------------------------------------------------

function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === parseInt(cpf.charAt(10));
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

function validateCEP(cep: string): boolean {
  cep = cep.replace(/[^\d]/g, '');
  if (cep.length !== 8) return false;
  return !/^(\d)\1{7}$/.test(cep);
}

function validateCPFOrCNPJ(doc: string): boolean {
  const cleaned = doc.replace(/[^\d]/g, '');
  if (cleaned.length === 11) return validateCPF(cleaned);
  if (cleaned.length === 14) return validateCNPJ(cleaned);
  return false;
}

const cepSchema = z
  .string()
  .refine(validateCEP, { message: 'CEP inválido' });

const cpfOrCnpjSchema = z
  .string()
  .refine(validateCPFOrCNPJ, { message: 'CPF/CNPJ inválido' });

// ---------------------------------------------------------------------------
// Reutilizáveis internos
// ---------------------------------------------------------------------------

const fotoItemSchema = z.union([
  z.string(),
  z
    .object({ file_url: z.string().optional(), url: z.string().optional() })
    .passthrough()
    .refine((v) => typeof v.file_url === 'string' || typeof v.url === 'string', {
      message: 'Cada foto deve ser URL (string) ou objeto { file_url }',
    }),
]);

const fotosSchema = z.array(fotoItemSchema).optional();

// ---------------------------------------------------------------------------
// Schema para o FRONTEND (formulário react-hook-form + zodResolver)
// Campos validados: os que o UI de criação/edição de imóvel coleta.
// ---------------------------------------------------------------------------

export const imovelFrontendSchema = z.object({
  numero_patrimonio: z
    .string()
    .min(1, 'Número patrimonial é obrigatório.')
    .max(50, 'Número deve ter no máximo 50 caracteres.'),

  denominacao: z
    .string()
    .min(3, 'Denominação deve ter no mínimo 3 caracteres.')
    .max(200, 'Denominação deve ter no máximo 200 caracteres.'),

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

  cpf_responsavel: cpfOrCnpjSchema.optional().or(z.literal('')),

  nome_responsavel: z
    .string()
    .max(200, 'Nome do responsável deve ter no máximo 200 caracteres.')
    .optional(),

  // O frontend chama "area_total" (o backend usa "area_terreno").
  // Esse campo é mapeado pelo frontend antes de enviar ao backend.
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

  escritura_data: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Data da escritura inválida.',
    })
    .optional(),

  registro_cartorio: z
    .string()
    .max(200, 'Registro do cartório deve ter no máximo 200 caracteres.')
    .optional(),

  observacoes: z
    .string()
    .max(1000, 'Observações muito longas.')
    .optional(),

  fotos: fotosSchema,
});

/** Shape estendido com campos do controller para criação (frontend → backend) */
export const imovelCreateFrontendSchema = imovelFrontendSchema.extend({
  sectorId: z.string().uuid('Setor inválido'),
  municipalityId: z.string().uuid('Município inválido').optional(),
});

export type ImovelFormData = z.infer<typeof imovelFrontendSchema>;
export type ImovelCreateFormData = z.infer<typeof imovelCreateFrontendSchema>;

// ---------------------------------------------------------------------------
// Schemas de BACKEND (body do POST/PUT /api/imoveis)
// ---------------------------------------------------------------------------
// IMPORTANTE: usam .passthrough() porque zodValidate substitui req.body
// pelo objeto parseado e o service lê campos extras (sectorId, customFields,
// url_documentos) que não aparecem no schema declarativo. Sem passthrough
// esses campos seriam descartados silenciosamente → bug de dados.
// ---------------------------------------------------------------------------

export const createImovelBodySchema = z
  .object({
    numero_patrimonio: z
      .string()
      .min(1, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .max(50, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .regex(
        /^[A-Za-z0-9\-_]+$/,
        'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.',
      ),

    denominacao: z
      .string()
      .min(1, 'Denominação deve ter entre 1 e 200 caracteres.')
      .max(200, 'Denominação deve ter entre 1 e 200 caracteres.'),

    endereco: z
      .string()
      .min(1, 'Endereço deve ter entre 1 e 300 caracteres.')
      .max(300, 'Endereço deve ter entre 1 e 300 caracteres.'),

    setor: z
      .string()
      .min(1, 'Setor deve ter entre 1 e 100 caracteres.')
      .max(100, 'Setor deve ter entre 1 e 100 caracteres.')
      .optional(),

    data_aquisicao: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Data de aquisição deve ser uma data válida.',
      }),

    valor_aquisicao: z.coerce
      .number({ invalid_type_error: 'Valor de aquisição deve ser um número.' })
      .min(0, 'Valor de aquisição deve ser um número positivo.'),

    // Backend usa "area_terreno" (não "area_total" como o frontend)
    area_terreno: z.coerce
      .number({ invalid_type_error: 'Área do terreno deve ser um número.' })
      .min(0, 'Área do terreno deve ser um número positivo.')
      .optional(),

    area_construida: z.coerce
      .number({ invalid_type_error: 'Área construída deve ser um número.' })
      .min(0, 'Área construída deve ser um número positivo.')
      .optional(),

    tipo_imovel: z
      .string()
      .max(50, 'Tipo deve ter no máximo 50 caracteres.')
      .optional(),

    situacao: z
      .string()
      .max(50, 'Situação deve ter no máximo 50 caracteres.')
      .optional(),

    latitude: z.coerce
      .number({ invalid_type_error: 'Latitude deve ser um número.' })
      .min(-90, 'Latitude deve estar entre -90 e 90.')
      .max(90, 'Latitude deve estar entre -90 e 90.')
      .optional()
      .nullable(),

    longitude: z.coerce
      .number({ invalid_type_error: 'Longitude deve ser um número.' })
      .min(-180, 'Longitude deve estar entre -180 e 180.')
      .max(180, 'Longitude deve estar entre -180 e 180.')
      .optional()
      .nullable(),

    fotos: fotosSchema,
  })
  .passthrough();

export type CreateImovelBody = z.infer<typeof createImovelBodySchema>;

export const updateImovelBodySchema = z
  .object({
    numero_patrimonio: z
      .string()
      .min(1, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .max(50, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .regex(
        /^[A-Za-z0-9\-_]+$/,
        'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.',
      )
      .optional(),

    denominacao: z
      .string()
      .min(1, 'Denominação deve ter entre 1 e 200 caracteres.')
      .max(200, 'Denominação deve ter entre 1 e 200 caracteres.')
      .optional(),

    endereco: z
      .string()
      .min(1, 'Endereço deve ter entre 1 e 300 caracteres.')
      .max(300, 'Endereço deve ter entre 1 e 300 caracteres.')
      .optional(),

    setor: z
      .string()
      .min(1, 'Setor deve ter entre 1 e 100 caracteres.')
      .max(100, 'Setor deve ter entre 1 e 100 caracteres.')
      .optional(),

    data_aquisicao: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Data de aquisição deve ser uma data válida.',
      })
      .optional(),

    valor_aquisicao: z.coerce
      .number({ invalid_type_error: 'Valor de aquisição deve ser um número.' })
      .min(0, 'Valor de aquisição deve ser um número positivo.')
      .optional(),

    area_terreno: z.coerce
      .number({ invalid_type_error: 'Área do terreno deve ser um número.' })
      .min(0, 'Área do terreno deve ser um número positivo.')
      .optional(),

    area_construida: z.coerce
      .number({ invalid_type_error: 'Área construída deve ser um número.' })
      .min(0, 'Área construída deve ser um número positivo.')
      .optional(),

    tipo_imovel: z
      .string()
      .max(50, 'Tipo deve ter no máximo 50 caracteres.')
      .optional(),

    situacao: z
      .string()
      .max(50, 'Situação deve ter no máximo 50 caracteres.')
      .optional(),

    latitude: z.coerce
      .number({ invalid_type_error: 'Latitude deve ser um número.' })
      .min(-90, 'Latitude deve estar entre -90 e 90.')
      .max(90, 'Latitude deve estar entre -90 e 90.')
      .optional()
      .nullable(),

    longitude: z.coerce
      .number({ invalid_type_error: 'Longitude deve ser um número.' })
      .min(-180, 'Longitude deve estar entre -180 e 180.')
      .max(180, 'Longitude deve estar entre -180 e 180.')
      .optional()
      .nullable(),

    fotos: fotosSchema,
  })
  .passthrough();

export type UpdateImovelBody = z.infer<typeof updateImovelBodySchema>;
