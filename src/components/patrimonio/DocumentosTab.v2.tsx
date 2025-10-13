/**
 * ✅ VERSÃO 2.0.6: Usa React Query ao invés de DocumentContext
 * 
 * ANTES (v2.0.5): DocumentContext (localStorage)
 * DEPOIS (v2.0.6): use-documentos (React Query + API)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  useDocumentos, 
  useCreateDocumento, 
  useDeleteDocumento 
} from '@/hooks/queries/use-documentos'
import { FileText, Download, Trash2, Upload, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DocumentosTabProps {
  patrimonioId: string
}

export default function DocumentosTab({ patrimonioId }: DocumentosTabProps) {
  const [isUploading, setIsUploading] = useState(false)

  // ✅ React Query: busca documentos
  const { data, isLoading, error } = useDocumentos(patrimonioId)

  // ✅ React Query: mutations
  const createMutation = useCreateDocumento()
  const deleteMutation = useDeleteDocumento()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      // 1. Upload do arquivo
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sispat_token')}`
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Erro ao fazer upload do arquivo')
      }

      const uploadData = await uploadResponse.json()

      // 2. Criar registro do documento
      createMutation.mutate({
        patrimonioId,
        name: file.name,
        type: file.type,
        url: uploadData.url,
        fileSize: file.size,
        description: `Upload realizado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
      })

    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload do arquivo')
    } finally {
      setIsUploading(false)
      event.target.value = '' // Reset input
    }
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir o documento "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('image')) return '🖼️'
    if (type.includes('word')) return '📝'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
    return '📎'
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-destructive">Erro ao carregar documentos</p>
        </CardContent>
      </Card>
    )
  }

  const documentos = data?.documentos || []

  return (
    <div className="space-y-4">
      {/* Header com botão de upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Documentos ({documentos.length})</span>
            <label>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading || createMutation.isPending}
              />
              <Button
                as="span"
                disabled={isUploading || createMutation.isPending}
                className="cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Fazendo upload...' : 'Adicionar Documento'}
              </Button>
            </label>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Lista de Documentos */}
      {documentos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum documento anexado</p>
            <p className="text-sm mt-2">Clique em "Adicionar Documento" para fazer upload</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Ícone */}
                  <div className="text-4xl">
                    {getFileIcon(doc.type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(doc.uploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {doc.uploader && (
                        <>
                          <span>•</span>
                          <span>{doc.uploader.name}</span>
                        </>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc.url, doc.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(doc.id, doc.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * COMPARAÇÃO:
 * 
 * ANTES (v2.0.5 com DocumentContext):
 * ❌ const { documents } = useDocuments()
 * ❌ const addDocument = (doc) => { ... localStorage ... }
 * ❌ Dados se perdem
 * ❌ Sem rastreamento de uploader
 * ❌ Arquivos órfãos
 * 
 * DEPOIS (v2.0.6 com React Query):
 * ✅ const { data, isLoading } = useDocumentos(patrimonioId)
 * ✅ const createMutation = useCreateDocumento()
 * ✅ createMutation.mutate({ ... })
 * ✅ Dados persistentes
 * ✅ Rastreamento completo (uploader, data, tamanho)
 * ✅ Sem arquivos órfãos
 * ✅ Cache automático
 * ✅ Loading/error states
 */

