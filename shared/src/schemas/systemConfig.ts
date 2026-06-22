import { z } from 'zod';

// Configuração global do sistema (única linha). `model SystemConfiguration`
// em `backend/prisma/schema.prisma`. Editável só por admin/superuser.
//
// O controller (`systemConfigController.updateSystemConfiguration`) usa um
// whitelist `ALLOWED_CONFIG_FIELDS` que descarta campos extras silenciosamente
// (evita mass-assignment de id/updatedAt). Para preservar esse comportamento
// NÃO usamos `.strict()` aqui — só rejeitamos tipos/limites inválidos cedo.

export const updateSystemConfigSchema = z.object({
  autoBackupEnabled: z.boolean().optional(),
  backupFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  maintenanceMode: z.boolean().optional(),
  allowPublicSearch: z.boolean().optional(),
  maxUploadSize: z.number().int().positive().optional(),
  sessionTimeout: z.number().int().positive().optional(),
  passwordExpiryDays: z.number().int().nonnegative().optional(),
  requirePasswordChange: z.boolean().optional(),
});
export type UpdateSystemConfigInput = z.infer<typeof updateSystemConfigSchema>;
