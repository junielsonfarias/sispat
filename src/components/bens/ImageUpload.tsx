import { useState, useCallback, useRef } from 'react'
import { useController, Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { UploadCloud, X, Camera } from 'lucide-react'
import { dataURLtoFile } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { CameraCapture } from '@/components/bens/CameraCapture'
import { uploadFile, deleteFile } from '@/services/fileService'
import { useAuth } from '@/contexts/AuthContext'

interface ImageUploadProps {
  name: string
  control: Control<any>
  assetId: string
  maxFiles?: number
}

export const ImageUpload = ({
  name,
  control,
  assetId,
  maxFiles = 5,
}: ImageUploadProps) => {
  const { user } = useAuth()
  const {
    field: { value: files = [], onChange },
  } = useController({ name, control })

  const [isCameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (filesToUpload: File[]) => {
      if (filesToUpload.length === 0 || !user) return

      console.log('📸 ImageUpload - processFiles chamado:', {
        filesToUpload: filesToUpload.length,
        filesAtuais: files?.length || 0,
        maxFiles,
      })

      if ((files?.length || 0) + filesToUpload.length > maxFiles) {
        toast({
          variant: 'destructive',
          title: 'Limite de arquivos excedido',
          description: `Você pode enviar no máximo ${maxFiles} fotos.`,
        })
        return
      }

      for (const file of filesToUpload) {
        try {
          console.log('⬆️ ImageUpload - Fazendo upload:', file.name)
          const newFile = await uploadFile(file, assetId, user.id)
          console.log('✅ ImageUpload - Upload concluído:', newFile)
          console.log('📦 ImageUpload - Files antes de adicionar:', files)
          
          // ✅ CORREÇÃO: Adicionar o objeto completo (com id, file_url, file_name)
          const fileMetadata = {
            id: newFile.id,
            file_url: newFile.file_url,
            file_name: newFile.file_name,
          }
          
          const updatedFiles = [...(files || []), fileMetadata]
          console.log('📦 ImageUpload - Files após adicionar (objetos completos):', updatedFiles)
          onChange(updatedFiles)
        } catch (error) {
          console.error('❌ ImageUpload - Erro no upload:', error)
          toast({
            variant: 'destructive',
            title: 'Falha no Upload',
            description: `Não foi possível enviar o arquivo ${file.name}.`,
          })
        }
      }
    },
    [files, maxFiles, onChange, assetId, user],
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    processFiles(files)
  }

  const handleCapture = (dataUrl: string) => {
    const file = dataURLtoFile(dataUrl, `capture-${Date.now()}.jpg`)
    processFiles([file])
  }

  const handleRemoveImage = async (fileToRemove: { id: string }) => {
    try {
      await deleteFile(fileToRemove.id, fileToRemove.file_url)
      onChange((files || []).filter((f: { id: string }) => f.id !== fileToRemove.id))
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o arquivo.',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          Anexar Foto
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setCameraOpen(true)}
        >
          <Camera className="mr-2 h-4 w-4" />
          Capturar Foto
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {files && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file: string | { id: string; file_url: string; file_name: string }, index: number) => {
            // ✅ Suportar tanto strings (URLs) quanto objetos
            const fileUrl = typeof file === 'string' ? file : file.file_url
            const fileId = typeof file === 'string' ? `photo-${index}` : file.id
            const fileName = typeof file === 'string' ? `Foto ${index + 1}` : file.file_name
            
            return (
              <div key={`${fileId}-${index}`} className="relative group aspect-square">
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="w-full h-full object-cover rounded-md"
                  onError={(e) => {
                    console.error('❌ Erro ao carregar imagem:', fileUrl)
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESem Imagem%3C/text%3E%3C/svg%3E'
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(typeof file === 'string' ? { id: fileId, file_url: fileUrl, file_name: fileName } : file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
      <CameraCapture
        open={isCameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCapture}
      />
    </div>
  )
}
