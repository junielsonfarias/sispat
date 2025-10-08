import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

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
    // Pegar token do localStorage (SecureStorage armazena como JSON)
    const tokenData = localStorage.getItem('sispat_token');
    
    // ✅ Logs apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('[HTTP] Token data from localStorage:', tokenData);
    }
    
    if (tokenData) {
      try {
        // SecureStorage armazena como JSON, então precisamos fazer parse
        const token = JSON.parse(tokenData);
        config.headers.Authorization = `Bearer ${token}`;
        
        if (import.meta.env.DEV) {
          console.log(`[HTTP] Token encontrado (JSON): ${token.substring(0, 20)}...`);
        }
      } catch (error) {
        // Se não conseguir fazer parse, usar o valor direto
        config.headers.Authorization = `Bearer ${tokenData}`;
        
        if (import.meta.env.DEV) {
          console.log(`[HTTP] Token direto: ${tokenData.substring(0, 20)}...`);
        }
      }
    } else if (import.meta.env.DEV) {
      console.log('[HTTP] Nenhum token encontrado no localStorage');
    }
    
    if (import.meta.env.DEV) {
      console.log(`[HTTP] Headers finais:`, config.headers);
      console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
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
    // ✅ Logs apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`[HTTP] ✅ ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Se erro 401 e não é retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Tentar refresh token
      const refreshToken = localStorage.getItem('sispat_refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: JSON.parse(refreshToken),
          });

          const { token: newToken } = response.data;
          localStorage.setItem('sispat_token', JSON.stringify(newToken));

          // Retentar requisição original
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // Refresh falhou, redirecionar para login
          if (import.meta.env.DEV) {
            console.error('[HTTP] Refresh token expirado');
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
    return Promise.reject(error);
  }
);

// API Client
export const httpApi = {
  // GET
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosInstance.get(endpoint, config);
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

