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
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar setores.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchSectors()
    }
  }, [user, fetchSectors])

  const getSectorById = useCallback(
    (id: string) => sectors.find((s) => s.id === id),
    [sectors],
  )

  const addSector = async (data: Omit<Sector, 'id'>) => {
    await api.post<Sector>('/sectors', data)
    // Não adicionar novamente pois o mock API já adiciona à lista
    // setSectors((prev) => [...prev, newSector])
    toast({ description: 'Setor criado com sucesso.' })
  }

  const updateSector = async (
    id: string,
    data: Omit<Sector, 'id' | 'municipalityId'>,
  ) => {
    const updatedSector = await api.put<Sector>(`/sectors/${id}`, data)
    setSectors((prev) => prev.map((s) => (s.id === id ? updatedSector : s)))
    toast({ description: 'Setor atualizado com sucesso.' })
  }

  const deleteSector = async (id: string) => {
    await api.delete(`/sectors/${id}`)
    setSectors((prev) => prev.filter((s) => s.id !== id))
    toast({ description: 'Setor excluído com sucesso.' })
  }

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
