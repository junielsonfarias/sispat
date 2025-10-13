import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { Imovel, User } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

interface ImovelContextType {
  imoveis: Imovel[]
  isLoading: boolean
  error: string | null
  getImovelById: (id: string) => Imovel | undefined
  addImovel: (
    data: Omit<Imovel, 'id' | 'historico'>,
    user: User,
  ) => Promise<void>
  updateImovel: (id: string, data: Partial<Imovel>, user: User) => Promise<void>
  deleteImovel: (id: string) => Promise<void>
}

const ImovelContext = createContext<ImovelContextType | null>(null)

export const ImovelProvider = ({ children }: { children: ReactNode }) => {
  const [allImoveis, setAllImoveis] = useState<Imovel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchImoveis = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{ imoveis: Imovel[]; pagination: any }>('/imoveis')
      // ✅ CORREÇÃO: A API retorna array direto, não objeto com propriedade imoveis
      const imoveisData = Array.isArray(response) ? response : (response.imoveis || [])
      setAllImoveis(imoveisData)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Falha ao carregar imóveis.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchImoveis()
    }
  }, [user, fetchImoveis])

  const getImovelById = useCallback(
    (id: string) => allImoveis.find((i) => i.id === id),
    [allImoveis],
  )

  const addImovel = useCallback(
    async (data: Omit<Imovel, 'id' | 'historico'>, user: User) => {
      console.log('📝 ImovelContext: Criando imóvel:', data)
      
      // Enviar dados diretamente, não dentro de objeto { data, user }
      const newImovel = await api.post<Imovel>('/imoveis', data)
      
      console.log('✅ ImovelContext: Imóvel criado:', newImovel)
      
      // ✅ PERFORMANCE: Adicionar à lista local (sem refetch completo)
      setAllImoveis((prev) => [...prev, newImovel])
      // await fetchImoveis()  // ❌ Removido: refetch desnecessário (economiza ~500ms)
      
      toast({ description: 'Imóvel cadastrado com sucesso.' })
    },
    [], // ✅ PERFORMANCE: Removida dependência fetchImoveis
  )

  const updateImovel = useCallback(
    async (id: string, data: Partial<Imovel>, user: User) => {
      console.log('📝 ImovelContext: Atualizando imóvel:', { id, data })
      
      // Enviar dados diretamente
      const updatedImovel = await api.put<Imovel>(`/imoveis/${id}`, data)
      
      console.log('✅ ImovelContext: Imóvel atualizado:', updatedImovel)
      
      setAllImoveis((prev) =>
        prev.map((i) => (i.id === id ? updatedImovel : i)),
      )
      toast({ description: 'Imóvel atualizado com sucesso.' })
    },
    [],
  )

  const deleteImovel = useCallback(async (id: string) => {
    await api.delete(`/imoveis/${id}`)
    setAllImoveis((prev) => prev.filter((i) => i.id !== id))
    toast({ description: 'Imóvel excluído com sucesso.' })
  }, [])

  const value = useMemo(
    () => ({
      imoveis: allImoveis,
      isLoading,
      error,
      getImovelById,
      addImovel,
      updateImovel,
      deleteImovel,
    }),
    [
      allImoveis,
      isLoading,
      error,
      getImovelById,
      addImovel,
      updateImovel,
      deleteImovel,
    ],
  )

  return (
    <ImovelContext.Provider value={value}>{children}</ImovelContext.Provider>
  )
}

export const useImovel = () => {
  const context = useContext(ImovelContext)
  if (!context) {
    throw new Error('useImovel must be used within an ImovelProvider')
  }
  return context
}
