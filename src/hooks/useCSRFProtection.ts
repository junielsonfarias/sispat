import { useState, useEffect, useCallback } from 'react';
import {
  csrfProtectionService,
  csrfUtils,
  CSRFToken,
} from '@/services/csrfProtection';
import {
  xssProtectionService,
  SanitizationResult,
} from '@/services/xssProtection';
import { useAuth } from '@/hooks/useAuth';

export interface CSRFProtectionState {
  token: string | null;
  isValid: boolean;
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

/**
 * Hook para gerenciar proteção CSRF
 */
export const useCSRFProtection = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CSRFProtectionState>({
    token: null,
    isValid: false,
    loading: true,
    error: null,
    lastRefresh: null,
  });

  // Gera um novo token CSRF
  const generateToken = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const sessionId = user?.id || 'anonymous';
      const csrfToken = csrfProtectionService.generateToken(sessionId);

      // Define no meta tag para uso global
      csrfUtils.setMetaToken(csrfToken.token);

      setState({
        token: csrfToken.token,
        isValid: true,
        loading: false,
        error: null,
        lastRefresh: new Date(),
      });

      return csrfToken.token;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao gerar token CSRF';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [user?.id]);

  // Valida um token CSRF
  const validateToken = useCallback(
    (token: string, method: string = 'POST') => {
      return csrfProtectionService.validateToken(token, {
        origin: window.location.origin,
        referer: document.referrer,
        sessionId: user?.id || 'anonymous',
        method,
      });
    },
    [user?.id]
  );

  // Invalida o token atual
  const invalidateToken = useCallback(() => {
    if (state.token) {
      csrfProtectionService.invalidateToken(state.token);
      setState(prev => ({
        ...prev,
        token: null,
        isValid: false,
      }));
    }
  }, [state.token]);

  // Adiciona token aos headers da requisição
  const addCSRFHeaders = useCallback(
    (headers: Record<string, string> = {}) => {
      if (!state.token) {
        throw new Error('Token CSRF não disponível');
      }

      return csrfUtils.addCSRFHeader(headers, state.token);
    },
    [state.token]
  );

  // Cria formulário com proteção CSRF
  const createProtectedForm = useCallback(
    (formElement: HTMLFormElement) => {
      if (!state.token) {
        throw new Error('Token CSRF não disponível');
      }

      // Remove input CSRF existente
      const existingInput = formElement.querySelector(
        'input[name="csrf_token"]'
      );
      if (existingInput) {
        existingInput.remove();
      }

      // Adiciona novo input com token atual
      const csrfInput = csrfUtils.createHiddenInput(state.token);
      formElement.appendChild(csrfInput);

      return formElement;
    },
    [state.token]
  );

  // Inicializa token na montagem do componente
  useEffect(() => {
    // Tenta obter token existente do meta tag
    const existingToken = csrfUtils.getMetaToken();

    if (existingToken) {
      const validation = validateToken(existingToken, 'GET');
      if (validation.valid) {
        setState({
          token: existingToken,
          isValid: true,
          loading: false,
          error: null,
          lastRefresh: new Date(),
        });
        return;
      }
    }

    // Gera novo token se não existe ou é inválido
    generateToken();
  }, [generateToken, validateToken]);

  // Regenera token quando usuário muda
  useEffect(() => {
    if (user) {
      generateToken();
    }
  }, [user, generateToken]);

  return {
    ...state,
    generateToken,
    validateToken,
    invalidateToken,
    addCSRFHeaders,
    createProtectedForm,
  };
};

/**
 * Hook para proteção XSS
 */
export const useXSSProtection = () => {
  // Sanitiza HTML
  const sanitizeHTML = useCallback(
    (html: string, customConfig?: any): SanitizationResult => {
      return xssProtectionService.sanitizeHTML(html, customConfig);
    },
    []
  );

  // Sanitiza texto
  const sanitizeText = useCallback((text: string): string => {
    return xssProtectionService.sanitizeText(text);
  }, []);

  // Escapa HTML
  const escapeHTML = useCallback((text: string): string => {
    return xssProtectionService.escapeHTML(text);
  }, []);

  // Valida URL
  const validateURL = useCallback((url: string) => {
    return xssProtectionService.validateURL(url);
  }, []);

  // Detecta tentativas XSS
  const detectXSS = useCallback((input: string) => {
    return xssProtectionService.detectXSS(input);
  }, []);

  // Sanitiza props de componente
  const sanitizeProps = useCallback(
    (props: Record<string, any>) => {
      const sanitized = { ...props };

      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string') {
          if (
            key.toLowerCase().includes('html') ||
            key === 'dangerouslySetInnerHTML'
          ) {
            const result = sanitizeHTML(sanitized[key]);
            sanitized[key] = result.sanitized;
          } else {
            sanitized[key] = sanitizeText(sanitized[key]);
          }
        }
      });

      return sanitized;
    },
    [sanitizeHTML, sanitizeText]
  );

  return {
    sanitizeHTML,
    sanitizeText,
    escapeHTML,
    validateURL,
    detectXSS,
    sanitizeProps,
  };
};

/**
 * Hook combinado para proteção CSRF + XSS
 */
export const useSecurityProtection = () => {
  const csrf = useCSRFProtection();
  const xss = useXSSProtection();

  // Faz requisição segura com proteção CSRF e sanitização
  const secureRequest = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      sanitizeResponse: boolean = true
    ) => {
      // Adiciona headers CSRF
      const headers = csrf.addCSRFHeaders(
        (options.headers as Record<string, string>) || {}
      );

      // Sanitiza body se for string
      let { body } = options;
      if (typeof body === 'string') {
        const xssDetection = xss.detectXSS(body);
        if (xssDetection.detected && xssDetection.riskLevel === 'high') {
          throw new Error(
            `Conteúdo bloqueado: ${xssDetection.threats.join(', ')}`
          );
        }
        body = xss.sanitizeText(body);
      }

      const response = await fetch(url, {
        ...options,
        headers,
        body,
      });

      if (sanitizeResponse && response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          const html = await response.text();
          const sanitized = xss.sanitizeHTML(html);

          // Retorna response modificada com conteúdo sanitizado
          return new Response(sanitized.sanitized, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      }

      return response;
    },
    [csrf, xss]
  );

  // Valida e sanitiza dados de entrada
  const validateInput = useCallback(
    (input: string, type: 'text' | 'html' = 'text') => {
      // Detecta XSS
      const xssDetection = xss.detectXSS(input);

      if (xssDetection.detected) {
        if (xssDetection.riskLevel === 'high') {
          throw new Error(
            `Input bloqueado: ${xssDetection.threats.join(', ')}`
          );
        }

        console.warn('Possível XSS detectado:', xssDetection.threats);
      }

      // Sanitiza baseado no tipo
      if (type === 'html') {
        return xss.sanitizeHTML(input);
      } else {
        return {
          sanitized: xss.sanitizeText(input),
          safe: !xssDetection.detected,
        };
      }
    },
    [xss]
  );

  return {
    // CSRF
    csrf,
    // XSS
    xss,
    // Combinados
    secureRequest,
    validateInput,
  };
};

export default useCSRFProtection;
