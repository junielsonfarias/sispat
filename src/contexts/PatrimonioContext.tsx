import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { Patrimonio } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api-adapter'

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
}

const PatrimonioContext = createContext<PatrimonioContextType | null>(null)

export const PatrimonioProvider = ({ children }: { children: ReactNode }) => {
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchPatrimonios = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      console.log('🔍 [DEV] PatrimonioContext: Buscando patrimônios...')
      const response = await api.get<{ patrimonios: Patrimonio[]; pagination: any }>('/patrimonios')
      console.log('📊 [DEV] PatrimonioContext: Resposta da API:', response)
      console.log('📊 [DEV] PatrimonioContext: Tipo da resposta:', typeof response)
      console.log('📊 [DEV] PatrimonioContext: É array?', Array.isArray(response))
      
      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade patrimonios
      const patrimoniosData = Array.isArray(response) ? response : (response.patrimonios || [])
      
      console.log('✅ [DEV] PatrimonioContext: Patrimônios extraídos:', patrimoniosData.length)
      console.log('📝 [DEV] PatrimonioContext: Primeiros 3 patrimônios:', patrimoniosData.slice(0, 3))
      
      setPatrimonios(patrimoniosData)
    } catch (err) {
      console.error('❌ [DEV] PatrimonioContext: Erro ao carregar:', err)
      
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de erro
      if (err?.code === 'ERR_NETWORK' || err?.code === 'ERR_CONNECTION_REFUSED') {
        console.log('⚠️  Backend não disponível - usando lista vazia de patrimônios')
        setPatrimonios([])
        setError(null) // Não mostrar erro para o usuário
      } else {
        setError('Falha ao carregar patrimônios.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchPatrimonios()
    }
  }, [user, fetchPatrimonios])

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
    // Adicionar o novo patrimônio à lista local
    setPatrimonios((prev) => Array.isArray(prev) ? [...prev, newPatrimonio] : [newPatrimonio])
    return newPatrimonio
  }

  const updatePatrimonio = async (updatedPatrimonio: Patrimonio) => {
    console.log('🔄 PatrimonioContext - updatePatrimonio chamado com:', {
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
    
    console.log('✅ PatrimonioContext - Resposta do backend:', response)
    
    setPatrimonios((prev) =>
      Array.isArray(prev) ? prev.map((p) => (p.id === updatedPatrimonio.id ? updatedPatrimonio : p)) : [updatedPatrimonio]
    )
  }

  const deletePatrimonio = async (patrimonioId: string) => {
    await api.delete(`/patrimonios/${patrimonioId}`)
    setPatrimonios((prev) => Array.isArray(prev) ? prev.filter((p) => p.id !== patrimonioId) : [])
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
        return response
      } catch (error) {
        console.error('Erro ao buscar patrimônio por ID:', error)
        throw error
      }
    },
    [],
  )

  return (
    <PatrimonioContext.Provider
      value={{
        patrimonios,
        isLoading,
        error,
        setPatrimonios,
        addPatrimonio,
        updatePatrimonio,
        deletePatrimonio,
        getPatrimonioById,
        fetchPatrimonioById,
      }}
    >
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
