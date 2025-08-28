import { CameraCapture } from '@/components/bens/CameraCapture'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import { uploadFileToCloud } from '@/lib/cloud-storage'
import { dataURLtoFile, generateId, getCloudImageUrl } from '@/lib/utils'
import { Camera, FileImage, UploadCloud, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Control, useController } from 'react-hook-form'

interface ImageUploadProps {
  name: string
  control: Control<any>
  maxFiles?: number
}

interface UploadingFile {
  id: string
  file: File
  progress: number
}

export const ImageUpload = ({
  name,
  control,
  maxFiles = 5,
}: ImageUploadProps) => {
  const {
    field: { value: fileIds = [], onChange },
  } = useController({ name, control })

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isCameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return

      if ((fileIds?.length || 0) + files.length > maxFiles) {
        toast({
          variant: 'destructive',
          title: 'Limite de arquivos excedido',
          description: `Você pode enviar no máximo ${maxFiles} ${name === "documentos" ? "documentos" : "fotos"}.`,
        })
        return
      }

      const newUploads: UploadingFile[] = files.map((file) => ({
        id: generateId(),
        file,
        progress: 0,
      }))

      setUploadingFiles((prev) => [...prev, ...newUploads])

      for (const upload of newUploads) {
        try {
          const fileId = await uploadFileToCloud(upload.file, (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === upload.id ? { ...f, progress } : f)),
            )
          })
          onChange([...(fileIds || []), fileId])
        } catch (_error) {
          toast({
            variant: 'destructive',
            title: 'Falha no Upload',
            description: `Não foi possível enviar o arquivo ${upload.file.name}.`,
          })
        } finally {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== upload.id))
        }
      }
    },
    [fileIds, maxFiles, onChange, name],
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    processFiles(files)
  }

  const handleCapture = (dataUrl: string) => {
    const file = dataURLtoFile(dataUrl, `capture-${Date.now()}.jpg`)
    processFiles([file])
  }

  const handleRemoveImage = (idToRemove: string) => {
    onChange((fileIds || []).filter((id: string) => id !== idToRemove))
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
          {name === "documentos" ? "Anexar Documento" : "Anexar Foto"}
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
          accept={name === "documentos" ? ".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" : "image/*"}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {(fileIds?.length > 0 || uploadingFiles.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {fileIds?.map((id: string) => {
            const isImage = id.startsWith('data:image/') || id.includes('image')
            return (
              <div key={id} className="relative group aspect-square">
                {isImage ? (
                  <img
                    src={getCloudImageUrl(id)}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-md flex flex-col items-center justify-center">
                    <FileImage className="h-8 w-8 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Documento</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
          {uploadingFiles.map((upload) => (
            <div
              key={upload.id}
              className="relative aspect-square flex flex-col items-center justify-center bg-muted rounded-md p-2"
            >
              <FileImage className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs truncate w-full text-center mt-1">
                {upload.file.name}
              </p>
              <Progress value={upload.progress} className="w-full mt-2 h-2" />
            </div>
          ))}
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
