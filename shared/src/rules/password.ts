// Regra de senha forte do SISPAT.
//
// **Single source of truth.** Antes existia em 4 lugares:
//   - backend/src/middlewares/validation.ts (min 8, sem símbolo — divergente!)
//   - backend/src/services/authService.ts (min 12, com símbolo)
//   - backend/src/controllers/userController.ts (min 12, com símbolo)
//   - src/pages/auth/ResetPassword.tsx (min 12, com símbolo)
//
// A regra correta é a do authService: 12+ chars, letras maiúsculas, minúsculas,
// dígitos e ao menos um símbolo do conjunto `@$!%*?&`.
//
// O regex aceita apenas o conjunto `[A-Za-z\d@$!%*?&]` para evitar caracteres
// que possam vazar para SQL/HTML em log/erro mal-tratado. Se for ampliar o
// conjunto de símbolos no futuro, atualize aqui e propagará para todos os
// consumidores (frontend + backend) automaticamente.

export const STRONG_PASSWORD_MIN_LENGTH = 12;

export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

export const STRONG_PASSWORD_MESSAGE =
  'A senha deve ter no mínimo 12 caracteres e incluir letras maiúsculas, minúsculas, números e símbolos (@$!%*?&).';

export function isStrongPassword(password: string): boolean {
  return STRONG_PASSWORD_REGEX.test(password);
}
