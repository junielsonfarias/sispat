import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Patrimonio, TransferenciaType } from '@/types'
import { useSectors } from '@/contexts/SectorContext'
import { useAuth } from '@/hooks/useAuth'
import { useTransfers } from '@/contexts/TransferContext'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { ImageUpload } from './ImageUpload'
import { Label } from '../ui/label'

interface AssetTransferFormProps {
  asset: Patrimonio
  type: TransferenciaType
  onSuccess: () => void
}

export const AssetTransferForm = ({
  asset,
  type,
  onSuccess,
}: AssetTransferFormProps) => {
  const { sectors } = useSectors()
  const { user } = useAuth()
  const { addTransferencia } = useTransfers()

  const transferSchema = z.object({
    setorDestino:
      type === 'transferencia'
        ? z.string().min(1, 'O setor de destino é obrigatório.')
        : z.string().optional(),
    destinatarioExterno:
      type === 'doacao'
        ? z.string().min(1, 'O destinatário é obrigatório.')
        : z.string().optional(),
    motivo: z.string().min(1, 'O motivo é obrigatório.'),
    documentosAnexos: z.array(z.string()).optional(),
  })

  type TransferFormValues = z.infer<typeof transferSchema>

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  })

  const sectorOptions: SearchableSelectOption[] = sectors
    .filter((s) => s.name !== asset.setor_responsavel)
    .map((s) => ({ value: s.name, label: s.name }))

  const onSubmit = (data: TransferFormValues) => {
    if (!user || !user.municipalityId) return
    addTransferencia({
      ...data,
      patrimonioId: asset.id,
      patrimonioNumero: asset.numero_patrimonio,
      patrimonioDescricao: asset.descricao_bem,
      type,
      setorOrigem: asset.setor_responsavel,
      solicitanteId: user.id,
      solicitanteNome: user.name,
      municipalityId: user.municipalityId,
    })
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {type === 'transferencia' ? (
          <FormField
            control={form.control}
            name="setorDestino"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor de Destino</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={sectorOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Selecione o setor..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="destinatarioExterno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destinatário da Doação</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da entidade ou pessoa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo / Justificativa</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <Label>Documentos Anexos</Label>
          <ImageUpload name="documentosAnexos" control={form.control} />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Solicitar</Button>
        </div>
      </form>
    </Form>
  )
}
