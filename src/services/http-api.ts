import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/lib/logger';

// URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Criar instância do Axios
// withCredentials: true → envia/recebe cookies HttpOnly (sessão JWT + CSRF)
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Lê o cookie csrf_token (set pelo backend após login/refresh, não HttpOnly).
 * Retorna string vazia se não houver — caller deve buscar /api/auth/csrf antes
 * de mutações se isso for crítico (em geral o cookie está presente após login).
 */
const readCsrfCookie = (): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// Interceptor de requisição: cookies HttpOnly + CSRF header + fallback Bearer
axiosInstance.interceptors.request.use(
  (config) => {
    const isPublicRoute = /\/public(\/|$)/.test(config.url || '');

    if (!isPublicRoute) {
      // Fallback Bearer: se ainda houver token em localStorage (back-compat
      // pré-Sprint 13), envia também no header. Cookies HttpOnly têm
      // precedência no backend mas isso facilita transição.
      const tokenData = localStorage.getItem('sispat_token');
      if (tokenData) {
        try {
          const token = JSON.parse(tokenData);
          config.headers.Authorization = `Bearer ${token}`;
        } catch {
          config.headers.Authorization = `Bearer ${tokenData}`;
        }
      }

      // CSRF: se request é mutável e existe cookie csrf, ecoar no header.
      // Backend faz double-submit check em rotas com cookie de sessão.
      const method = (config.method || 'get').toLowerCase();
      if (MUTATING_METHODS.has(method)) {
        const csrf = readCsrfCookie();
        if (csrf) {
          config.headers['X-CSRF-Token'] = csrf;
        }
      }

      logger.debug(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
    } else {
      logger.debug(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, { rota: 'pública' });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de resposta para lidar com erros
axiosInstance.interceptors.response.use(
  (response) => {
    logger.debug(`[HTTP] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Rotas de autenticação não devem disparar refresh: um 401 ali é credencial
    // inválida / sessão ausente e deve propagar para a UI (ex.: "senha incorreta").
    const reqUrl = originalRequest?.url || '';
    const isAuthRoute = /\/auth\/(login|refresh|logout|forgot-password|reset-password)/.test(reqUrl);

    // Se erro 401 e não é retry
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      // Tenta refresh. Em produção a sessão é por cookie HttpOnly (sem token no
      // storage), então a tentativa é sempre feita com withCredentials; em dev
      // (cross-origin), envia o refresh token do storage no body.
      try {
        // SecureStorage grava como JSON; tenta parse, mas tolera string crua
        const refreshRaw = localStorage.getItem('sispat_refresh_token');
        let refreshToken: string | undefined;
        if (refreshRaw) {
          try {
            refreshToken = JSON.parse(refreshRaw);
          } catch {
            refreshToken = refreshRaw;
          }
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true },
        );

        const { token: newToken, refreshToken: newRefreshToken } = response.data;
        // Em produção não vêm tokens no body (o cookie já foi renovado no Set-Cookie).
        if (newToken) {
          localStorage.setItem('sispat_token', JSON.stringify(newToken));
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        // Backend gira o refresh token a cada renovação — salvar o novo, se houver.
        if (newRefreshToken) {
          localStorage.setItem('sispat_refresh_token', JSON.stringify(newRefreshToken));
        }

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        if (import.meta.env.DEV) {
          console.error('[HTTP] Refresh token falhou - redirecionando para login');
        }
        localStorage.removeItem('sispat_token');
        localStorage.removeItem('sispat_refresh_token');
        localStorage.removeItem('sispat_user');

        // Toast antes de redirecionar — usuário entende o que aconteceu.
        // Import dinâmico para não acoplar todo o axios a use-toast.
        import('@/hooks/use-toast')
          .then(({ toast }) => {
            toast({
              variant: 'destructive',
              title: 'Sessão expirada',
              description: 'Sua sessão expirou. Faça login novamente.',
            });
          })
          .catch(() => {
            // toast não disponível — apenas redireciona
          });

        // Pequeno delay para o toast aparecer antes do hard reload
        setTimeout(() => {
          window.location.href = '/login';
        }, 600);

        return Promise.reject(refreshError);
      }
    }

    // ✅ Logs de erro apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.error(`[HTTP] ❌ ${error.response?.status || 'ERROR'} ${error.config?.url}`, error.response?.data);
    }
    
    // ✅ OTIMIZAÇÃO: Tratamento de erro mais robusto
    const originalError = error as any
    
    // Melhorar informações de erro para facilitar debugging
    if (originalError.code === 'ERR_NETWORK' || originalError.code === 'ERR_CONNECTION_REFUSED') {
      originalError.message = `Backend não disponível (${originalError.config?.url})`
    } else if (originalError.response) {
      // Erro de resposta do servidor (4xx, 5xx)
      const status = originalError.response.status
      const data = originalError.response.data
      
      // Mensagens de erro mais amigáveis
      if (status === 401) {
        originalError.message = 'Sua sessão expirou. Por favor, faça login novamente.'
      } else if (status === 403) {
        originalError.message = 'Você não tem permissão para realizar esta ação.'
      } else if (status === 404) {
        originalError.message = 'Recurso não encontrado.'
      } else if (status === 500) {
        originalError.message = 'Erro interno do servidor. Por favor, tente novamente mais tarde.'
      } else if (data?.message) {
        originalError.message = data.message
      } else if (data?.error) {
        originalError.message = typeof data.error === 'string' ? data.error : 'Erro ao processar requisição.'
      }
    }
    
    // Log apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.error('❌ [HTTP API Error]:', {
        code: originalError.code,
        status: originalError.response?.status,
        message: originalError.message,
        url: originalError.config?.url,
      })
    }
    
    return Promise.reject(originalError);
  }
);

// API Client
export const httpApi = {
  // GET
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    // ✅ Adicionar headers no-cache para evitar cache do navegador
    const configWithNoCache = {
      ...config,
      headers: {
        ...config?.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    };
    const response: AxiosResponse<T> = await axiosInstance.get(endpoint, configWithNoCache);
    return response.data;
  },

  // POST
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosInstance.post(endpoint, data, config);
    return response.data;
  },

  // PUT
  async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosInstance.put(endpoint, data, config);
    return response.data;
  },

  // PATCH
  async patch<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosInstance.patch(endpoint, data, config);
    return response.data;
  },

  // DELETE
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosInstance.delete(endpoint, config);
    return response.data;
  },
};

export default httpApi;
export { httpApi as api };

