import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { GeneralDocument } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { useNotifications } from './NotificationContext'

interface DocumentContextType {
  documents: GeneralDocument[]
  addDocument: (file: File, user: { id: string; name: string }) => Promise<void>
  deleteDocument: (documentId: string) => void
}

const DocumentContext = createContext<DocumentContextType | null>(null)

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [allDocuments, setAllDocuments] = useState<GeneralDocument[]>([])
  const { user, users } = useAuth()
  const { addNotification } = useNotifications()

  useEffect(() => {
    const stored = localStorage.getItem('sispat_general_documents')
    if (stored) {
      setAllDocuments(
        JSON.parse(stored).map((d: any) => ({
          ...d,
          uploadedAt: new Date(d.uploadedAt),
        })),
      )
    }
  }, [])

  const documents = useMemo(() => {
    // Agora todos os documentos são visíveis para todos os usuários
    // pois temos apenas um município
    return allDocuments
  }, [allDocuments])

  const persist = (newDocuments: GeneralDocument[]) => {
    localStorage.setItem(
      'sispat_general_documents',
      JSON.stringify(newDocuments),
    )
    setAllDocuments(newDocuments)
  }

  const addDocument = useCallback(
    async (file: File, uploadUser: { id: string; name: string }) => {
      if (!user?.municipalityId) return

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newDocument: GeneralDocument = {
        id: generateId(),
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date(),
        uploadedBy: uploadUser,
        municipalityId: user.municipalityId,
      }
      persist([...allDocuments, newDocument])

      const usersToNotify = users.filter(
        (u) =>
          u.municipalityId === user.municipalityId && u.id !== uploadUser.id,
      )

      usersToNotify.forEach((u) => {
        addNotification({
          userId: u.id,
          title: 'Novo Documento Disponível',
          description: `${uploadUser.name} adicionou o documento "${file.name}".`,
          type: 'document',
          link: '/ferramentas/documentos',
        })
      })

      toast({ description: 'Documento enviado com sucesso.' })
    },
    [allDocuments, user, users, addNotification],
  )

  const deleteDocument = useCallback(
    (documentId: string) => {
      persist(allDocuments.filter((d) => d.id !== documentId))
      toast({ description: 'Documento excluído com sucesso.' })
    },
    [allDocuments],
  )

  return (
    <DocumentContext.Provider
      value={{ documents, addDocument, deleteDocument }}
    >
      {children}
    </DocumentContext.Provider>
  )
}

export const useDocuments = () => {
  const context = useContext(DocumentContext)
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider')
  }
  return context
}
