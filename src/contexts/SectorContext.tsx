import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { Sector } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

interface SectorContextType {
  sectors: Sector[]
  isLoading: boolean
  setSectors: (sectors: Sector[]) => void
  getSectorById: (id: string) => Sector | undefined
  addSector: (data: Omit<Sector, 'id'>) => Promise<void>
  updateSector: (
    id: string,
    data: Omit<Sector, 'id' | 'municipalityId'>,
  ) => Promise<void>
  deleteSector: (id: string) => Promise<void>
  refreshSectors: () => Promise<void>
}

const SectorContext = createContext<SectorContextType | null>(null)

export const SectorProvider = ({ children }: { children: ReactNode }) => {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const fetchSectors = useCallback(async () => {
    if (!user) return
    console.log('🔍 SectorContext: Iniciando busca de setores...')
    setIsLoading(true)
    try {
      const response = await api.get<{ sectors: Sector[]; pagination: any }>('/sectors')
      console.log('🔍 SectorContext: Resposta da API:', response)
      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade sectors
      const sectorsData = Array.isArray(response) ? response : (response.sectors || [])
      console.log('🔍 SectorContext: Setores carregados:', sectorsData.length)
      setSectors(sectorsData)
    } catch (error) {
      console.error('❌ SectorContext: Erro ao buscar setores:', error)
      
      // ✅ CORREÇÃO: Se for erro de conexão, usar dados vazios em vez de mostrar erro
      if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED') {
        console.log('⚠️  Backend não disponível - usando lista vazia de setores')
        setSectors([])
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao carregar setores.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchSectors()
      
      // ✅ Polling: Atualizar setores a cada 5 segundos
      const intervalId = setInterval(() => {
        fetchSectors()
      }, 5000) // 5 segundos
      
      return () => clearInterval(intervalId)
    }
  }, [user, fetchSectors])

  const getSectorById = useCallback(
    (id: string) => sectors.find((s) => s.id === id),
    [sectors],
  )

  const addSector = async (data: Omit<Sector, 'id'>) => {
    const newSector = await api.post<Sector>('/sectors', data)
    // ✅ Adicionar ao estado local para refletir imediatamente
    setSectors((prev) => [...prev, newSector])
    toast({ description: 'Setor criado com sucesso.' })
  }

  const updateSector = async (
    id: string,
    data: Omit<Sector, 'id' | 'municipalityId'>,
  ) => {
    console.log('[DEV] 🔄 SectorContext.updateSector chamado:', {
      id,
      dadosEnviados: data,
    });
    
    try {
      const updatedSector = await api.put<Sector>(`/sectors/${id}`, data)
      
      console.log('[DEV] ✅ SectorContext: Resposta do backend:', updatedSector);
      
      setSectors((prev) => prev.map((s) => (s.id === id ? updatedSector : s)))
      toast({ description: 'Setor atualizado com sucesso.' })
    } catch (error: any) {
      // Se o setor não existe mais (404), remover do estado local
      if (error.response?.status === 404) {
        setSectors((prev) => prev.filter((s) => s.id !== id))
        toast({
          variant: 'destructive',
          title: 'Setor não encontrado',
          description: 'Este setor foi excluído. A lista será atualizada.',
        })
        // Atualizar a lista completa
        await fetchSectors()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar setor.',
        })
        throw error
      }
    }
  }

  const deleteSector = async (id: string) => {
    try {
      await api.delete(`/sectors/${id}`)
      setSectors((prev) => prev.filter((s) => s.id !== id))
      toast({ description: 'Setor excluído com sucesso.' })
    } catch (error: any) {
      // Se o setor já foi deletado (404), apenas remover do estado local
      if (error.response?.status === 404) {
        setSectors((prev) => prev.filter((s) => s.id !== id))
        toast({ 
          description: 'Setor já foi excluído anteriormente.',
          variant: 'default'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir setor.',
        })
        throw error
      }
    }
  }

  const refreshSectors = useCallback(async () => {
    await fetchSectors()
  }, [fetchSectors])

  return (
    <SectorContext.Provider
      value={{
        sectors,
        isLoading,
        setSectors,
        getSectorById,
        addSector,
        updateSector,
        deleteSector,
        refreshSectors,
      }}
    >
      {children}
    </SectorContext.Provider>
  )
}

export const useSectors = () => {
  const context = useContext(SectorContext)
  if (!context) {
    throw new Error('useSectors must be used within a SectorProvider')
  }
  return context
}
