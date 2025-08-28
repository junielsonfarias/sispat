import { toast } from '@/hooks/use-toast'
import { generateId } from '@/lib/utils'
import {
    HistoricoEntry,
    Transferencia,
    TransferenciaStatus
} from '@/types'
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useAuth } from './AuthContext'
import { useNotifications } from './NotificationContext'
import { usePatrimonio } from './PatrimonioContext'
import { useSectors } from './SectorContext'

interface TransferContextType {
  transferencias: Transferencia[]
  addTransferencia: (
    data: Omit<Transferencia, 'id' | 'dataSolicitacao' | 'status'>,
  ) => void
  createTransferencia: (formData: FormData) => Promise<void>
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
  const { sectors } = useSectors()

  useEffect(() => {
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
    if (user?.role === 'superuser') return allTransferencias
    if (user?.municipalityId) {
      return allTransferencias.filter(
        (t) => t.municipalityId === user.municipalityId,
      )
    }
    return []
  }, [allTransferencias, user])

  const persist = (newTransferencias: Transferencia[]) => {
    localStorage.setItem(
      'sispat_transferencias',
      JSON.stringify(newTransferencias),
    )
    setAllTransferencias(newTransferencias)
  }

  const addTransferencia = useCallback(
    async (data: Omit<Transferencia, 'id' | 'dataSolicitacao' | 'status'>) => {
      const newTransferencia: Transferencia = {
        ...data,
        id: generateId(),
        dataSolicitacao: new Date(),
        status: 'pendente',
      }
      persist([...allTransferencias, newTransferencia])
      const patrimonio = getPatrimonioById(data.patrimonioId)
      if (patrimonio) {
        await updatePatrimonio({ ...patrimonio, transferencia_pendente: true })
      }
      toast({ description: 'Solicitação de transferência enviada.' })
    },
    [allTransferencias, getPatrimonioById, updatePatrimonio],
  )

  const createTransferencia = useCallback(
    async (formData: FormData) => {
      const newTransferencia: Transferencia = {
        id: generateId(),
        dataSolicitacao: new Date(),
        status: 'pendente',
        solicitanteId: user?.id || '',
        solicitanteNome: user?.name || '',
        tipo: 'transferencia', // Default to transfer
        patrimonioId: formData.get('patrimonioId') || '',
        setorOrigem: formData.get('setorOrigem') || '',
        setorDestino: formData.get('setorDestino') || '',
        destinatarioExterno: formData.get('destinatarioExterno') || '',
        motivo: formData.get('motivo') || '',
        documentosAnexos: [], // Placeholder, will be populated later
        comentariosAprovador: '',
        aprovadorId: '',
        aprovadorNome: '',
        dataAprovacao: undefined,
        historico_movimentacao: [],
      }

      persist([...allTransferencias, newTransferencia])

      const patrimonio = getPatrimonioById(newTransferencia.patrimonioId)
      if (patrimonio) {
        await updatePatrimonio({
          ...patrimonio,
          transferencia_pendente: true,
          historico_movimentacao: [
            {
              date: new Date(),
              action: 'Transferência',
              details: `Transferência solicitada para o bem ${patrimonio.numero_patrimonio}. Motivo: ${newTransferencia.motivo}`,
              user: user?.name || '',
              origem: newTransferencia.setorOrigem,
              destino: newTransferencia.setorDestino || newTransferencia.destinatarioExterno,
              documentosAnexos: [],
            },
            ...patrimonio.historico_movimentacao,
          ],
        })

        addNotification({
          userId: newTransferencia.solicitanteId,
          title: 'Solicitação de Transferência',
          description: `Sua solicitação de transferência para o bem ${patrimonio.numero_patrimonio} foi enviada para análise.`,
          type: 'transfer',
          link: `/bens-cadastrados/ver/${patrimonio.id}`,
        })
      }
      toast({ description: 'Solicitação de transferência criada.' })
    },
    [allTransferencias, getPatrimonioById, updatePatrimonio, user, addNotification],
  )

  const updateTransferenciaStatus = useCallback(
    async (
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
          origem: transferencia.setorOrigem,
          destino:
            transferencia.setorDestino || transferencia.destinatarioExterno,
          documentosAnexos: transferencia.documentosAnexos,
        }

        if (status === 'aprovada') {
          if (transferencia.type === 'transferencia') {
            updates.setor_responsavel = transferencia.setorDestino!
          } else {
            updates.status = 'baixado'
            updates.doado = true
            updates.motivo_baixa = `Doado para ${transferencia.destinatarioExterno}. Motivo: ${transferencia.motivo}`
            updates.data_baixa = new Date()
          }
        }

        await updatePatrimonio({
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
      value={{ transferencias, addTransferencia, createTransferencia, updateTransferenciaStatus }}
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
