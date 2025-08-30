import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface TwoFactorVerification {
  token: string;
  userId: string;
}

/**
 * Gera uma nova configuração de 2FA para um usuário
 */
export const generateTwoFactorSecret = async (
  userEmail: string,
  serviceName: string = 'SISPAT'
): Promise<TwoFactorSetup> => {
  // Gera o secret
  const secret = speakeasy.generateSecret({
    name: userEmail,
    issuer: serviceName,
    length: 32,
  });

  // Gera códigos de backup
  const backupCodes = generateBackupCodes();

  // Gera QR Code URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

  return {
    secret: secret.base32!,
    qrCodeUrl: qrCodeUrl,
    backupCodes,
    manualEntryKey: secret.base32!,
  };
};

/**
 * Verifica um token 2FA
 */
export const verifyTwoFactorToken = (
  token: string,
  secret: string,
  window: number = 2
): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window, // Permite tokens de até 2 períodos antes/depois (60s cada)
  });
};

/**
 * Gera códigos de backup para recuperação
 */
export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Gera código de 8 dígitos
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }

  return codes;
};

/**
 * Verifica se um código de backup é válido
 */
export const verifyBackupCode = (
  code: string,
  validCodes: string[]
): { isValid: boolean; remainingCodes: string[] } => {
  const normalizedCode = code.toUpperCase().trim();
  const codeIndex = validCodes.indexOf(normalizedCode);

  if (codeIndex === -1) {
    return { isValid: false, remainingCodes: validCodes };
  }

  // Remove o código usado da lista
  const remainingCodes = validCodes.filter((_, index) => index !== codeIndex);

  return { isValid: true, remainingCodes };
};

/**
 * Gera um token TOTP atual para testes
 */
export const generateCurrentToken = (secret: string): string => {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
};

/**
 * Valida formato de token 2FA
 */
export const isValidTokenFormat = (token: string): boolean => {
  // Token deve ter 6 dígitos
  return /^\d{6}$/.test(token);
};

/**
 * Calcula tempo restante até próximo token
 */
export const getTimeRemaining = (): number => {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30; // TOTP usa períodos de 30 segundos
  return timeStep - (now % timeStep);
};

export default {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  generateBackupCodes,
  verifyBackupCode,
  generateCurrentToken,
  isValidTokenFormat,
  getTimeRemaining,
};
