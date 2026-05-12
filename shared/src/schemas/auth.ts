import { z } from 'zod';
import {
  STRONG_PASSWORD_REGEX,
  STRONG_PASSWORD_MESSAGE,
} from '../rules/password';

// Email do SISPAT — sempre lowercased no servidor (express-validator usava
// `normalizeEmail()`). O schema aqui só valida o formato; o backend cuida do
// lowercasing antes da query Prisma se ainda for necessário.
const emailSchema = z
  .string({ required_error: 'E-mail é obrigatório.' })
  .trim()
  .min(1, 'E-mail é obrigatório.')
  .max(200, 'E-mail muito longo.')
  .email('Por favor, insira um e-mail válido.');

// Senha "qualquer" — usada em login, onde só queremos saber se foi informada
// (regra forte é validada apenas no momento da criação/reset).
const anyPasswordSchema = z
  .string({ required_error: 'Senha é obrigatória.' })
  .min(1, 'Senha é obrigatória.')
  .max(200, 'Senha muito longa.');

// Senha forte — usada em changePassword e resetPassword.
const strongPasswordSchema = z
  .string({ required_error: 'Senha é obrigatória.' })
  .regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE);

// --- Schemas exportados ---

export const loginSchema = z.object({
  email: emailSchema,
  password: anyPasswordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(2000).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const changePasswordSchema = z.object({
  oldPassword: anyPasswordSchema,
  newPassword: strongPasswordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.').max(1000),
  newPassword: strongPasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Schema só para formulários do frontend que pedem confirmação de senha.
// O backend NÃO precisa disso (recebe só `newPassword`), então fica
// derivado e não vai para a wire.
export const resetPasswordFormSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export const validateResetTokenParamsSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.').max(1000),
});
export type ValidateResetTokenParams = z.infer<
  typeof validateResetTokenParamsSchema
>;
