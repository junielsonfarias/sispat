import { z } from 'zod';

export interface PasswordPolicyConfig {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfoInPassword: boolean;
  maxConsecutiveChars: number;
  preventReuse: number; // últimas N senhas
  expirationDays: number;
}

export interface PasswordStrength {
  score: number; // 0-100
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  requirements: {
    [key: string]: boolean;
  };
}

export interface UserInfo {
  name?: string;
  email?: string;
  username?: string;
  birthDate?: string;
  phone?: string;
}

// Configuração padrão da política
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfoInPassword: true,
  maxConsecutiveChars: 3,
  preventReuse: 5,
  expirationDays: 90,
};

// Lista de senhas comuns (top 100 mais usadas)
const COMMON_PASSWORDS = [
  '123456',
  'password',
  '123456789',
  '12345678',
  '12345',
  '1234567',
  'qwerty',
  'abc123',
  'password1',
  '1234567890',
  '123123',
  '000000',
  'iloveyou',
  'adobe123',
  '123321',
  'admin',
  'password123',
  'solo',
  'monkey',
  'lovely',
  'shadow',
  'princess',
  'dragon',
  'passw0rd',
  'master',
  'hello',
  'freedom',
  'whatever',
  'qazwsx',
  'trustno1',
  'jordan23',
  'harley',
  'robert',
  'matthew',
  'jordan',
  'asshole',
  'daniel',
  'andrew',
  'martin',
  'welcome',
  'michael',
  'charlie',
  'maggie',
  'superman',
  '696969',
  'qwertyuiop',
  'hottie',
  'batman',
  'loveme',
  'zaq1zaq1',
  'password2',
  'secretpassword',
  'reddog',
  'love',
  '112233',
  'starwars',
  'klaster',
  'zxcvbnm',
  'hunter',
  'thomas',
  'michelle',
  'tigger',
  'prodigy',
  'chocolate',
  'baseball',
  'garfield',
  'cheese',
  'stewart',
  'orange',
  'hahaha',
  'rainbow',
  'computer',
  'michelle1',
  'liverpool',
  'princess1',
  'jordan1',
  'michelle',
  'snoopy',
  'chicken',
  'hockey',
  'angels',
  'madison',
  'bailey',
  'junior',
  'poohbear',
  'lovers',
  'stupid',
  'startrek',
  'captain',
  'coffee',
  'scooter',
  'buster',
  'brown',
  'biteme',
  'green',
  'test',
  'lakers',
  'forever',
  'batman1',
  'trustme',
  'soccer',
  'monster',
  'dexter',
  'morgan',
  'batman',
  'turtle',
];

/**
 * Valida uma senha contra a política definida
 */
export const validatePassword = (
  password: string,
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY,
  userInfo?: UserInfo,
  previousPasswords?: string[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Comprimento
  if (password.length < policy.minLength) {
    errors.push(`A senha deve ter pelo menos ${policy.minLength} caracteres`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`A senha deve ter no máximo ${policy.maxLength} caracteres`);
  }

  // Maiúsculas
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }

  // Minúsculas
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }

  // Números
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('A senha deve conter pelo menos um número');
  }

  // Caracteres especiais
  if (
    policy.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)
  ) {
    errors.push(
      'A senha deve conter pelo menos um caractere especial (!@#$%^&*...)'
    );
  }

  // Caracteres consecutivos
  if (hasConsecutiveChars(password, policy.maxConsecutiveChars)) {
    errors.push(
      `A senha não pode ter mais de ${policy.maxConsecutiveChars} caracteres consecutivos iguais`
    );
  }

  // Senhas comuns
  if (
    policy.preventCommonPasswords &&
    COMMON_PASSWORDS.includes(password.toLowerCase())
  ) {
    errors.push('Esta senha é muito comum. Escolha uma senha mais segura');
  }

  // Informações do usuário
  if (policy.preventUserInfoInPassword && userInfo) {
    const userInfoErrors = checkUserInfoInPassword(password, userInfo);
    errors.push(...userInfoErrors);
  }

  // Reutilização de senhas
  if (previousPasswords && previousPasswords.length > 0) {
    const isReused = checkPasswordReuse(
      password,
      previousPasswords,
      policy.preventReuse
    );
    if (isReused) {
      errors.push(
        `Não é possível reutilizar uma das últimas ${policy.preventReuse} senhas`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Calcula a força de uma senha
 */
export const calculatePasswordStrength = (
  password: string,
  userInfo?: UserInfo
): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];
  const requirements = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password),
    noCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
    noUserInfo: userInfo ? !containsUserInfo(password, userInfo) : true,
    noConsecutive: !hasConsecutiveChars(password, 3),
  };

  // Pontuação base por comprimento
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 5;

  // Pontuação por tipos de caracteres
  if (requirements.uppercase) score += 15;
  else feedback.push('Adicione letras maiúsculas');

  if (requirements.lowercase) score += 15;
  else feedback.push('Adicione letras minúsculas');

  if (requirements.numbers) score += 15;
  else feedback.push('Adicione números');

  if (requirements.special) score += 15;
  else feedback.push('Adicione caracteres especiais');

  // Penalizações
  if (!requirements.noCommon) {
    score -= 30;
    feedback.push('Evite senhas comuns');
  }

  if (!requirements.noUserInfo) {
    score -= 20;
    feedback.push('Não use informações pessoais');
  }

  if (!requirements.noConsecutive) {
    score -= 15;
    feedback.push('Evite caracteres repetidos consecutivos');
  }

  // Bônus por variedade
  const charTypes = [
    requirements.uppercase,
    requirements.lowercase,
    requirements.numbers,
    requirements.special,
  ].filter(Boolean).length;

  if (charTypes >= 4) score += 10;
  if (charTypes >= 3) score += 5;

  // Normaliza a pontuação
  score = Math.max(0, Math.min(100, score));

  // Determina o nível
  let level: PasswordStrength['level'];
  if (score < 20) level = 'very-weak';
  else if (score < 40) level = 'weak';
  else if (score < 60) level = 'fair';
  else if (score < 80) level = 'good';
  else level = 'strong';

  return {
    score,
    level,
    feedback,
    requirements,
  };
};

/**
 * Gera uma senha segura automaticamente
 */
export const generateSecurePassword = (
  length: number = 16,
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY
): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let chars = '';
  let password = '';

  // Garante pelo menos um caractere de cada tipo exigido
  if (policy.requireUppercase) {
    chars += uppercase;
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
  }

  if (policy.requireLowercase) {
    chars += lowercase;
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }

  if (policy.requireNumbers) {
    chars += numbers;
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }

  if (policy.requireSpecialChars) {
    chars += special;
    password += special[Math.floor(Math.random() * special.length)];
  }

  // Preenche o resto aleatoriamente
  for (let i = password.length; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Embaralha a senha
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Cria o schema Zod para validação de senhas
 */
export const createPasswordSchema = (
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY,
  userInfo?: UserInfo,
  previousPasswords?: string[]
) => {
  return z
    .string()
    .min(
      policy.minLength,
      `A senha deve ter pelo menos ${policy.minLength} caracteres`
    )
    .max(
      policy.maxLength,
      `A senha deve ter no máximo ${policy.maxLength} caracteres`
    )
    .refine(
      password => {
        const validation = validatePassword(
          password,
          policy,
          userInfo,
          previousPasswords
        );
        return validation.isValid;
      },
      password => {
        const validation = validatePassword(
          password,
          policy,
          userInfo,
          previousPasswords
        );
        return { message: validation.errors[0] || 'Senha inválida' };
      }
    );
};

// Funções auxiliares
function hasConsecutiveChars(
  password: string,
  maxConsecutive: number
): boolean {
  let count = 1;
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      count++;
      if (count > maxConsecutive) return true;
    } else {
      count = 1;
    }
  }
  return false;
}

function containsUserInfo(password: string, userInfo: UserInfo): boolean {
  const lowerPassword = password.toLowerCase();

  if (userInfo.name && userInfo.name.length > 2) {
    const names = userInfo.name.toLowerCase().split(' ');
    if (names.some(name => name.length > 2 && lowerPassword.includes(name))) {
      return true;
    }
  }

  if (userInfo.email) {
    const emailParts = userInfo.email.toLowerCase().split('@')[0]?.split('.') || [];
    if (
      emailParts.some(part => part.length > 2 && lowerPassword.includes(part))
    ) {
      return true;
    }
  }

  if (userInfo.username && userInfo.username.length > 2) {
    if (lowerPassword.includes(userInfo.username.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function checkUserInfoInPassword(
  password: string,
  userInfo: UserInfo
): string[] {
  const errors: string[] = [];

  if (containsUserInfo(password, userInfo)) {
    errors.push(
      'A senha não pode conter informações pessoais (nome, email, etc.)'
    );
  }

  return errors;
}

function checkPasswordReuse(
  newPassword: string,
  previousPasswords: string[],
  preventReuse: number
): boolean {
  const lastPasswords = previousPasswords.slice(-preventReuse);
  return lastPasswords.includes(newPassword);
}

export default {
  validatePassword,
  calculatePasswordStrength,
  generateSecurePassword,
  createPasswordSchema,
  DEFAULT_PASSWORD_POLICY,
};
