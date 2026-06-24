import { z } from 'zod';

// Inventário (auditoria de bens de um setor ou local). `model Inventory`
// em `backend/prisma/schema.prisma`. Espelha as validações do service
// (`backend/src/services/inventarioService.ts`, Sprint 18).

export const inventarioScopeSchema = z.enum([
  'sector',
  'location',
  'specific_location',
]);
export type InventarioScope = z.infer<typeof inventarioScopeSchema>;

export const inventarioStatusSchema = z.enum([
  'em_andamento',
  'concluido',
  'cancelado',
]);
export type InventarioStatus = z.infer<typeof inventarioStatusSchema>;

const isoDateSchema = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Título é obrigatório.')
  .max(200, 'Título deve ter no máximo 200 caracteres.');

const descriptionSchema = z
  .string()
  .max(1000, 'Descrição deve ter no máximo 1000 caracteres.')
  .optional();

const setorSchema = z
  .string()
  .trim()
  .min(1, 'Setor é obrigatório.')
  .max(100, 'Setor deve ter no máximo 100 caracteres.');

// Tipos de inventário (Cap VII da Lei): anual (data-base 31/12), transferência
// (troca de responsável), extraordinário, inicial (implantação).
export const tipoInventarioSchema = z.enum([
  'anual',
  'transferencia',
  'extraordinario',
  'inicial',
]);
export type TipoInventario = z.infer<typeof tipoInventarioSchema>;

export const createInventarioSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    setor: setorSchema,
    local: z.string().max(100).optional(),
    // `scope` controla como o service vai puxar os patrimônios:
    //   - sector: todos do setor (filtro padrão).
    //   - location: filtra também por `local_objeto` (case-insensitive).
    //   - specific_location: trata `local` como localId UUID.
    scope: inventarioScopeSchema.optional(),
    dataInicio: isoDateSchema.optional(),
    tipo: tipoInventarioSchema.optional(),
    dataBase: isoDateSchema.optional(),
    exercicio: z.coerce.number().int().min(2000).max(2100).optional(),
    agenteAnterior: z.string().max(150).optional(),
    agenteNovo: z.string().max(150).optional(),
  })
  // Inventário anual exige exercício (data-base 31/12 — Art. 16).
  .refine((d) => d.tipo !== 'anual' || !!d.exercicio, {
    message: 'Inventário anual requer o exercício (ano).',
    path: ['exercicio'],
  })
  .refine(
    (d) =>
      d.tipo !== 'anual' ||
      !d.dataBase ||
      (new Date(d.dataBase).getUTCMonth() === 11 && new Date(d.dataBase).getUTCDate() === 31),
    { message: 'No inventário anual a data-base deve ser 31/12.', path: ['dataBase'] },
  );
export type CreateInventarioInput = z.infer<typeof createInventarioSchema>;

export const updateInventarioSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema,
    setor: setorSchema.optional(),
    local: z.string().max(100).optional(),
    status: inventarioStatusSchema.optional(),
    dataFim: isoDateSchema.optional().nullable(),
    tipo: tipoInventarioSchema.optional(),
    dataBase: isoDateSchema.optional().nullable(),
    exercicio: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
    agenteAnterior: z.string().max(150).optional().nullable(),
    agenteNovo: z.string().max(150).optional().nullable(),
  })
  .strict();
export type UpdateInventarioInput = z.infer<typeof updateInventarioSchema>;

// Conferência de um item do inventário (marca encontrado/não encontrado).
// Persiste em InventoryItem.encontrado + verificadoEm/verificadoPor.
export const updateInventarioItemSchema = z
  .object({
    encontrado: z.boolean(),
    observacoes: z.string().max(1000).optional().nullable(),
  })
  .strict();
export type UpdateInventarioItemInput = z.infer<typeof updateInventarioItemSchema>;

// Params da rota de conferência de item: /inventarios/:id/items/:bemId
// `bemId` é o id do bem conferido — pode ser um patrimônio (móvel) OU um imóvel
// (Art. 16: o inventário cobre móveis e imóveis). O service resolve qual é via
// OR: [{ patrimonioId }, { imovelId }].
export const inventarioItemParamsSchema = z.object({
  id: z.string().uuid('ID do inventário inválido.'),
  bemId: z.string().uuid('ID do bem inválido.'),
});
export type InventarioItemParams = z.infer<typeof inventarioItemParamsSchema>;
