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

export const createInventarioSchema = z.object({
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
});
export type CreateInventarioInput = z.infer<typeof createInventarioSchema>;

export const updateInventarioSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema,
    setor: setorSchema.optional(),
    local: z.string().max(100).optional(),
    status: inventarioStatusSchema.optional(),
    dataFim: isoDateSchema.optional().nullable(),
  })
  .strict();
export type UpdateInventarioInput = z.infer<typeof updateInventarioSchema>;
