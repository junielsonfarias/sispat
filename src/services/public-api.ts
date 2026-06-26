import { httpApi } from './http-api'
import { logger } from '@/lib/logger'

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
      logger.debug('[PublicApi] Fazendo requisição', { endpoint })

      // ✅ CORREÇÃO: Usar API real em vez de mock
      const response = await httpApi.get<T>(endpoint)

      logger.debug('[PublicApi] Resposta recebida', { response })
      return response
    } catch (error) {
      logger.error('[PublicApi] Erro na requisição', { endpoint, error })
      throw error
    }
  }

  async listPatrimonios(): Promise<PublicPatrimonio[]> {
    const response = await this.request<{ patrimonios: PublicPatrimonio[] }>(
      '/public/patrimonios',
    )
    return response.patrimonios ?? []
  }

  async getPatrimonioById(patrimonioId: string): Promise<PublicPatrimonio> {
    // ✅ CORREÇÃO: Usar endpoint real do backend
    // Nota: Esta rota não existe no backend, pode precisar ser implementada ou usar rota autenticada
    const response = await this.request<{ patrimonio: PublicPatrimonio }>(`/public/patrimonios/${patrimonioId}`)
    // Backend retorna { patrimonio: {...} }, então precisamos extrair
    return response.patrimonio
  }
  
  async getPatrimonioByNumero(numeroPatrimonio: string): Promise<PublicPatrimonio> {
    // ✅ CORREÇÃO: Usar rota correta do backend (/patrimonios/:numero, não /patrimonios/numero/:numero)
    const response = await this.request<{ patrimonio: PublicPatrimonio }>(`/public/patrimonios/${numeroPatrimonio}`)
    // Backend retorna { patrimonio: {...} }, então precisamos extrair
    return response.patrimonio
  }
}

export const publicApi = new PublicApi()
