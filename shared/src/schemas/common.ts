import { z } from 'zod';

// Schemas reutilizáveis em qualquer rota: validar `:id` UUID, paginação
// padrão, etc. Mantidos aqui para evitar redefinir em cada domínio.

export const uuidParamSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido.'),
});
export type UuidParam = z.infer<typeof uuidParamSchema>;

// Query de paginação padrão do SISPAT.
//   - page: opcional, inteiro ≥ 1 (default = 1 quando ausente)
//   - limit: opcional, inteiro 1–100 (default = 20 quando ausente)
//   - search: string ≤ 100 chars
//   - sortBy: whitelist conhecido pelo backend (createdAt, updatedAt, name,
//     numero_patrimonio); rotas com colunas adicionais podem extender via
//     `.merge(z.object({ sortBy: z.enum([...]) }))`.
//   - sortOrder: asc | desc
//
// IMPORTANTE: Como vem da query string, todos os valores chegam como string;
// usamos `coerce` para inteiros e marcamos `.optional()` para tolerar ausência.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().min(1).max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name', 'numero_patrimonio'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
