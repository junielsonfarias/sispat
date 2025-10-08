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
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar locais.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchLocais()
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
      // Não adicionar novamente pois o mock API já adiciona à lista
      // setLocais((prev) => [...prev, newLocal])
      toast({ description: 'Local criado com sucesso.' })
    },
    [user],
  )

  const updateLocal = useCallback(
    async (id: string, name: string, sectorId: string) => {
      const updatedLocal = await api.put<Local>(`/locais/${id}`, {
        name,
        sectorId,
      })
      setLocais((prev) => prev.map((l) => (l.id === id ? updatedLocal : l)))
      toast({ description: 'Local atualizado com sucesso.' })
    },
    [],
  )

  const deleteLocal = useCallback(async (id: string) => {
    await api.delete(`/locais/${id}`)
    setLocais((prev) => prev.filter((l) => l.id !== id))
    toast({ description: 'Local excluído com sucesso.' })
  }, [])

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
