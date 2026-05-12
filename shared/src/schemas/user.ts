import { z } from 'zod';
import {
  STRONG_PASSWORD_REGEX,
  STRONG_PASSWORD_MESSAGE,
} from '../rules/password';

// Enum dos 5 papéis do SISPAT. Fonte única tanto para validar input quanto
// para checagens de tipo. Espelha `UserRole` em `src/types/index.ts`.
export const userRoleSchema = z.enum([
  'superuser',
  'admin',
  'supervisor',
  'usuario',
  'visualizador',
]);
export type UserRole = z.infer<typeof userRoleSchema>;

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter no mínimo 2 caracteres.')
  .max(100, 'Nome deve ter no máximo 100 caracteres.')
  .regex(
    /^[a-zA-ZÀ-ÿ\s]+$/,
    'Nome deve conter apenas letras e espaços.',
  );

const emailSchema = z
  .string()
  .trim()
  .min(1, 'E-mail é obrigatório.')
  .max(200, 'E-mail muito longo.')
  .email('Por favor, insira um e-mail válido.');

const strongPasswordSchema = z
  .string({ required_error: 'Senha é obrigatória.' })
  .regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE);

const responsibleSectorsSchema = z
  .array(z.string().min(1).max(100))
  .optional();

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
  role: userRoleSchema,
  responsibleSectors: responsibleSectorsSchema,
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update aceita os mesmos campos como opcionais. Senha NÃO é atualizada por
// aqui (existe o fluxo dedicado `/auth/change-password`). Quem quiser
// estender (ex: super-admin redefinindo senha de outro user) crie um schema
// novo com `password: strongPasswordSchema`.
export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    role: userRoleSchema.optional(),
    responsibleSectors: responsibleSectorsSchema,
    isActive: z.boolean().optional(),
  })
  .strict();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
