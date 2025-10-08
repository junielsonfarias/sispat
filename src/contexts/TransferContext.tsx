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

interface TransferContextType {
  transferencias: Transferencia[]
  addTransferencia: (
    data: Omit<Transferencia, 'id' | 'dataSolicitacao' | 'status'>,
  ) => void
  updateTransferenciaStatus: (
    id: string,
    status: TransferenciaStatus,
    user: { id: string; name: string },
    comentarios?: string,
  ) => void
}

const TransferContext = createContext<TransferContextType | null>(null)

export const TransferProvider = ({ children }: { children: ReactNode }) => {
  const [allTransferencias, setAllTransferencias] = useState<Transferencia[]>(
    [],
  )
  const { user } = useAuth()
  const { updatePatrimonio, getPatrimonioById } = usePatrimonio()
  const { addNotification } = useNotifications()

  useEffect(() => {
    // In a real app, this would fetch from an API
    const stored = localStorage.getItem('sispat_transferencias')
    if (stored) {
      setAllTransferencias(
        JSON.parse(stored).map((t: any) => ({
          ...t,
          dataSolicitacao: new Date(t.dataSolicitacao),
          dataAprovacao: t.dataAprovacao
            ? new Date(t.dataAprovacao)
            : undefined,
        })),
      )
    }
  }, [])

  const transferencias = useMemo(() => {
    // ✅ CORREÇÃO: Sistema single-municipality, retornar todas as transferências
    return allTransferencias
  }, [allTransferencias, user])

  const persist = (newTransferencias: Transferencia[]) => {
    // In a real app, this would be an API call
    localStorage.setItem(
      'sispat_transferencias',
      JSON.stringify(newTransferencias),
    )
    setAllTransferencias(newTransferencias)
  }

  const addTransferencia = useCallback(
    (data: Omit<Transferencia, 'id' | 'dataSolicitacao' | 'status'>) => {
      const newTransferencia: Transferencia = {
        ...data,
        id: generateId(),
        dataSolicitacao: new Date(),
        status: 'pendente',
      }
      persist([...allTransferencias, newTransferencia])
      const patrimonio = getPatrimonioById(data.patrimonioId)
      if (patrimonio) {
        updatePatrimonio({ ...patrimonio, transferencia_pendente: true })
      }
      toast({ description: 'Solicitação de transferência enviada.' })
    },
    [allTransferencias, getPatrimonioById, updatePatrimonio],
  )

  const updateTransferenciaStatus = useCallback(
    (
      id: string,
      status: TransferenciaStatus,
      approver: { id: string; name: string },
      comentarios?: string,
    ) => {
      const transferencia = allTransferencias.find((t) => t.id === id)
      if (!transferencia) return

      const updatedTransferencia: Transferencia = {
        ...transferencia,
        status,
        aprovadorId: approver.id,
        aprovadorNome: approver.name,
        dataAprovacao: new Date(),
        comentariosAprovador: comentarios,
      }

      persist(
        allTransferencias.map((t) => (t.id === id ? updatedTransferencia : t)),
      )

      const patrimonio = getPatrimonioById(transferencia.patrimonioId)
      if (patrimonio) {
        const updates: Partial<typeof patrimonio> = {
          transferencia_pendente: false,
        }
        const historyEntry: HistoricoEntry = {
          date: new Date(),
          action:
            transferencia.type === 'transferencia' ? 'Transferência' : 'Doação',
          details: `${
            transferencia.type === 'transferencia' ? 'Transferência' : 'Doação'
          } ${status === 'aprovada' ? 'aprovada' : 'rejeitada'}. Motivo: ${
            transferencia.motivo
          }`,
          user: approver.name,
        }

        if (status === 'aprovada') {
          if (transferencia.type === 'transferencia') {
            updates.setor_responsavel = transferencia.setorDestino!
          } else {
            updates.status = 'baixado'
            updates.doado = true
          }
        }

        updatePatrimonio({
          ...patrimonio,
          ...updates,
          historico_movimentacao: [
            historyEntry,
            ...patrimonio.historico_movimentacao,
          ],
        })

        addNotification({
          userId: transferencia.solicitanteId,
          title: `Solicitação ${
            status === 'aprovada' ? 'Aprovada' : 'Rejeitada'
          }`,
          description: `Sua solicitação para o bem ${patrimonio.numero_patrimonio} foi ${
            status === 'aprovada' ? 'aprovada' : 'rejeitada'
          }.`,
          type: 'transfer',
          link: `/bens-cadastrados/ver/${patrimonio.id}`,
        })
      }
      toast({ description: `Solicitação ${status}.` })
    },
    [allTransferencias, getPatrimonioById, updatePatrimonio, addNotification],
  )

  return (
    <TransferContext.Provider
      value={{ transferencias, addTransferencia, updateTransferenciaStatus }}
    >
      {children}
    </TransferContext.Provider>
  )
}

export const useTransfers = () => {
  const context = useContext(TransferContext)
  if (!context) {
    throw new Error('useTransfers must be used within a TransferProvider')
  }
  return context
}
