import { z } from 'zod';

// Manutenção (tarefa de reparo/inspeção sobre um patrimônio OU imóvel).
// `model ManutencaoTask` em `backend/prisma/schema.prisma`.
//
// Regra de XOR `patrimonioId` ↔ `imovelId`: ambos opcionais aqui — o
// controller verifica que **exatamente um** dos dois está presente
// (presença de ambos ou nenhum é rejeitada lá; é mais semântico que
// expressar via Zod refine).

export const manutencaoTipoSchema = z.enum([
  'preventiva',
  'corretiva',
  'preditiva',
]);
export type ManutencaoTipo = z.infer<typeof manutencaoTipoSchema>;

export const manutencaoPrioridadeSchema = z.enum([
  'baixa',
  'media',
  'alta',
  'urgente',
]);
export type ManutencaoPrioridade = z.infer<typeof manutencaoPrioridadeSchema>;

export const manutencaoStatusSchema = z.enum([
  'pendente',
  'em_andamento',
  'concluida',
  'cancelada',
]);
export type ManutencaoStatus = z.infer<typeof manutencaoStatusSchema>;

const isoDateSchema = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

const tituloSchema = z
  .string()
  .trim()
  .min(1, 'Título é obrigatório.')
  .max(200, 'Título deve ter no máximo 200 caracteres.');

const descricaoCreateSchema = z
  .string()
  .trim()
  .min(1, 'Descrição é obrigatória.')
  .max(2000, 'Descrição deve ter no máximo 2000 caracteres.');

const descricaoUpdateSchema = descricaoCreateSchema; // mesmo limite

const responsavelSchema = z
  .string()
  .max(200, 'Responsável deve ter no máximo 200 caracteres.')
  .optional()
  .nullable();

const observacoesSchema = z
  .string()
  .max(2000, 'Observações devem ter no máximo 2000 caracteres.')
  .optional()
  .nullable();

const custoSchema = z
  .coerce.number()
  .min(0, 'Custo não pode ser negativo.')
  .optional()
  .nullable();

export const createManutencaoSchema = z.object({
  patrimonioId: z.string().uuid('patrimonioId deve ser UUID.').optional().nullable(),
  imovelId: z.string().uuid('imovelId deve ser UUID.').optional().nullable(),
  tipo: manutencaoTipoSchema,
  titulo: tituloSchema,
  descricao: descricaoCreateSchema,
  prioridade: manutencaoPrioridadeSchema,
  // status opcional na criação (default 'pendente' no controller): o form permite
  // criar já "Em andamento"/"Concluída"; antes era descartado.
  status: manutencaoStatusSchema.optional(),
  responsavel: responsavelSchema,
  dataPrevista: isoDateSchema,
  custo: custoSchema,
  observacoes: observacoesSchema,
});
export type CreateManutencaoInput = z.infer<typeof createManutencaoSchema>;

export const updateManutencaoSchema = z
  .object({
    tipo: manutencaoTipoSchema.optional(),
    titulo: tituloSchema.optional(),
    descricao: descricaoUpdateSchema.optional(),
    prioridade: manutencaoPrioridadeSchema.optional(),
    status: manutencaoStatusSchema.optional(),
    responsavel: responsavelSchema,
    dataPrevista: isoDateSchema.optional(),
    dataConclusao: isoDateSchema.optional().nullable(),
    custo: custoSchema,
    observacoes: observacoesSchema,
  })
  .strict();
export type UpdateManutencaoInput = z.infer<typeof updateManutencaoSchema>;
