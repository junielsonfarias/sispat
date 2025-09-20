// API service para 2FA - substitui o uso direto do speakeasy no frontend
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface TwoFactorSetup {
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
}

/**
 * Gera uma nova configuração de 2FA para um usuário
 */
export const generateTwoFactorSetup = async (): Promise<TwoFactorSetup> => {
  try {
    const response = await axios.post(`${API_BASE}/two-factor/generate`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Erro ao gerar configuração 2FA');
    }
  } catch (error) {
    console.error('Erro ao gerar configuração 2FA:', error);
    throw error;
  }
};

/**
 * Verifica um token 2FA
 */
export const verifyTwoFactorToken = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_BASE}/two-factor/verify`, {
      token,
    });

    return response.data.success;
  } catch (error) {
    console.error('Erro ao verificar token 2FA:', error);
    return false;
  }
};

/**
 * Verifica código de backup
 */
export const verifyBackupCode = async (
  backupCode: string
): Promise<{ isValid: boolean; remainingCodes: number }> => {
  try {
    const response = await axios.post(`${API_BASE}/two-factor/verify-backup`, {
      backupCode,
    });

    if (response.data.success) {
      return {
        isValid: true,
        remainingCodes: response.data.remainingCodes,
      };
    } else {
      return {
        isValid: false,
        remainingCodes: 0,
      };
    }
  } catch (error) {
    console.error('Erro ao verificar código de backup:', error);
    return {
      isValid: false,
      remainingCodes: 0,
    };
  }
};

/**
 * Desabilita 2FA para um usuário
 */
export const disableTwoFactor = async (password: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_BASE}/two-factor/disable`, {
      password,
    });

    return response.data.success;
  } catch (error) {
    console.error('Erro ao desabilitar 2FA:', error);
    return false;
  }
};

/**
 * Verifica status do 2FA para um usuário
 */
export const getTwoFactorStatus = async (): Promise<TwoFactorStatus> => {
  try {
    const response = await axios.get(`${API_BASE}/two-factor/status`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Erro ao verificar status 2FA');
    }
  } catch (error) {
    console.error('Erro ao verificar status 2FA:', error);
    throw error;
  }
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
  generateTwoFactorSetup,
  verifyTwoFactorToken,
  verifyBackupCode,
  disableTwoFactor,
  getTwoFactorStatus,
  isValidTokenFormat,
  getTimeRemaining,
};
