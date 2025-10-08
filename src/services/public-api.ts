import { mockApi } from './mock-api'

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
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Simular erro ocasional
    if (Math.random() < 0.05) {
      throw new Error('Erro de conexão')
    }
    
    // Mapear endpoints para métodos do mockApi
    if (endpoint.startsWith('/public/consulta/')) {
      const id = endpoint.split('/')[3]
      return mockApi.getPublicPatrimonioById(id) as Promise<T>
    }
    
    throw new Error(`Endpoint não encontrado: ${endpoint}`)
  }
  
  async getPatrimonioById(patrimonioId: string): Promise<PublicPatrimonio> {
    return this.request<PublicPatrimonio>(`/public/consulta/${patrimonioId}`)
  }
}

export const publicApi = new PublicApi()
