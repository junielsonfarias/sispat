import { z } from 'zod';

// Schemas reutilizáveis em qualquer rota: validar `:id`, paginação padrão, etc.
// Mantidos aqui para evitar redefinir em cada domínio.

// Param `:id` — aceita QUALQUER id não-vazio (não só UUID). Registros criados
// pela app usam `@default(uuid())`, MAS o seed/demo cria IDs amigáveis
// (`municipality-1`, `user-supervisor`, `user-superuser`). Exigir UUID aqui fazia
// PUT/DELETE nesses registros do seed falhar com 400. O formato não agrega
// segurança (id é server-side; a existência/tenant é checada no Prisma → 404 se
// não existir), então validamos apenas "string não-vazia".
export const uuidParamSchema = z.object({
  id: z.string().trim().min(1, 'ID é obrigatório.').max(128, 'ID inválido.'),
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
