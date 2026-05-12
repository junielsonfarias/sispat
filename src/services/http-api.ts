import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/lib/logger';

// URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Criar instância do Axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisição para adicionar token
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ Rotas públicas não precisam de autenticação
    const isPublicRoute = /\/public(\/|$)/.test(config.url || '');
    
    if (!isPublicRoute) {
      // Pegar token do localStorage (SecureStorage armazena como JSON)
      const tokenData = localStorage.getItem('sispat_token');
      
      if (tokenData) {
        try {
          // SecureStorage armazena como JSON, então precisamos fazer parse
          const token = JSON.parse(tokenData);
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          // Se não conseguir fazer parse, usar o valor direto
          config.headers.Authorization = `Bearer ${tokenData}`;
        }
      }
      
      // ✅ Logs apenas em desenvolvimento (sem expor tokens)
      logger.debug(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, { token: !!tokenData ? 'presente' : 'ausente' });
    } else {
      logger.debug(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, { rota: 'pública' });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta para lidar com erros
axiosInstance.interceptors.response.use(
  (response) => {
    logger.debug(`[HTTP] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Se erro 401 e não é retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Tentar refresh token
      const refreshRaw = localStorage.getItem('sispat_refresh_token');
      if (refreshRaw) {
        try {
          // SecureStorage grava como JSON; tenta parse, mas tolera string crua
          let refreshToken: string;
          try {
            refreshToken = JSON.parse(refreshRaw);
          } catch {
            refreshToken = refreshRaw;
          }

          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('sispat_token', JSON.stringify(newToken));
          // Importante: backend gira o refresh token a cada renovação — salvar o novo
          if (newRefreshToken) {
            localStorage.setItem('sispat_refresh_token', JSON.stringify(newRefreshToken));
          }

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          if (import.meta.env.DEV) {
            console.error('[HTTP] Refresh token falhou - redirecionando para login');
          }
          localStorage.removeItem('sispat_token');
          localStorage.removeItem('sispat_refresh_token');
          localStorage.removeItem('sispat_user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
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

