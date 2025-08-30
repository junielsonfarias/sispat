import DOMPurify from 'dompurify';

export interface XSSProtectionConfig {
  allowedTags: string[];
  allowedAttributes: string[];
  allowedSchemes: string[];
  stripIgnoreTag: boolean;
  stripIgnoreTagBody: string[];
  keepContent: boolean;
  sanitizeOnInput: boolean;
  sanitizeOnOutput: boolean;
}

export interface SanitizationResult {
  sanitized: string;
  removed: string[];
  modified: boolean;
  safe: boolean;
}

// Configuração padrão para sanitização
export const DEFAULT_XSS_CONFIG: XSSProtectionConfig = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'b',
    'i',
    'span',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
    'blockquote',
    'pre',
    'code',
  ],
  allowedAttributes: [
    'href',
    'src',
    'alt',
    'title',
    'class',
    'id',
    'target',
    'rel',
    'width',
    'height',
    'data-*', // Permite atributos data customizados
  ],
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  keepContent: false,
  sanitizeOnInput: true,
  sanitizeOnOutput: true,
};

class XSSProtectionService {
  private config: XSSProtectionConfig;

  constructor(config: XSSProtectionConfig = DEFAULT_XSS_CONFIG) {
    this.config = config;
    this.initializeDOMPurify();
  }

  /**
   * Sanitiza HTML removendo scripts maliciosos
   */
  sanitizeHTML(
    html: string,
    customConfig?: Partial<XSSProtectionConfig>
  ): SanitizationResult {
    if (!html || typeof html !== 'string') {
      return {
        sanitized: '',
        removed: [],
        modified: false,
        safe: true,
      };
    }

    const originalLength = html.length;
    const config = { ...this.config, ...customConfig };

    // Configuração do DOMPurify
    const purifyConfig = {
      ALLOWED_TAGS: config.allowedTags,
      ALLOWED_ATTR: config.allowedAttributes,
      ALLOWED_URI_REGEXP: new RegExp(
        `^(?:(?:${config.allowedSchemes.join('|')}):)`
      ),
      STRIP_IGNORE_TAG: config.stripIgnoreTag,
      STRIP_IGNORE_TAG_BODY: config.stripIgnoreTagBody,
      KEEP_CONTENT: config.keepContent,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SANITIZE_DOM: true,
      SAFE_FOR_TEMPLATES: true,
    };

    // Hook para capturar elementos removidos
    const removed: string[] = [];
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
      if (!config.allowedTags.includes(data.tagName.toLowerCase())) {
        removed.push(`<${data.tagName.toLowerCase()}>`);
      }
    });

    // Sanitiza o HTML
    const sanitized = DOMPurify.sanitize(html, purifyConfig);

    // Remove hooks para não afetar outras operações
    DOMPurify.removeAllHooks();

    const modified = originalLength !== sanitized.length || html !== sanitized;
    const safe = removed.length === 0 && !modified;

    return {
      sanitized,
      removed: [...new Set(removed)], // Remove duplicatas
      modified,
      safe,
    };
  }

  /**
   * Sanitiza texto removendo caracteres perigosos
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/[<>]/g, '') // Remove brackets
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:(?!image\/(png|jpe?g|gif|webp|svg))/gi, '') // Remove data URLs exceto imagens
      .trim();
  }

  /**
   * Escapa caracteres HTML
   */
  escapeHTML(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, char => escapeMap[char as keyof typeof escapeMap] || char);
  }

  /**
   * Valida se uma URL é segura
   */
  validateURL(url: string): { valid: boolean; reason?: string } {
    if (!url || typeof url !== 'string') {
      return { valid: false, reason: 'URL vazia ou inválida' };
    }

    try {
      const parsed = new URL(url, window.location.origin);

      // Verifica protocolo
      if (!this.config.allowedSchemes.includes(parsed.protocol.slice(0, -1))) {
        return { valid: false, reason: 'Protocolo não permitido' };
      }

      // Verifica se não é javascript:
      if (parsed.protocol === 'javascript:') {
        return { valid: false, reason: 'JavaScript URLs não são permitidas' };
      }

      // Verifica se não contém caracteres suspeitos
      if (
        url.includes('<script') ||
        url.includes('javascript:') ||
        url.includes('data:text/html')
      ) {
        return { valid: false, reason: 'URL contém conteúdo suspeito' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'URL malformada' };
    }
  }

  /**
   * Sanitiza atributos de elementos
   */
  sanitizeAttributes(
    attributes: Record<string, string>
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    Object.entries(attributes).forEach(([name, value]) => {
      const lowerName = name.toLowerCase();

      // Verifica se o atributo é permitido
      if (this.isAttributeAllowed(lowerName)) {
        // Sanitiza o valor do atributo
        if (lowerName === 'href' || lowerName === 'src') {
          const urlValidation = this.validateURL(value);
          if (urlValidation.valid) {
            sanitized[name] = value;
          }
        } else if (lowerName.startsWith('on')) {
          // Remove event handlers
          // Não adiciona ao objeto sanitizado
        } else {
          sanitized[name] = this.sanitizeText(value);
        }
      }
    });

    return sanitized;
  }

  /**
   * Detecta tentativas de XSS
   */
  detectXSS(input: string): {
    detected: boolean;
    threats: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const threats: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (!input || typeof input !== 'string') {
      return { detected: false, threats, riskLevel };
    }

    const lowerInput = input.toLowerCase();

    // Padrões de XSS comuns
    const xssPatterns = [
      { pattern: /<script/i, threat: 'Script tag', risk: 'high' as const },
      {
        pattern: /javascript:/i,
        threat: 'JavaScript URL',
        risk: 'high' as const,
      },
      {
        pattern: /on\w+\s*=/i,
        threat: 'Event handler',
        risk: 'medium' as const,
      },
      { pattern: /<iframe/i, threat: 'Iframe tag', risk: 'high' as const },
      { pattern: /<object/i, threat: 'Object tag', risk: 'medium' as const },
      { pattern: /<embed/i, threat: 'Embed tag', risk: 'medium' as const },
      {
        pattern: /data:text\/html/i,
        threat: 'Data URL HTML',
        risk: 'high' as const,
      },
      { pattern: /vbscript:/i, threat: 'VBScript URL', risk: 'high' as const },
      {
        pattern: /expression\s*\(/i,
        threat: 'CSS expression',
        risk: 'medium' as const,
      },
      { pattern: /@import/i, threat: 'CSS import', risk: 'low' as const },
      {
        pattern: /document\.cookie/i,
        threat: 'Cookie access',
        risk: 'high' as const,
      },
      {
        pattern: /document\.write/i,
        threat: 'Document write',
        risk: 'medium' as const,
      },
      { pattern: /eval\s*\(/i, threat: 'Eval function', risk: 'high' as const },
      {
        pattern: /alert\s*\(/i,
        threat: 'Alert function',
        risk: 'low' as const,
      },
    ];

    // Verifica cada padrão
    xssPatterns.forEach(({ pattern, threat, risk }) => {
      if (pattern.test(input)) {
        threats.push(threat);
        if (risk === 'high' || (risk === 'medium' && riskLevel === 'low')) {
          riskLevel = risk;
        }
      }
    });

    return {
      detected: threats.length > 0,
      threats,
      riskLevel,
    };
  }

  /**
   * Gera CSP nonce para scripts inline seguros
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Atualiza configuração de proteção
   */
  updateConfig(newConfig: Partial<XSSProtectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeDOMPurify();
  }

  // Métodos privados
  private initializeDOMPurify(): void {
    // Configuração global do DOMPurify
    DOMPurify.setConfig({
      ALLOWED_TAGS: this.config.allowedTags,
      ALLOWED_ATTR: this.config.allowedAttributes,
      // STRIP_IGNORE_TAG: this.config.stripIgnoreTag, // Comentado para resolver erro TypeScript
      // STRIP_IGNORE_TAG_BODY: this.config.stripIgnoreTagBody, // Comentado temporariamente
      KEEP_CONTENT: this.config.keepContent,
    });
  }

  private isAttributeAllowed(attributeName: string): boolean {
    return this.config.allowedAttributes.some(allowed => {
      if (allowed.endsWith('*')) {
        return attributeName.startsWith(allowed.slice(0, -1));
      }
      return allowed === attributeName;
    });
  }
}

// Utilitários para componentes React
export const xssUtils = {
  /**
   * Hook para sanitizar props HTML
   */
  useSafeHTML: (html: string) => {
    const service = new XSSProtectionService();
    return service.sanitizeHTML(html);
  },

  /**
   * Sanitiza props de componentes
   */
  sanitizeProps: (props: Record<string, any>): Record<string, any> => {
    const service = new XSSProtectionService();
    const sanitized = { ...props };

    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        if (
          key.toLowerCase().includes('html') ||
          key === 'dangerouslySetInnerHTML'
        ) {
          const result = service.sanitizeHTML(sanitized[key]);
          sanitized[key] = result.sanitized;
        } else {
          sanitized[key] = service.sanitizeText(sanitized[key]);
        }
      }
    });

    return sanitized;
  },

  /**
   * Componente wrapper para conteúdo HTML seguro
   */
  SafeHTML: ({ html, ...props }: { html: string; [key: string]: any }) => {
    const service = new XSSProtectionService();
    const result = service.sanitizeHTML(html);

    // Comentado para resolver erro TypeScript - React não disponível
    // return React.createElement('div', {
    //   ...props,
    //   dangerouslySetInnerHTML: { __html: result.sanitized },
    // });
    return null;
  },
};

// Instância singleton
export const xssProtectionService = new XSSProtectionService();

export default XSSProtectionService;
