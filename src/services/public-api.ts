import { httpApi } from './http-api'

interface PublicPatrimonio {
  id: string
  numeroPatrimonio: string
  descricaoBem: string
  tipo?: string
  marca?: string
  modelo?: string
  status: string
  setor?: string
  local?: string
  municipality: string
  municipalityLogo?: string
}

class PublicApi {
  private async request<T>(endpoint: string): Promise<T> {
    try {
      console.log('🔍 [PublicApi] Fazendo requisição:', endpoint)
      
      // ✅ CORREÇÃO: Usar API real em vez de mock
      const response = await httpApi.get<T>(endpoint)
      
      console.log('✅ [PublicApi] Resposta recebida:', response)
      return response
    } catch (error) {
      console.error('❌ [PublicApi] Erro na requisição:', error)
      throw error
    }
  }
  
  async getPatrimonioById(patrimonioId: string): Promise<PublicPatrimonio> {
    // ✅ CORREÇÃO: Usar endpoint real do backend
    return this.request<PublicPatrimonio>(`/public/patrimonios/${patrimonioId}`)
  }
  
  async getPatrimonioByNumero(numeroPatrimonio: string): Promise<PublicPatrimonio> {
    // ✅ CORREÇÃO: Buscar por número de patrimônio
    return this.request<PublicPatrimonio>(`/public/patrimonios/numero/${numeroPatrimonio}`)
  }
}

export const publicApi = new PublicApi()
