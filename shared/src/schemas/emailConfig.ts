import { z } from 'zod';

// Configuração SMTP de envio de email (única linha). `model EmailConfig` em
// `backend/prisma/schema.prisma`. Editável só por superuser.
//
// O controller (`emailConfigController.updateEmailConfig`) mantém a senha
// atual quando `password` não é enviado num update existente — por isso
// `password` é opcional aqui (a obrigatoriedade na criação é decidida no
// controller). Não usamos `.strict()` para não quebrar campos extras que o
// controller já ignora ao montar o `data` do Prisma.

export const updateEmailConfigSchema = z.object({
  host: z.string().trim().min(1, 'Host é obrigatório'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().optional(),
  user: z.string().trim().min(1, 'Usuário é obrigatório'),
  // Aceita '' (no update, quando a senha NÃO é redigitada) — o controller mantém
  // a senha atual nesse caso. Antes, .min(1) fazia '' dar 400 ao editar/togglar.
  password: z.string().max(200).optional(),
  fromAddress: z
    .string()
    .trim()
    .min(1, 'Endereço de origem é obrigatório')
    .refine((v) => v.includes('@'), 'Endereço de origem deve conter um email válido'),
  enabled: z.boolean().optional(),
});
export type UpdateEmailConfigInput = z.infer<typeof updateEmailConfigSchema>;

// Body do envio de email de teste (POST /api/email-config/test).
export const testEmailConfigSchema = z.object({
  email: z.string().trim().email('Email de teste inválido'),
});
export type TestEmailConfigInput = z.infer<typeof testEmailConfigSchema>;
