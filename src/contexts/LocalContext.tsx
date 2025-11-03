import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { Local } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

interface LocalContextType {
  locais: Local[]
  isLoading: boolean
  setLocais: (locais: Local[]) => void
  getLocaisBySectorId: (sectorId: string) => Local[]
  addLocal: (name: string, sectorId: string) => Promise<void>
  updateLocal: (id: string, name: string, sectorId: string) => Promise<void>
  deleteLocal: (id: string) => Promise<void>
  refreshLocais: () => Promise<void>
}

const LocalContext = createContext<LocalContextType | null>(null)

export const LocalProvider = ({ children }: { children: ReactNode }) => {
  const [locais, setLocais] = useState<Local[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const fetchLocais = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const response = await api.get<{ locais: Local[]; pagination: any }>('/locais')
      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade locais
      const locaisData = Array.isArray(response) ? response : (response.locais || [])
      setLocais(locaisData)
    } catch (error) {
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de mostrar erro
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED') {
        if (import.meta.env.DEV) {
          console.log('⚠️  Backend não disponível - usando lista vazia de locais')
        }
        setLocais([])
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao carregar locais.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchLocais()
      
      // ✅ OTIMIZAÇÃO: Polling reduzido para 60 segundos (dados raramente mudam)
      const intervalId = setInterval(() => {
        fetchLocais()
      }, 60000) // 60 segundos
      
      return () => clearInterval(intervalId)
    }
  }, [user, fetchLocais])

  const getLocaisBySectorId = useCallback(
    (sectorId: string) => {
      return locais.filter((l) => l.sectorId === sectorId)
    },
    [locais],
  )

  const addLocal = useCallback(
    async (name: string, sectorId: string) => {
      if (!user) return
      const newLocal = await api.post<Local>('/locais', {
        name,
        sectorId,
        municipalityId: 'municipality-1', // Hardcoded para um único município
      })
      // ✅ Adicionar ao estado local para refletir imediatamente
      setLocais((prev) => [...prev, newLocal])
      toast({ description: 'Local criado com sucesso.' })
    },
    [user],
  )

  const updateLocal = useCallback(
    async (id: string, name: string, sectorId: string) => {
      try {
        const updatedLocal = await api.put<Local>(`/locais/${id}`, {
          name,
          sectorId,
        })
        setLocais((prev) => prev.map((l) => (l.id === id ? updatedLocal : l)))
        toast({ description: 'Local atualizado com sucesso.' })
      } catch (error: any) {
        // Se o local não existe mais (404), remover do estado local
        if (error.response?.status === 404) {
          setLocais((prev) => prev.filter((l) => l.id !== id))
          toast({
            variant: 'destructive',
            title: 'Local não encontrado',
            description: 'Este local foi excluído. A lista será atualizada.',
          })
          // Atualizar a lista completa
          await fetchLocais()
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Falha ao atualizar local.',
          })
          throw error
        }
      }
    },
    [fetchLocais],
  )

  const deleteLocal = useCallback(async (id: string) => {
    try {
      await api.delete(`/locais/${id}`)
      setLocais((prev) => prev.filter((l) => l.id !== id))
      toast({ description: 'Local excluído com sucesso.' })
    } catch (error: any) {
      // Se o local já foi deletado (404), apenas remover do estado local
      if (error.response?.status === 404) {
        setLocais((prev) => prev.filter((l) => l.id !== id))
        toast({ 
          description: 'Local já foi excluído anteriormente.',
          variant: 'default'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir local.',
        })
        throw error
      }
    }
  }, [])

  const refreshLocais = useCallback(async () => {
    await fetchLocais()
  }, [fetchLocais])

  return (
    <LocalContext.Provider
      value={{
        locais,
        isLoading,
        setLocais,
        getLocaisBySectorId,
        addLocal,
        updateLocal,
        deleteLocal,
        refreshLocais,
      }}
    >
      {children}
    </LocalContext.Provider>
  )
}

export const useLocais = () => {
  const context = useContext(LocalContext)
  if (!context) {
    throw new Error('useLocais must be used within a LocalProvider')
  }
  return context
}
