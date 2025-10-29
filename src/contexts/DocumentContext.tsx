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
import { api } from '@/lib/api'

interface DocumentContextType {
  documents: GeneralDocument[]
  isLoading: boolean
  addDocument: (file: File, metadata: {
    titulo: string
    descricao?: string
    tipo: string
    categoria?: string
    tags?: string[]
    isPublic?: boolean
  }) => Promise<void>
  updateDocument: (id: string, metadata: {
    titulo?: string
    descricao?: string
    tipo?: string
    categoria?: string
    tags?: string[]
    isPublic?: boolean
  }) => Promise<void>
  deleteDocument: (documentId: string) => Promise<void>
  fetchDocuments: () => Promise<void>
  downloadDocument: (id: string) => Promise<void>
}

const DocumentContext = createContext<DocumentContextType | null>(null)

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [allDocuments, setAllDocuments] = useState<GeneralDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const { addNotification } = useNotifications()

  // Buscar documentos da API
  const fetchDocuments = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const response = await api.get('/documents')
      const documents = response.documents || response
      
      setAllDocuments(
        documents.map((d: any) => ({
          ...d,
          uploadedAt: new Date(d.createdAt),
        }))
      )
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar documentos.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const documents = useMemo(() => {
    // Sistema single-municipality, retornar todos os documentos
    return allDocuments
  }, [allDocuments])

  const addDocument = useCallback(
    async (file: File, metadata: {
      titulo: string
      descricao?: string
      tipo: string
      categoria?: string
      tags?: string[]
      isPublic?: boolean
    }) => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('titulo', metadata.titulo)
        formData.append('descricao', metadata.descricao || '')
        formData.append('tipo', metadata.tipo)
        formData.append('categoria', metadata.categoria || '')
        formData.append('tags', metadata.tags?.join(',') || '')
        formData.append('isPublic', metadata.isPublic?.toString() || 'false')

        const response = await api.post('/documents', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        const newDocument: GeneralDocument = {
          ...response,
          uploadedAt: new Date(response.createdAt),
        }

        setAllDocuments(prev => [...prev, newDocument])

        addNotification({
          tipo: 'info',
          titulo: 'Documento Adicionado',
          mensagem: `Documento "${metadata.titulo}" foi adicionado com sucesso.`,
          link: `/documentos/${newDocument.id}`,
        })

        toast({
          title: 'Sucesso',
          description: 'Documento adicionado com sucesso.',
        })
      } catch (error) {
        console.error('Erro ao adicionar documento:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao adicionar documento.',
        })
        throw error
      }
    },
    [addNotification]
  )

  const updateDocument = useCallback(
    async (id: string, metadata: {
      titulo?: string
      descricao?: string
      tipo?: string
      categoria?: string
      tags?: string[]
      isPublic?: boolean
    }) => {
      try {
        const response = await api.put(`/documents/${id}`, {
          titulo: metadata.titulo,
          descricao: metadata.descricao,
          tipo: metadata.tipo,
          categoria: metadata.categoria,
          tags: metadata.tags?.join(','),
          isPublic: metadata.isPublic,
        })

        setAllDocuments(prev =>
          prev.map(d =>
            d.id === id
              ? {
                  ...d,
                  ...response,
                  uploadedAt: new Date(response.updatedAt),
                }
              : d,
          ),
        )

        toast({
          title: 'Sucesso',
          description: 'Documento atualizado com sucesso.',
        })
      } catch (error) {
        console.error('Erro ao atualizar documento:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar documento.',
        })
        throw error
      }
    },
    []
  )

  const deleteDocument = useCallback(
    async (documentId: string) => {
      try {
        await api.delete(`/documents/${documentId}`)
        
        setAllDocuments(prev => prev.filter(d => d.id !== documentId))

        addNotification({
          tipo: 'warning',
          titulo: 'Documento Removido',
          mensagem: 'Documento foi removido com sucesso.',
        })

        toast({
          title: 'Sucesso',
          description: 'Documento removido com sucesso.',
        })
      } catch (error) {
        console.error('Erro ao deletar documento:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao remover documento.',
        })
        throw error
      }
    },
    [addNotification]
  )

  const downloadDocument = useCallback(
    async (id: string) => {
      try {
        const response = await api.get(`/documents/${id}/download`, {
          responseType: 'blob',
        })

        // Criar URL para download
        const url = window.URL.createObjectURL(new Blob([response]))
        const link = document.createElement('a')
        link.href = url
        
        // Buscar nome do arquivo do documento
        const document = allDocuments.find(d => d.id === id)
        const fileName = document?.fileName || 'documento'
        
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        toast({
          title: 'Sucesso',
          description: 'Download iniciado com sucesso.',
        })
      } catch (error) {
        console.error('Erro ao fazer download do documento:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao fazer download do documento.',
        })
        throw error
      }
    },
    [allDocuments]
  )

  const value: DocumentContextType = {
    documents,
    isLoading,
    addDocument,
    updateDocument,
    deleteDocument,
    fetchDocuments,
    downloadDocument,
  }

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  )
}

export const useDocument = () => {
  const context = useContext(DocumentContext)
  if (!context) {
    throw new Error('useDocument deve ser usado dentro de um DocumentProvider')
  }
  return context
}

// Alias para compatibilidade
export const useDocuments = useDocument
