import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import {
  Transferencia,
  TransferenciaStatus,
  HistoricoEntry,
  User,
} from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { usePatrimonio } from './PatrimonioContext'
import { useNotifications } from './NotificationContext'
import { api } from '@/lib/api'

interface TransferContextType {
  transferencias: Transferencia[]
  isLoading: boolean
  addTransferencia: (
    data: Omit<Transferencia, 'id' | 'dataSolicitacao' | 'status'>,
  ) => Promise<void>
  updateTransferenciaStatus: (
    id: string,
    status: TransferenciaStatus,
    user: { id: string; name: string },
    comentarios?: string,
  ) => Promise<void>
  fetchTransferencias: () => Promise<void>
  deleteTransferencia: (id: string) => Promise<void>
}

const TransferContext = createContext<TransferContextType | null>(null)

export const TransferProvider = ({ children }: { children: ReactNode }) => {
  const [allTransferencias, setAllTransferencias] = useState<Transferencia[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const { updatePatrimonio, getPatrimonioById } = usePatrimonio()
  const { addNotification } = useNotifications()

  // Buscar transferências da API
  const fetchTransferencias = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const response = await api.get('/transfers')
      const transferencias = response.transfers || response
      
      setAllTransferencias(
        transferencias.map((t: any) => ({
          ...t,
          dataSolicitacao: new Date(t.createdAt),
          dataTransferencia: new Date(t.dataTransferencia),
        }))
      )
    } catch (error) {
      console.error('Erro ao buscar transferências:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar transferências.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTransferencias()
  }, [fetchTransferencias])

  const transferencias = useMemo(() => {
    // Sistema single-municipality, retornar todas as transferências
    return allTransferencias
  }, [allTransferencias, user])

  const addTransferencia = useCallback(
    async (data: Omit<Transferencia, 'id' | 'dataSolicitacao' | 'status'>) => {
      try {
        const response = await api.post('/transfers', {
          patrimonioId: data.patrimonioId,
          setorOrigem: data.setorOrigem,
          setorDestino: data.setorDestino,
          localOrigem: data.localOrigem,
          localDestino: data.localDestino,
          motivo: data.motivo,
          dataTransferencia: data.dataTransferencia.toISOString(),
          responsavelOrigem: data.responsavelOrigem,
          responsavelDestino: data.responsavelDestino,
          observacoes: data.observacoes,
        })

        const newTransferencia: Transferencia = {
          ...response,
          dataSolicitacao: new Date(response.createdAt),
          dataTransferencia: new Date(response.dataTransferencia),
        }

        setAllTransferencias(prev => [...prev, newTransferencia])

        const patrimonio = getPatrimonioById(data.patrimonioId)
        if (patrimonio) {
          addNotification({
            tipo: 'info',
            titulo: 'Transferência Solicitada',
            mensagem: `Transferência do patrimônio ${patrimonio.numero_patrimonio} solicitada.`,
            link: `/transferencias/${newTransferencia.id}`,
          })
        }

        toast({
          title: 'Sucesso',
          description: 'Transferência solicitada com sucesso.',
        })
      } catch (error) {
        console.error('Erro ao criar transferência:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao solicitar transferência.',
        })
        throw error
      }
    },
    [getPatrimonioById, addNotification]
  )

  const updateTransferenciaStatus = useCallback(
    async (
      id: string,
      status: TransferenciaStatus,
      user: { id: string; name: string },
      comentarios?: string,
    ) => {
      try {
        const endpoint = status === 'aprovada' ? 'approve' : 'reject'
        const response = await api.patch(`/transfers/${id}/${endpoint}`, {
          observacoes: comentarios,
        })

        setAllTransferencias(prev =>
          prev.map(t =>
            t.id === id
              ? {
                  ...t,
                  status,
                  dataAprovacao: status === 'aprovada' ? new Date() : undefined,
                  aprovadoPor: status === 'aprovada' ? user : undefined,
                  comentarios: comentarios || t.comentarios,
                }
              : t,
          ),
        )

        // Atualizar patrimônio se aprovado
        if (status === 'aprovada') {
          const transferencia = allTransferencias.find(t => t.id === id)
          if (transferencia) {
            await updatePatrimonio(transferencia.patrimonioId, {
              setor_responsavel: transferencia.setorDestino,
              local_objeto: transferencia.localDestino,
            })
          }
        }

        addNotification({
          tipo: status === 'aprovada' ? 'success' : 'warning',
          titulo: `Transferência ${status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}`,
          mensagem: `Transferência ${status === 'aprovada' ? 'aprovada' : 'rejeitada'} por ${user.name}.`,
          link: `/transferencias/${id}`,
        })

        toast({
          title: 'Sucesso',
          description: `Transferência ${status === 'aprovada' ? 'aprovada' : 'rejeitada'} com sucesso.`,
        })
      } catch (error) {
        console.error('Erro ao atualizar status da transferência:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar status da transferência.',
        })
        throw error
      }
    },
    [allTransferencias, updatePatrimonio, addNotification]
  )

  const deleteTransferencia = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/transfers/${id}`)
        
        setAllTransferencias(prev => prev.filter(t => t.id !== id))

        toast({
          title: 'Sucesso',
          description: 'Transferência deletada com sucesso.',
        })
      } catch (error) {
        console.error('Erro ao deletar transferência:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao deletar transferência.',
        })
        throw error
      }
    },
    []
  )

  const value: TransferContextType = {
    transferencias,
    isLoading,
    addTransferencia,
    updateTransferenciaStatus,
    fetchTransferencias,
    deleteTransferencia,
  }

  return (
    <TransferContext.Provider value={value}>
      {children}
    </TransferContext.Provider>
  )
}

export const useTransfer = () => {
  const context = useContext(TransferContext)
  if (!context) {
    throw new Error('useTransfer deve ser usado dentro de um TransferProvider')
  }
  return context
}

// Alias para compatibilidade
export const useTransfers = useTransfer
