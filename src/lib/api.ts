/**
 * API Client para SISPAT 2.0
 * 
 * Este arquivo contém o cliente HTTP para comunicação com o backend
 */

import { httpApi } from '../services/http-api'

// Re-exportar o httpApi como api para compatibilidade
export const api = httpApi

// Exportar também como default
export default api
