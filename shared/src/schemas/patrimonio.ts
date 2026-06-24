import { z } from 'zod';

// Patrimônio — schemas Zod canônicos compartilhados (Sprint 22).
//
// ESTRUTURA:
//   patrimonioBaseSchema      — campos validados TANTO pelo frontend quanto
//                               pelo backend. Nomes idênticos nos dois lados.
//   createPatrimonioBodySchema — body do POST /api/patrimonios (backend).
//                               Adiciona .passthrough() para não silenciar
//                               campos extras (sectorId, localId, tipoId,
//                               acquisitionFormId) que o controller/service
//                               lê de req.body. zodValidate substitui req.body
//                               pelo objeto parseado; sem passthrough esses
//                               campos seriam descartados → bug de dados.
//   updatePatrimonioBodySchema — body do PUT /api/patrimonios/:id (backend).
//                               Todos opcionais + passthrough.
//   patrimonioCreateSchema    — schema para o formulário de criação (frontend).
//   patrimonioEditSchema      — schema para o formulário de edição (frontend),
//                               com refinamento de motivo_baixa obrigatório
//                               quando status === 'baixado'.

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

const isoDateSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Data de aquisição deve ser uma data válida.',
});

// ---------------------------------------------------------------------------
// Base: campos com nomes iguais nos dois lados (front e back)
// ---------------------------------------------------------------------------

export const patrimonioBaseSchema = z.object({
  descricao_bem: z
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

  cor: z
    .string()
    .max(30, 'A cor deve ter no máximo 30 caracteres.')
    .optional(),

  numero_serie: z
    .string()
    .max(50, 'O número de série deve ter no máximo 50 caracteres.')
    .optional(),

  data_aquisicao: isoDateSchema,

  valor_aquisicao: z.coerce
    .number({ invalid_type_error: 'O valor deve ser um número.' })
    .min(0, 'O valor de aquisição deve ser positivo ou zero.'),

  quantidade: z.coerce
    .number({ invalid_type_error: 'A quantidade deve ser um número.' })
    .int('A quantidade deve ser um número inteiro.')
    .min(1, 'A quantidade deve ser no mínimo 1.')
    .default(1),

  numero_nota_fiscal: z
    .string()
    .max(50, 'A nota fiscal deve ter no máximo 50 caracteres.')
    .optional(),

  forma_aquisicao: z
    .string()
    .min(1, 'Forma de aquisição é obrigatória.')
    .max(50, 'A forma de aquisição deve ter no máximo 50 caracteres.'),

  numero_licitacao: z
    .string()
    .max(50, 'O número da licitação deve ter no máximo 50 caracteres.')
    .optional(),

  ano_licitacao: z.coerce
    .number({ invalid_type_error: 'O ano deve ser um número.' })
    .int('O ano deve ser um número inteiro.')
    .min(2000, 'O ano deve ser maior ou igual a 2000.')
    .max(2100, 'O ano deve ser menor ou igual a 2100.')
    .optional()
    .nullable(),

  setor_responsavel: z
    .string()
    .min(1, 'Setor é obrigatório.')
    .max(100, 'Setor responsável deve ter entre 1 e 100 caracteres.'),

  local_objeto: z
    .string()
    .min(1, 'Localização é obrigatória.')
    .max(100, 'Local do objeto deve ter entre 1 e 100 caracteres.'),

  situacao_bem: z
    .enum(['otimo', 'bom', 'regular', 'ruim', 'pessimo'], {
      errorMap: () => ({
        message: 'Situação deve ser: otimo, bom, regular, ruim ou pessimo',
      }),
    })
    .optional(),

  status: z
    .enum(['ativo', 'inativo', 'manutencao', 'baixado', 'extraviado'], {
      errorMap: () => ({
        message: 'Status inválido',
      }),
    })
    .default('ativo'),

  observacoes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres.')
    .optional()
    .nullable(),

  fotos: fotosSchema,
  documentos: fotosSchema,

  // Posse (Art. 13 §3): bens em cessão/comodato não integram o ativo do
  // município (excluídos da conciliação físico-contábil). Default 'proprio'.
  tipo_posse: z.enum(['proprio', 'cessao', 'comodato']).default('proprio'),

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
    .min(1, 'A quantidade de unidades deve ser no mínimo 1.')
    .max(10000, 'A quantidade de unidades deve ser no máximo 10000.')
    .optional()
    .nullable(),

  url_documentos: z
    .string()
    .url('URL inválida.')
    .optional()
    .or(z.literal('')),

  // z.any() (não z.unknown()) preserva o tipo `any[]` original do frontend —
  // o campo é espalhado em <Input {...field}>, que rejeita `unknown[]`.
  documentos_pdf: z.array(z.any()).optional(),

  data_baixa: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Data de baixa inválida.',
    })
    .optional()
    .nullable(),

  motivo_baixa: z
    .string()
    .max(500, 'Motivo de baixa deve ter no máximo 500 caracteres.')
    .optional()
    .nullable(),

  documentos_baixa: z.array(z.string()).optional(),

  tipoBemId: z.string().optional(),
});

export type PatrimonioBase = z.infer<typeof patrimonioBaseSchema>;

// ---------------------------------------------------------------------------
// Schemas de BACKEND (body do POST/PUT)
// ---------------------------------------------------------------------------
// IMPORTANTE: ambos usam .passthrough() porque zodValidate substitui req.body
// pelo objeto parseado e o service lê campos adicionais (sectorId, localId,
// tipoId, acquisitionFormId, numero_patrimonio) que não estão declarados no
// base schema. Sem passthrough esses campos seriam descartados silenciosamente.
// ---------------------------------------------------------------------------

export const createPatrimonioBodySchema = patrimonioBaseSchema
  .extend({
    numero_patrimonio: z
      .string()
      .min(1, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .max(50, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .regex(
        /^[A-Za-z0-9\-_]+$/,
        'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.',
      ),
  })
  .passthrough();

export type CreatePatrimonioBody = z.infer<typeof createPatrimonioBodySchema>;

export const updatePatrimonioBodySchema = patrimonioBaseSchema
  .extend({
    numero_patrimonio: z
      .string()
      .min(1, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .max(50, 'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.')
      .regex(
        /^[A-Za-z0-9\-_]+$/,
        'Número do patrimônio deve ter 1 a 50 caracteres alfanuméricos.',
      )
      .optional(),
    status: z
      .enum(['ativo', 'inativo', 'manutencao', 'baixado', 'extraviado'])
      .optional(),
    situacao_bem: z
      .enum(['otimo', 'bom', 'regular', 'ruim', 'pessimo'])
      .optional()
      .nullable(),
  })
  .partial()
  .passthrough();

export type UpdatePatrimonioBody = z.infer<typeof updatePatrimonioBodySchema>;

// ---------------------------------------------------------------------------
// Sub-rotas operacionais: POST /:id/notes e POST /:id/baixa
// ---------------------------------------------------------------------------

// Observação adicionada ao patrimônio. O controller lê apenas `text`.
export const addNoteSchema = z.object({
  text: z
    .string()
    .min(1, 'Texto da nota é obrigatório (1 a 2000 caracteres)')
    .max(2000, 'Texto da nota é obrigatório (1 a 2000 caracteres)'),
});
export type AddNoteBody = z.infer<typeof addNoteSchema>;

// Baixa de patrimônio. data_baixa/motivo_baixa ficam OPCIONAIS aqui de
// propósito: o controller faz a checagem de obrigatoriedade e devolve a
// mensagem específica ('Data e motivo da baixa são obrigatórios'). `observacoes`
// é declarado porque o controller/service o lê (não estava no express-validator
// antigo, e o zodValidate descartaria campos não declarados).
export const registrarBaixaSchema = z.object({
  data_baixa: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Data de baixa deve ser uma data válida',
    })
    .optional(),
  motivo_baixa: z
    .string()
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
  documentos_baixa: z.array(z.string()).optional(),
  observacoes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional(),
});
export type RegistrarBaixaBody = z.infer<typeof registrarBaixaSchema>;

// ---------------------------------------------------------------------------
// Schemas de FRONTEND (formulários react-hook-form + zodResolver)
// ---------------------------------------------------------------------------
// O frontend é DELIBERADAMENTE mais estrito que o backend em dois campos
// (regras de negócio do formulário, preservadas da Sprint <22):
//   - valor_aquisicao: > 0 (backend aceita 0 — bens de valor simbólico/doados).
//   - quantidade_unidades: >= 2 (um "kit" só faz sentido com 2+ unidades).
// Mantemos esses overrides apenas no lado frontend para não alterar o
// comportamento do backend (createPatrimonioBodySchema herda do base = min 0/1).

const patrimonioFrontendBaseSchema = patrimonioBaseSchema.extend({
  valor_aquisicao: z.coerce
    .number({ invalid_type_error: 'O valor deve ser um número.' })
    .min(0.01, 'O valor deve ser maior que zero.'),
  quantidade_unidades: z.coerce
    .number()
    .int('A quantidade de unidades deve ser um número inteiro.')
    .min(2, 'A quantidade de unidades deve ser no mínimo 2.')
    .optional(),
});

// numero_patrimonio é gerado automaticamente no create; fica opcional no form
// só para o campo (desabilitado) que exibe o número gerado existir no schema.
export const patrimonioCreateSchema = patrimonioFrontendBaseSchema.extend({
  numero_patrimonio: z.string().optional(),
});
export type PatrimonioCreateFormData = z.infer<typeof patrimonioCreateSchema>;

export const patrimonioEditSchema = patrimonioFrontendBaseSchema
  .omit({ situacao_bem: true })
  .extend({
    numero_patrimonio: z
      .string()
      .min(1, 'Número de patrimônio é obrigatório.'),
    status: z.enum(['ativo', 'inativo', 'manutencao', 'baixado', 'extraviado'], {
      required_error: 'Status é obrigatório.',
    }),
    // Na edição, situacao_bem pode ser null (quando já está baixado)
    situacao_bem: z
      .enum(['otimo', 'bom', 'regular', 'ruim', 'pessimo'])
      .optional()
      .nullable(),
    data_baixa: z.string().optional().nullable(),
    motivo_baixa: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === 'baixado') {
        return !!data.motivo_baixa && data.motivo_baixa.length > 0;
      }
      return true;
    },
    {
      message: 'Motivo da baixa é obrigatório quando o status é "baixado"',
      path: ['motivo_baixa'],
    },
  );

export type PatrimonioEditFormData = z.infer<typeof patrimonioEditSchema>;
