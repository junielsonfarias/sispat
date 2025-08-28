export interface CSRFConfig {
  tokenName: string;
  headerName: string;
  cookieName: string;
  tokenLength: number;
  expiration: number; // em milissegundos
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
  httpOnly: boolean;
  doubleSubmitCookie: boolean;
  originValidation: boolean;
  refererValidation: boolean;
}

export interface CSRFToken {
  token: string;
  expires: number;
  created: number;
  sessionId?: string;
}

export interface CSRFValidationResult {
  valid: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Configuração padrão CSRF
export const DEFAULT_CSRF_CONFIG: CSRFConfig = {
  tokenName: 'csrf_token',
  headerName: 'X-CSRF-Token',
  cookieName: '__csrf_token',
  tokenLength: 32,
  expiration: 3600000, // 1 hora
  sameSite: 'strict',
  secure: true,
  httpOnly: false, // Precisa ser false para JS poder ler
  doubleSubmitCookie: true,
  originValidation: true,
  refererValidation: true,
};

class CSRFProtectionService {
  private config: CSRFConfig;
  private tokenStore: Map<string, CSRFToken> = new Map();
  private allowedOrigins: Set<string> = new Set();

  constructor(config: CSRFConfig = DEFAULT_CSRF_CONFIG) {
    this.config = config;
    this.initializeAllowedOrigins();
    this.startTokenCleanup();
  }

  /**
   * Gera um novo token CSRF
   */
  generateToken(sessionId?: string): CSRFToken {
    const tokenBytes = new Uint8Array(this.config.tokenLength);
    crypto.getRandomValues(tokenBytes);

    const token = btoa(String.fromCharCode(...tokenBytes))
      .replace(/[+/=]/g, '') // Remove caracteres problemáticos para URLs
      .substring(0, this.config.tokenLength);

    const now = Date.now();
    const csrfToken: CSRFToken = {
      token,
      expires: now + this.config.expiration,
      created: now,
      sessionId,
    };

    // Armazena o token
    this.tokenStore.set(token, csrfToken);

    // Define cookie se configurado
    if (this.config.doubleSubmitCookie) {
      this.setCookie(token);
    }

    return csrfToken;
  }

  /**
   * Valida um token CSRF
   */
  validateToken(
    token: string,
    request: {
      origin?: string;
      referer?: string;
      sessionId?: string;
      method: string;
    }
  ): CSRFValidationResult {
    // Métodos seguros não precisam de validação CSRF
    if (
      ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(request.method.toUpperCase())
    ) {
      return { valid: true, riskLevel: 'low' };
    }

    // Verifica se o token existe
    if (!token) {
      return {
        valid: false,
        reason: 'Token CSRF não fornecido',
        riskLevel: 'high',
      };
    }

    // Verifica se o token está no store
    const storedToken = this.tokenStore.get(token);
    if (!storedToken) {
      return {
        valid: false,
        reason: 'Token CSRF inválido ou expirado',
        riskLevel: 'high',
      };
    }

    // Verifica expiração
    if (Date.now() > storedToken.expires) {
      this.tokenStore.delete(token);
      return {
        valid: false,
        reason: 'Token CSRF expirado',
        riskLevel: 'medium',
      };
    }

    // Verifica sessão se fornecida
    if (
      request.sessionId &&
      storedToken.sessionId &&
      request.sessionId !== storedToken.sessionId
    ) {
      return {
        valid: false,
        reason: 'Token CSRF não pertence à sessão atual',
        riskLevel: 'high',
      };
    }

    // Validação de origem
    if (this.config.originValidation && request.origin) {
      const originValid = this.validateOrigin(request.origin);
      if (!originValid.valid) {
        return {
          valid: false,
          reason: `Origem não permitida: ${originValid.reason}`,
          riskLevel: 'high',
        };
      }
    }

    // Validação de referer
    if (this.config.refererValidation && request.referer) {
      const refererValid = this.validateReferer(request.referer);
      if (!refererValid.valid) {
        return {
          valid: false,
          reason: `Referer suspeito: ${refererValid.reason}`,
          riskLevel: 'medium',
        };
      }
    }

    // Validação double submit cookie
    if (this.config.doubleSubmitCookie) {
      const cookieToken = this.getCookieToken();
      if (cookieToken !== token) {
        return {
          valid: false,
          reason: 'Token do cookie não confere com o token do header',
          riskLevel: 'high',
        };
      }
    }

    return { valid: true, riskLevel: 'low' };
  }

  /**
   * Invalida um token específico
   */
  invalidateToken(token: string): void {
    this.tokenStore.delete(token);

    if (this.config.doubleSubmitCookie) {
      this.clearCookie();
    }
  }

  /**
   * Invalida todos os tokens de uma sessão
   */
  invalidateSessionTokens(sessionId: string): void {
    for (const [token, data] of this.tokenStore.entries()) {
      if (data.sessionId === sessionId) {
        this.tokenStore.delete(token);
      }
    }
  }

  /**
   * Valida origem da requisição
   */
  validateOrigin(origin: string): { valid: boolean; reason?: string } {
    try {
      const url = new URL(origin);

      // Verifica se está na lista de origens permitidas
      if (
        this.allowedOrigins.has(origin) ||
        this.allowedOrigins.has(url.hostname) ||
        this.allowedOrigins.has(`${url.protocol}//${url.hostname}`)
      ) {
        return { valid: true };
      }

      // Verifica se é a mesma origem
      if (typeof window !== 'undefined' && origin === window.location.origin) {
        return { valid: true };
      }

      return {
        valid: false,
        reason: `Origem ${origin} não está na lista de origens permitidas`,
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'Origem malformada',
      };
    }
  }

  /**
   * Valida referer da requisição
   */
  validateReferer(referer: string): { valid: boolean; reason?: string } {
    try {
      const refererUrl = new URL(referer);

      // Verifica se o referer é do mesmo domínio
      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        if (refererUrl.hostname === currentUrl.hostname) {
          return { valid: true };
        }
      }

      // Verifica origens permitidas
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.hostname}`;
      if (this.allowedOrigins.has(refererOrigin)) {
        return { valid: true };
      }

      return {
        valid: false,
        reason: `Referer ${refererOrigin} não é permitido`,
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'Referer malformado',
      };
    }
  }

  /**
   * Adiciona origem permitida
   */
  addAllowedOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
  }

  /**
   * Remove origem permitida
   */
  removeAllowedOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
  }

  /**
   * Lista origens permitidas
   */
  getAllowedOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }

  /**
   * Obtém estatísticas dos tokens
   */
  getTokenStats(): {
    active: number;
    expired: number;
    totalGenerated: number;
    oldestToken: number | null;
  } {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    let oldestToken: number | null = null;

    for (const tokenData of this.tokenStore.values()) {
      if (now > tokenData.expires) {
        expired++;
      } else {
        active++;
        if (!oldestToken || tokenData.created < oldestToken) {
          oldestToken = tokenData.created;
        }
      }
    }

    return {
      active,
      expired,
      totalGenerated: active + expired,
      oldestToken,
    };
  }

  /**
   * Atualiza configuração
   */
  updateConfig(newConfig: Partial<CSRFConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Métodos privados
  private initializeAllowedOrigins(): void {
    if (typeof window !== 'undefined') {
      this.allowedOrigins.add(window.location.origin);

      // Adiciona localhost para desenvolvimento
      if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      ) {
        this.allowedOrigins.add('http://localhost:3000');
        this.allowedOrigins.add('http://localhost:5173');
        this.allowedOrigins.add('http://127.0.0.1:3000');
        this.allowedOrigins.add('http://127.0.0.1:5173');
      }
    }
  }

  private setCookie(token: string): void {
    if (typeof document === 'undefined') return;

    const expires = new Date(Date.now() + this.config.expiration);
    let cookieString = `${this.config.cookieName}=${token}; expires=${expires.toUTCString()}; path=/`;

    if (this.config.sameSite) {
      cookieString += `; SameSite=${this.config.sameSite}`;
    }

    if (this.config.secure) {
      cookieString += '; Secure';
    }

    if (this.config.httpOnly) {
      cookieString += '; HttpOnly';
    }

    document.cookie = cookieString;
  }

  private getCookieToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.config.cookieName) {
        return value;
      }
    }
    return null;
  }

  private clearCookie(): void {
    if (typeof document === 'undefined') return;

    document.cookie = `${this.config.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  }

  private startTokenCleanup(): void {
    // Limpa tokens expirados a cada 5 minutos
    setInterval(() => {
      const now = Date.now();
      for (const [token, data] of this.tokenStore.entries()) {
        if (now > data.expires) {
          this.tokenStore.delete(token);
        }
      }
    }, 300000); // 5 minutos
  }
}

// Utilitários para uso em hooks e componentes
export const csrfUtils = {
  /**
   * Adiciona token CSRF aos headers de uma requisição
   */
  addCSRFHeader: (
    headers: Record<string, string>,
    token: string
  ): Record<string, string> => {
    return {
      ...headers,
      [DEFAULT_CSRF_CONFIG.headerName]: token,
    };
  },

  /**
   * Extrai token CSRF do meta tag
   */
  getMetaToken: (): string | null => {
    if (typeof document === 'undefined') return null;

    const meta = document.querySelector(
      'meta[name="csrf-token"]'
    ) as HTMLMetaElement;
    return meta ? meta.content : null;
  },

  /**
   * Define token CSRF em meta tag
   */
  setMetaToken: (token: string): void => {
    if (typeof document === 'undefined') return;

    let meta = document.querySelector(
      'meta[name="csrf-token"]'
    ) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'csrf-token';
      document.head.appendChild(meta);
    }
    meta.content = token;
  },

  /**
   * Cria input hidden com token CSRF para formulários
   */
  createHiddenInput: (token: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = DEFAULT_CSRF_CONFIG.tokenName;
    input.value = token;
    return input;
  },
};

// Instância singleton
export const csrfProtectionService = new CSRFProtectionService();

export default CSRFProtectionService;
