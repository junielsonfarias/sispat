import { z } from 'zod';

// Notificação interna. `model Notification` em `backend/prisma/schema.prisma`.
//
// `userId` é opcional aqui — o controller cobra:
//   - non-admin: força `userId = req.user.userId` (não pode spoofar destino).
//   - admin/superuser: pode notificar terceiros.

export const createNotificationSchema = z.object({
  userId: z.string().uuid('userId deve ser um UUID válido.').optional(),
  tipo: z
    .string()
    .trim()
    .min(1, 'Tipo é obrigatório.')
    .max(50, 'Tipo deve ter no máximo 50 caracteres.'),
  titulo: z
    .string()
    .trim()
    .min(1, 'Título é obrigatório.')
    .max(200, 'Título deve ter no máximo 200 caracteres.'),
  mensagem: z
    .string()
    .trim()
    .min(1, 'Mensagem é obrigatória.')
    .max(1000, 'Mensagem deve ter no máximo 1000 caracteres.'),
  link: z
    .string()
    .max(500, 'Link deve ter no máximo 500 caracteres.')
    .optional()
    .nullable(),
});
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
