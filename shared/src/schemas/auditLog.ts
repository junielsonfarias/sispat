import { z } from 'zod';

// Audit Log (registro de auditoria de ações do usuário).
// `model ActivityLog` em `backend/prisma/schema.prisma`.
//
// O log é sempre atrelado ao usuário autenticado (`userId` vem de
// `req.user`, NUNCA do body) e ao seu município — por isso esses campos
// não aparecem aqui. `ipAddress`/`userAgent` são derivados da request.

const actionSchema = z
  .string()
  .trim()
  .min(1, 'Action é obrigatório.')
  .max(100, 'Action deve ter no máximo 100 caracteres.');

const entityTypeSchema = z
  .string()
  .trim()
  .max(100, 'entityType deve ter no máximo 100 caracteres.')
  .optional()
  .nullable();

const entityIdSchema = z
  .string()
  .trim()
  .max(255, 'entityId deve ter no máximo 255 caracteres.')
  .optional()
  .nullable();

// `details` é um campo JSON livre (objeto). Limitamos a um objeto para
// evitar payloads arbitrários (strings gigantes, arrays soltos).
const detailsSchema = z.record(z.string(), z.unknown()).optional().nullable();

export const createAuditLogSchema = z
  .object({
    action: actionSchema,
    entityType: entityTypeSchema,
    entityId: entityIdSchema,
    details: detailsSchema,
  })
  .strict();
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
