import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'
import { uploadMultipleFiles } from '@/services/fileService'
import { useAuth } from '@/hooks/useAuth'
import { Patrimonio } from '@/types'
import { AlertCircle, FileText, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'
import { extractApiError } from '@/lib/api-error'

const baixaBemSchema = z.object({
  data_baixa: z.string().min(1, 'Data da baixa é obrigatória'),
  motivo_baixa: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
  observacoes: z.string().optional(),
  documentos_baixa: z.any().optional(),
})

type BaixaBemValues = z.infer<typeof baixaBemSchema>

interface BaixaBemModalProps {
  isOpen: boolean
  onClose: () => void
  patrimonio: Patrimonio
  onSuccess?: () => void
}

export const BaixaBemModal = ({
  isOpen,
  onClose,
  patrimonio,
  onSuccess,
}: BaixaBemModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const { user } = useAuth()

  const form = useForm<BaixaBemValues>({
    resolver: zodResolver(baixaBemSchema),
    defaultValues: {
      data_baixa: new Date().toISOString().split('T')[0],
      motivo_baixa: '',
      observacoes: '',
    },
  })

  // Art. 25/26: baixa por extravio/furto/roubo exige Boletim de Ocorrência ou
  // comunicação anexada (espelha a trava do backend). Detecta por palavra-chave.
  const motivoWatch = form.watch('motivo_baixa') ?? ''
  const requerBoletim = /extravi|furto|roubo|desaparec|sumic|subtra/i.test(
    motivoWatch.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setSelectedFiles(Array.from(files))
      if (files.length > 0) form.clearErrors('documentos_baixa')
    }
  }

  const handleSubmit = async (data: BaixaBemValues) => {
    // Art. 25/26: extravio/furto/roubo exige documento comprobatório (BO).
    if (requerBoletim && selectedFiles.length === 0) {
      form.setError('documentos_baixa', {
        type: 'manual',
        message:
          'Baixa por extravio/furto/roubo exige Boletim de Ocorrência ou comunicação anexada (Art. 25/26).',
      })
      return
    }
    setIsSubmitting(true)

    try {
      logger.debug('Registrando baixa', { data, filesCount: selectedFiles.length })

      // 1) Faz upload dos arquivos comprobatórios (se houver), recebe URLs reais
      let documentos_baixa: string[] = []
      if (selectedFiles.length > 0) {
        const uploadResult = await uploadMultipleFiles(
          selectedFiles,
          patrimonio.id,
          user?.id ?? '',
        )
        // Backend retorna { files: [{ file_url, ... }] }
        const files = (uploadResult?.files ?? []) as Array<{ file_url?: string }>
        documentos_baixa = files
          .map((f) => f.file_url)
          .filter((u): u is string => Boolean(u))

        if (documentos_baixa.length !== selectedFiles.length) {
          logger.warn('Alguns arquivos falharam no upload', {
            esperado: selectedFiles.length,
            recebido: documentos_baixa.length,
          })
        }
      }

      // 2) Registra a baixa com as URLs dos documentos já persistidos
      const baixaData = {
        data_baixa: data.data_baixa,
        motivo_baixa: data.motivo_baixa,
        observacoes: data.observacoes,
        documentos_baixa,
      }

      const response = await api.post(`/patrimonios/${patrimonio.id}/baixa`, baixaData)

      logger.debug('Baixa registrada', { response })

      toast({
        title: 'Sucesso!',
        description: 'Baixa do bem registrada com sucesso.',
      })

      // Fechar modal e atualizar
      handleClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      logger.error('❌ Erro ao registrar baixa:', error)

      const errorMessage = extractApiError(error).message || 'Erro ao registrar baixa do bem'
      
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedFiles([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Registrar Baixa de Bem
          </DialogTitle>
          <DialogDescription>
            Patrimônio: <strong>{patrimonio.numero_patrimonio}</strong> - {patrimonio.descricao_bem}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Atenção: Esta ação irá marcar o bem como <strong>baixado</strong> e não poderá ser revertida facilmente.
            Certifique-se de preencher todos os dados corretamente.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="data_baixa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Baixa *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivo_baixa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Baixa *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da baixa (ex: quebra, obsolescência, perda, doação, etc.)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Mínimo de 10 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Adicionais</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações complementares sobre a baixa (opcional)"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>
                Documentos Comprobatórios
                {requerBoletim && <span className="text-destructive"> *</span>}
              </FormLabel>
              {requerBoletim && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Baixa por extravio/furto/roubo exige Boletim de Ocorrência ou comunicação
                    formal anexada (Art. 25/26).
                  </AlertDescription>
                </Alert>
              )}
              <FormControl>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <FileText className="inline h-4 w-4 mr-1" />
                      {selectedFiles.length} arquivo(s) selecionado(s)
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                {requerBoletim
                  ? 'Anexe o Boletim de Ocorrência ou comunicação formal (obrigatório).'
                  : 'Anexe documentos que comprovem a baixa (opcional).'}
              </FormDescription>
              {form.formState.errors.documentos_baixa && (
                <p className="text-sm font-medium text-destructive">
                  {String(form.formState.errors.documentos_baixa.message)}
                </p>
              )}
            </FormItem>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar Baixa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
