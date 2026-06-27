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
} from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { usePatrimonio } from './PatrimonioContext'
import { useNotifications } from './NotificationContext'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { unwrapList } from '@/services/api-helpers'
import { PATRIMONIOS_ALL_KEY } from '@/hooks/queries/use-all-patrimonios'
import { PATRIMONIO_STATS_KEY } from '@/hooks/queries/use-patrimonio-stats'

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
  const queryClient = useQueryClient()

  // Após mover/alterar bens via transferência, atualiza as telas sob demanda.
  const invalidatePatrimonios = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ALL_KEY })
    void queryClient.invalidateQueries({ queryKey: PATRIMONIO_STATS_KEY })
  }, [queryClient])

  // Buscar transferências da API
  const fetchTransferencias = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const response = await api.get<unknown>('/transfers')
      const transferencias = unwrapList<Record<string, unknown>>(response, 'transfers')
      
      setAllTransferencias(
        transferencias.map((t) => ({
          ...t,
          dataSolicitacao: new Date(String(t.createdAt ?? '')),
          dataTransferencia: new Date(String(t.dataTransferencia ?? '')),
        } as unknown as Transferencia))
      )
    } catch (error) {
      logger.error('Erro ao buscar transferências:', error)
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
        const response = await api.post<
          Omit<Transferencia, 'dataSolicitacao'> & { createdAt: string; dataTransferencia: string; [k: string]: unknown }
        >('/transfers', {
          patrimonioId: data.patrimonioId,
          setorOrigem: data.setorOrigem,
          setorDestino: data.setorDestino,
          localOrigem: data.localOrigem,
          localDestino: data.localDestino,
          motivo: data.motivo,
          dataTransferencia: data.dataTransferencia?.toISOString(),
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
        invalidatePatrimonios()

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
        logger.error('Erro ao criar transferência:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao solicitar transferência.',
        })
        throw error
      }
    },
    [getPatrimonioById, addNotification, invalidatePatrimonios]
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
        await api.patch(`/transfers/${id}/${endpoint}`, {
          observacoes: comentarios,
        })

        setAllTransferencias(prev =>
          prev.map(t =>
            t.id === id
              ? {
                  ...t,
                  status,
                  dataAprovacao: status === 'aprovada' ? new Date() : t.dataAprovacao,
                  aprovadorId: status === 'aprovada' ? user.id : t.aprovadorId,
                  aprovadorNome: status === 'aprovada' ? user.name : t.aprovadorNome,
                  comentariosAprovador: comentarios || t.comentariosAprovador,
                }
              : t,
          ),
        )

        // Atualizar patrimônio localmente se aprovado (o backend já moveu o bem).
        if (status === 'aprovada') {
          const transferencia = allTransferencias.find(t => t.id === id)
          const patrimonio = transferencia
            ? getPatrimonioById(transferencia.patrimonioId)
            : undefined
          if (transferencia && patrimonio) {
            await updatePatrimonio({
              ...patrimonio,
              setor_responsavel: transferencia.setorDestino ?? patrimonio.setor_responsavel,
              local_objeto: transferencia.localDestino ?? patrimonio.local_objeto,
            })
          }
          // O backend já moveu o bem; garante que as telas sob demanda reflitam,
          // mesmo quando o patrimônio não está no cache local do contexto.
          invalidatePatrimonios()
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
        logger.error('Erro ao atualizar status da transferência:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar status da transferência.',
        })
        throw error
      }
    },
    [allTransferencias, updatePatrimonio, getPatrimonioById, addNotification, invalidatePatrimonios]
  )

  const deleteTransferencia = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/transfers/${id}`)

        setAllTransferencias(prev => prev.filter(t => t.id !== id))
        invalidatePatrimonios()

        toast({
          title: 'Sucesso',
          description: 'Transferência deletada com sucesso.',
        })
      } catch (error) {
        logger.error('Erro ao deletar transferência:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao deletar transferência.',
        })
        throw error
      }
    },
    [invalidatePatrimonios]
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
