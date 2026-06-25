import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Patrimonio } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api-adapter'
import { isConnectionDownError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { PATRIMONIOS_ALL_KEY } from '@/hooks/queries/use-all-patrimonios'

// Chaves adicionais invalidadas após mutações
const PATRIMONIO_STATS_KEY = ['patrimonio-stats']
const PATRIMONIOS_ANALYTICS_KEY = ['patrimonios-analytics']

interface PatrimonioContextType {
  patrimonios: Patrimonio[]
  isLoading: boolean
  error: string | null
  setPatrimonios: (patrimonios: Patrimonio[]) => void
  addPatrimonio: (
    patrimonio: Omit<
      Patrimonio,
      | 'id'
      | 'historico_movimentacao'
      | 'entityName'
      | 'notes'
      | 'municipalityId'
    >,
  ) => Promise<Patrimonio>
  updatePatrimonio: (updatedPatrimonio: Patrimonio) => Promise<void>
  deletePatrimonio: (patrimonioId: string) => Promise<void>
  getPatrimonioById: (patrimonioId: string) => Patrimonio | undefined
  fetchPatrimonioById: (patrimonioId: string) => Promise<{ patrimonio: Patrimonio }>
  fetchPatrimonios: () => Promise<void>
}

const PatrimonioContext = createContext<PatrimonioContextType | null>(null)

export const PatrimonioProvider = ({ children }: { children: ReactNode }) => {
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const fetchPatrimonios = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      logger.debug('PatrimonioContext: Buscando patrimônios...')
      // ?all=true → conjunto COMPLETO (sem o teto de 50 da paginação). As telas
      // de análise/agregação/relatório que leem este array precisam de todos os
      // bens, não só da 1ª página. O backend aplica tenant + permissão de setor.
      const response = await api.get<{ patrimonios: Patrimonio[]; pagination: any }>(
        '/patrimonios?all=true',
      )
      logger.debug('PatrimonioContext: Resposta da API', {
        response,
        tipo: typeof response,
        isArray: Array.isArray(response),
      })

      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade patrimonios
      const patrimoniosData = Array.isArray(response) ? response : (response.patrimonios || [])

      logger.debug('PatrimonioContext: Patrimônios extraídos', {
        count: patrimoniosData.length,
        firstThree: patrimoniosData.slice(0, 3),
      })
      
      setPatrimonios(patrimoniosData)
    } catch (err) {
      logger.error('PatrimonioContext: Erro ao carregar:', err)
      
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de erro
      if (isConnectionDownError(err)) {
        logger.debug('Backend não disponível - usando lista vazia de patrimônios')
        setPatrimonios([])
        setError(null) // Não mostrar erro para o usuário
      } else {
        setError('Falha ao carregar patrimônios.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // NOTA: o fetch automático ao login foi REMOVIDO intencionalmente.
  // As telas de análise/listagem/export usam useAllPatrimonios() (React Query, sob demanda).
  // fetchPatrimonios() permanece exportado para uso manual (SyncContext, etc.).

  const addPatrimonio = async (
    patrimonioData: Omit<
      Patrimonio,
      | 'id'
      | 'historico_movimentacao'
      | 'entityName'
      | 'notes'
      | 'municipalityId'
    >,
  ): Promise<Patrimonio> => {
    const response = await api.post<{ message: string; patrimonio: Patrimonio }>(
      '/patrimonios',
      patrimonioData,
    )
    // Extrair o patrimônio da resposta
    const newPatrimonio = response.patrimonio
    // Adicionar o novo patrimônio à lista local (atualização otimista do contexto legado)
    setPatrimonios((prev) => Array.isArray(prev) ? [...prev, newPatrimonio] : [newPatrimonio])
    // Invalidar caches React Query para que telas sob demanda reflitam a mudança
    void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ALL_KEY })
    void queryClient.invalidateQueries({ queryKey: PATRIMONIO_STATS_KEY })
    void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ANALYTICS_KEY })
    return newPatrimonio
  }

  const updatePatrimonio = async (updatedPatrimonio: Patrimonio) => {
    logger.debug('PatrimonioContext - updatePatrimonio chamado', {
      id: updatedPatrimonio.id,
      fotos: updatedPatrimonio.fotos,
      fotosLength: updatedPatrimonio.fotos?.length,
    })
    
    // Remover campos de relacionamentos que não devem ser enviados
    const { 
      sector, 
      local, 
      tipoBem, 
      municipality, 
      acquisitionForm, 
      creator, 
      historico, 
      notes,
      notas,
      transferencias, 
      emprestimos,
      subPatrimonios, 
      inventoryItems, 
      manutencoes, 
      documentosFiles,
      ...patrimonioData 
    } = updatedPatrimonio as any
    
    const response = await api.put(`/patrimonios/${updatedPatrimonio.id}`, patrimonioData)
    
    logger.debug('PatrimonioContext - Resposta do backend', { response })
    
    setPatrimonios((prev) =>
      Array.isArray(prev) ? prev.map((p) => (p.id === updatedPatrimonio.id ? updatedPatrimonio : p)) : [updatedPatrimonio]
    )
    // Invalidar caches React Query para que telas sob demanda reflitam a mudança
    void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ALL_KEY })
    void queryClient.invalidateQueries({ queryKey: PATRIMONIO_STATS_KEY })
    void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ANALYTICS_KEY })
  }

  const deletePatrimonio = async (patrimonioId: string) => {
    await api.delete(`/patrimonios/${patrimonioId}`)
    setPatrimonios((prev) => Array.isArray(prev) ? prev.filter((p) => p.id !== patrimonioId) : [])
    // Invalidar caches React Query para que telas sob demanda reflitam a mudança
    void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ALL_KEY })
    void queryClient.invalidateQueries({ queryKey: PATRIMONIO_STATS_KEY })
    void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ANALYTICS_KEY })
  }

  const getPatrimonioById = useCallback(
    (patrimonioId: string) => {
      return patrimonios.find(
        (p) => p.id === patrimonioId || p.numero_patrimonio === patrimonioId,
      )
    },
    [patrimonios],
  )

  const fetchPatrimonioById = useCallback(
    async (patrimonioId: string): Promise<{ patrimonio: Patrimonio }> => {
      try {
        const response = await api.get<{ patrimonio: Patrimonio }>(`/patrimonios/${patrimonioId}`)
        // O backend devolve o histórico no campo `historico`; o frontend lê
        // `historico_movimentacao`. Normaliza para a aba de histórico do BensView
        // (e telas de detalhe) exibir corretamente.
        const p = response.patrimonio as Patrimonio & { historico?: Patrimonio['historico_movimentacao'] }
        return {
          patrimonio: {
            ...p,
            historico_movimentacao: p.historico_movimentacao ?? p.historico ?? [],
          },
        }
      } catch (error) {
        logger.error('Erro ao buscar patrimônio por ID:', error)
        throw error
      }
    },
    [],
  )

  // F11: memoiza o value para evitar re-render em cascata de consumidores
  // toda vez que o provider re-renderiza por motivo não relacionado.
  const value = useMemo(
    () => ({
      patrimonios,
      isLoading,
      error,
      setPatrimonios,
      addPatrimonio,
      updatePatrimonio,
      deletePatrimonio,
      getPatrimonioById,
      fetchPatrimonioById,
      fetchPatrimonios,
    }),
    [
      patrimonios,
      isLoading,
      error,
      addPatrimonio,
      updatePatrimonio,
      deletePatrimonio,
      getPatrimonioById,
      fetchPatrimonioById,
      fetchPatrimonios,
    ],
  )

  return (
    <PatrimonioContext.Provider value={value}>
      {children}
    </PatrimonioContext.Provider>
  )
}

export const usePatrimonio = () => {
  const context = useContext(PatrimonioContext)
  if (!context) {
    throw new Error('usePatrimonio must be used within a PatrimonioProvider')
  }
  return context
}
