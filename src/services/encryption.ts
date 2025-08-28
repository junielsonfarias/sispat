import CryptoJS from 'crypto-js';

export interface EncryptionConfig {
  algorithm: 'AES' | 'DES' | 'TripleDES';
  keySize: 128 | 192 | 256;
  mode: 'CBC' | 'CFB' | 'CTR' | 'ECB' | 'OFB';
  padding: 'Pkcs7' | 'AnsiX923' | 'Iso10126' | 'NoPadding';
  saltLength: number;
  iterations: number;
}

export interface EncryptedData {
  ciphertext: string;
  salt: string;
  iv: string;
  algorithm: string;
  keySize: number;
  iterations: number;
  timestamp: number;
}

export interface FieldEncryptionConfig {
  fields: string[];
  enabled: boolean;
  rotationInterval: number; // days
}

// Configuração padrão de criptografia
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'AES',
  keySize: 256,
  mode: 'CBC',
  padding: 'Pkcs7',
  saltLength: 16,
  iterations: 10000,
};

// Configuração de campos que devem ser criptografados
export const SENSITIVE_FIELDS_CONFIG: Record<string, FieldEncryptionConfig> = {
  user: {
    fields: ['cpf', 'rg', 'phone', 'address', 'birthDate'],
    enabled: true,
    rotationInterval: 90,
  },
  patrimonio: {
    fields: ['serialNumber', 'invoiceNumber', 'observations'],
    enabled: true,
    rotationInterval: 365,
  },
  municipality: {
    fields: ['cnpj', 'mayorCpf', 'bankAccount', 'phone'],
    enabled: true,
    rotationInterval: 180,
  },
  audit: {
    fields: ['ipAddress', 'userAgent', 'sessionData'],
    enabled: true,
    rotationInterval: 30,
  },
};

class EncryptionService {
  private masterKey: string;
  private config: EncryptionConfig;
  private keyCache: Map<string, { key: string; createdAt: number }> = new Map();

  constructor(
    masterKey: string,
    config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG
  ) {
    this.masterKey = masterKey;
    this.config = config;
    this.validateConfig();
  }

  /**
   * Criptografa dados sensíveis
   */
  encrypt(plaintext: string, contextKey?: string): EncryptedData {
    if (!plaintext) {
      throw new Error('Dados para criptografia não podem estar vazios');
    }

    // Gera salt aleatório
    const salt = CryptoJS.lib.WordArray.random(this.config.saltLength);

    // Gera IV aleatório
    const iv = CryptoJS.lib.WordArray.random(16);

    // Deriva chave usando PBKDF2
    const key = this.deriveKey(salt, contextKey);

    // Criptografa os dados
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv,
      mode: CryptoJS.mode[this.config.mode],
      padding: CryptoJS.pad[this.config.padding],
    });

    return {
      ciphertext: encrypted.toString(),
      salt: salt.toString(CryptoJS.enc.Hex),
      iv: iv.toString(CryptoJS.enc.Hex),
      algorithm: this.config.algorithm,
      keySize: this.config.keySize,
      iterations: this.config.iterations,
      timestamp: Date.now(),
    };
  }

  /**
   * Descriptografa dados
   */
  decrypt(encryptedData: EncryptedData, contextKey?: string): string {
    try {
      // Reconstitui salt e IV
      const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

      // Deriva a mesma chave
      const key = this.deriveKey(salt, contextKey, encryptedData.iterations);

      // Descriptografa
      const decrypted = CryptoJS.AES.decrypt(encryptedData.ciphertext, key, {
        iv,
        mode: CryptoJS.mode[this.config.mode],
        padding: CryptoJS.pad[this.config.padding],
      });

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

      if (!plaintext) {
        throw new Error(
          'Falha na descriptografia - chave incorreta ou dados corrompidos'
        );
      }

      return plaintext;
    } catch (error) {
      throw new Error(
        `Erro na descriptografia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Criptografa um objeto, protegendo apenas campos sensíveis
   */
  encryptObject<T extends Record<string, any>>(
    obj: T,
    entityType: keyof typeof SENSITIVE_FIELDS_CONFIG
  ): T {
    const config = SENSITIVE_FIELDS_CONFIG[entityType];
    if (!config?.enabled) {
      return obj;
    }

    const result = { ...obj };
    const contextKey = `${entityType}_${obj.id || 'anonymous'}`;

    config.fields.forEach(field => {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = this.encrypt(result[field], contextKey);
        } catch (error) {
          console.error(`Erro ao criptografar campo ${field}:`, error);
          // Em caso de erro, mantém o valor original e registra o erro
        }
      }
    });

    return result;
  }

  /**
   * Descriptografa um objeto
   */
  decryptObject<T extends Record<string, any>>(
    obj: T,
    entityType: keyof typeof SENSITIVE_FIELDS_CONFIG
  ): T {
    const config = SENSITIVE_FIELDS_CONFIG[entityType];
    if (!config?.enabled) {
      return obj;
    }

    const result = { ...obj };
    const contextKey = `${entityType}_${obj.id || 'anonymous'}`;

    config.fields.forEach(field => {
      if (result[field] && this.isEncryptedData(result[field])) {
        try {
          result[field] = this.decrypt(result[field], contextKey);
        } catch (error) {
          console.error(`Erro ao descriptografar campo ${field}:`, error);
          // Em caso de erro, mantém o valor criptografado
        }
      }
    });

    return result;
  }

  /**
   * Hash seguro para senhas (não reversível)
   */
  hashPassword(
    password: string,
    salt?: string
  ): { hash: string; salt: string } {
    const finalSalt =
      salt || CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);

    // Usa PBKDF2 com muitas iterações para dificultar ataques de força bruta
    const hash = CryptoJS.PBKDF2(password, finalSalt, {
      keySize: 256 / 32,
      iterations: 100000, // 100k iterações para ser computacionalmente caro
    }).toString(CryptoJS.enc.Hex);

    return { hash, salt: finalSalt };
  }

  /**
   * Verifica se uma senha corresponde ao hash
   */
  verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  /**
   * Gera chave de criptografia segura
   */
  generateSecureKey(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
  }

  /**
   * Criptografia de dados em trânsito (para APIs)
   */
  encryptForTransit(data: any, publicKey?: string): string {
    const jsonData = JSON.stringify(data);
    const compressed = CryptoJS.enc.Utf8.parse(jsonData);

    // Adiciona timestamp para prevenir replay attacks
    const payload = {
      data: jsonData,
      timestamp: Date.now(),
      nonce: CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex),
    };

    const encrypted = this.encrypt(JSON.stringify(payload));
    return JSON.stringify(encrypted);
  }

  /**
   * Descriptografia de dados em trânsito
   */
  decryptFromTransit(encryptedPayload: string, maxAge: number = 300000): any {
    // 5 min default
    try {
      const encryptedData = JSON.parse(encryptedPayload) as EncryptedData;
      const decryptedPayload = this.decrypt(encryptedData);
      const payload = JSON.parse(decryptedPayload);

      // Verifica timestamp para prevenir replay attacks
      const age = Date.now() - payload.timestamp;
      if (age > maxAge) {
        throw new Error('Payload expirado');
      }

      return JSON.parse(payload.data);
    } catch (error) {
      throw new Error(
        `Erro ao descriptografar payload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Rotaciona chave de criptografia
   */
  rotateKey(newMasterKey: string): void {
    this.masterKey = newMasterKey;
    this.keyCache.clear();
  }

  /**
   * Gera hash para verificação de integridade
   */
  generateIntegrityHash(data: string): string {
    return CryptoJS.SHA256(data + this.masterKey).toString(CryptoJS.enc.Hex);
  }

  /**
   * Verifica integridade dos dados
   */
  verifyIntegrity(data: string, hash: string): boolean {
    const computedHash = this.generateIntegrityHash(data);
    return computedHash === hash;
  }

  // Métodos privados
  private deriveKey(
    salt: CryptoJS.lib.WordArray,
    contextKey?: string,
    iterations?: number
  ): CryptoJS.lib.WordArray {
    const keyMaterial = this.masterKey + (contextKey || '');
    const finalIterations = iterations || this.config.iterations;

    // Cache da chave para melhor performance
    const cacheKey = `${keyMaterial}_${salt.toString()}_${finalIterations}`;
    const cached = this.keyCache.get(cacheKey);

    if (cached && Date.now() - cached.createdAt < 3600000) {
      // Cache por 1 hora
      return CryptoJS.enc.Hex.parse(cached.key);
    }

    const key = CryptoJS.PBKDF2(keyMaterial, salt, {
      keySize: this.config.keySize / 32,
      iterations: finalIterations,
    });

    // Armazena no cache
    this.keyCache.set(cacheKey, {
      key: key.toString(CryptoJS.enc.Hex),
      createdAt: Date.now(),
    });

    return key;
  }

  private validateConfig(): void {
    if (this.config.keySize < 128) {
      throw new Error('Tamanho da chave deve ser pelo menos 128 bits');
    }
    if (this.config.iterations < 1000) {
      throw new Error('Número de iterações deve ser pelo menos 1000');
    }
    if (this.config.saltLength < 8) {
      throw new Error('Salt deve ter pelo menos 8 bytes');
    }
  }

  private isEncryptedData(value: any): value is EncryptedData {
    return (
      typeof value === 'object' &&
      value !== null &&
      'ciphertext' in value &&
      'salt' in value &&
      'iv' in value &&
      'algorithm' in value
    );
  }

  // Limpa cache periodicamente
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.keyCache.entries()) {
        if (now - value.createdAt > 3600000) {
          // 1 hora
          this.keyCache.delete(key);
        }
      }
    }, 1800000); // Limpa a cada 30 minutos
  }
}

// Utilitários para uso em componentes
export const encryptionUtils = {
  /**
   * Máscara dados sensíveis para exibição
   */
  maskSensitiveData(
    value: string,
    type: 'cpf' | 'cnpj' | 'phone' | 'email' | 'generic' = 'generic'
  ): string {
    if (!value) return '';

    switch (type) {
      case 'cpf':
        return value.replace(/(\d{3})\d{6}(\d{2})/, '$1.***.***.***-$2');
      case 'cnpj':
        return value.replace(/(\d{2})\d{9}(\d{4})/, '$1.***.***/****.***-$2');
      case 'phone':
        return value.replace(/(\d{2})(\d{4,5})\d{4}/, '($1) $2-****');
      case 'email': {
        const [user, domain] = value.split('@');
        const maskedUser =
          user.length > 3
            ? user.substring(0, 3) + '*'.repeat(user.length - 3)
            : user;
        return `${maskedUser}@${domain}`;
      }
      default: {
        const { length } = value;
        if (length <= 4) return '*'.repeat(length);
        return (
          value.substring(0, 2) +
          '*'.repeat(length - 4) +
          value.substring(length - 2)
        );
      }
    }
  },

  /**
   * Verifica se dados estão criptografados
   */
  isEncrypted(value: any): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      'ciphertext' in value &&
      'salt' in value &&
      'iv' in value
    );
  },

  /**
   * Gera chave mestre aleatória
   */
  generateMasterKey(): string {
    return CryptoJS.lib.WordArray.random(64).toString(CryptoJS.enc.Hex);
  },
};

// Instância singleton (chave deve vir do ambiente)
const MASTER_KEY =
  process.env.ENCRYPTION_MASTER_KEY ||
  'default-development-key-change-in-production';
export const encryptionService = new EncryptionService(MASTER_KEY);

export default EncryptionService;
