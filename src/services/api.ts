import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// Configuração base da API
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001') + '/api'

// Helper para obter token armazenado de forma consistente
const getStoredAuthToken = (): string | null => {
  const fromLocalPrimary = localStorage.getItem('sispat_auth_token')
  const fromSessionPrimary = sessionStorage.getItem('sispat_auth_token')
  const fromLocalFallback = localStorage.getItem('token')
  const fromSessionFallback = sessionStorage.getItem('token')
  return (
    fromLocalPrimary ||
    fromSessionPrimary ||
    fromLocalFallback ||
    fromSessionFallback ||
    null
  )
}

// Interceptor para adicionar token de autenticação
const addAuthToken = (config: AxiosRequestConfig) => {
  const token = getStoredAuthToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

// Interceptor para tratar erros de resposta
const handleResponseError = (error: any) => {
  if (error.response?.status === 401) {
    // Token expirado ou inválido
    try {
      localStorage.removeItem('sispat_auth_token')
      sessionStorage.removeItem('sispat_auth_token')
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
    } catch {}
    window.location.href = '/login'
  }
  return Promise.reject(error)
}

// Criação da instância do axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Aplicar interceptors
api.interceptors.request.use(addAuthToken)
api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  handleResponseError
)

// Funções auxiliares para logging
const logRequest = (method: string, endpoint: string, data?: any) => {
  console.log(`API ${method} - Endpoint: ${endpoint}`)
  if (data) {
    console.log(`API ${method} - Body:`, data)
    console.log(`API ${method} - Stringified body:`, JSON.stringify(data))
  }
}

const logResponse = (method: string, endpoint: string, response: any) => {
  console.log(`API ${method} - Response from ${endpoint}:`, response)
}

// Funções de API com logging
export const apiService = {
  get: async <T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> => {
    logRequest('GET', endpoint)
    const response = await api.get<T>(endpoint, config)
    logResponse('GET', endpoint, response)
    return response
  },

  post: async <T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    logRequest('POST', endpoint, data)
    const response = await api.post<T>(endpoint, data, config)
    logResponse('POST', endpoint, response)
    return response
  },

  put: async <T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    logRequest('PUT', endpoint, data)
    const response = await api.put<T>(endpoint, data, config)
    logResponse('PUT', endpoint, response)
    return response
  },

  delete: async <T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> => {
    logRequest('DELETE', endpoint)
    const response = await api.delete<T>(endpoint, config)
    logResponse('DELETE', endpoint, response)
    return response
  },

  patch: async <T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    logRequest('PATCH', endpoint, data)
    const response = await api.patch<T>(endpoint, data, config)
    logResponse('PATCH', endpoint, response)
    return response
  }
}

// Exportar instância do axios e funções de API
export { api }
export default apiService
