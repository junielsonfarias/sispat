import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, MapPin, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'
import { useLocais } from '@/contexts/LocalContext'
import { Patrimonio, Local } from '@/types'
import { PATRIMONIOS_ALL_KEY } from '@/hooks/queries/use-all-patrimonios'

const PATRIMONIO_STATS_KEY = ['patrimonio-stats']

// Constante que espelha ALMOXARIFADO_LOCAL_NOME do backend.
const ALMOXARIFADO_NOME = 'Almoxarifado'

interface PatrimonioComSetor extends Patrimonio {
  /** Retornado pelo STATIC_INCLUDE da listagem (select: { id, name }). */
  sector?: { id: string; name: string; codigo?: string }
}

interface DistribuirDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** IDs dos patrimônios selecionados para distribuição. */
  selectedIds: string[]
  /** Patrimônios carregados na página (para derivar sectorId e nome do bem). */
  patrimoniosVisiveis: PatrimonioComSetor[]
  /** Callback após distribuição com sucesso. */
  onSuccess: () => void
}

interface DistribuirResponse {
  message: string
  total: number
}

export function DistribuirDialog({
  open,
  onOpenChange,
  selectedIds,
  patrimoniosVisiveis,
  onSuccess,
}: DistribuirDialogProps) {
  const queryClient = useQueryClient()
  const { locais } = useLocais()
  const [localId, setLocalId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Resetar seleção ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setLocalId('')
    }
  }, [open])

  // Bens selecionados (apenas os visíveis na página atual)
  const bensSelecionados = useMemo(
    () => patrimoniosVisiveis.filter((p) => selectedIds.includes(p.id)),
    [patrimoniosVisiveis, selectedIds],
  )

  // Verificar se todos os bens são do mesmo setor
  const setoresDistintos = useMemo(() => {
    const ids = new Set(
      bensSelecionados.map((p) => p.sector?.id ?? ''),
    )
    ids.delete('')
    return ids
  }, [bensSelecionados])

  const setorUnico = setoresDistintos.size === 1
    ? bensSelecionados.find((p) => p.sector?.id)?.sector ?? null
    : null

  const multiploSetores = setoresDistintos.size > 1

  // Locais do setor dos bens selecionados, excluindo o Almoxarifado
  const locaisDisponiveis = useMemo((): Local[] => {
    if (!setorUnico) return []
    return locais.filter(
      (l) =>
        l.sectorId === setorUnico.id &&
        l.name.trim().toLowerCase() !== ALMOXARIFADO_NOME.toLowerCase(),
    )
  }, [locais, setorUnico])

  const podeContinuar = !multiploSetores && selectedIds.length > 0

  async function handleConfirmar() {
    if (!localId) {
      toast({
        variant: 'destructive',
        title: 'Local obrigatório',
        description: 'Selecione o local de destino antes de confirmar.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.post<DistribuirResponse>('/patrimonios/distribuir', {
        ids: selectedIds,
        localId,
      })

      const total = response?.total ?? selectedIds.length
      const msg = response?.message ?? `${total} bem(ns) distribuído(s) com sucesso.`

      toast({
        title: 'Distribuição concluída',
        description: msg,
      })

      // Invalidar caches React Query para telas sob demanda refletirem a distribuição
      void queryClient.invalidateQueries({ queryKey: PATRIMONIOS_ALL_KEY })
      void queryClient.invalidateQueries({ queryKey: PATRIMONIO_STATS_KEY })

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível distribuir os bens. Tente novamente.'
      toast({
        variant: 'destructive',
        title: 'Erro na distribuição',
        description: errorMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Distribuir bens
          </DialogTitle>
          <DialogDescription>
            {selectedIds.length === 1
              ? 'Selecione o local de destino para o bem selecionado.'
              : `Selecione o local de destino para os ${selectedIds.length} bens selecionados.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Aviso de múltiplos setores */}
          {multiploSetores && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Os bens selecionados pertencem a setores diferentes. A distribuição
                deve ser feita setor a setor — selecione apenas bens de um mesmo setor.
              </AlertDescription>
            </Alert>
          )}

          {/* Resumo dos bens */}
          {!multiploSetores && setorUnico && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
              <p className="font-medium text-blue-900">
                {selectedIds.length} bem{selectedIds.length !== 1 ? 'ns' : ''} do setor{' '}
                <span className="font-semibold">{setorUnico.name}</span>
              </p>
              <p className="text-blue-700 mt-1 text-xs">
                Todos serão movidos do Almoxarifado para o local selecionado abaixo.
              </p>
            </div>
          )}

          {/* Seleção de local */}
          {podeContinuar && (
            <div className="space-y-2">
              <Label htmlFor="local-destino-select">Local de destino</Label>
              {locaisDisponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum local disponível para este setor. Cadastre locais em{' '}
                  <span className="font-medium">Configurações &gt; Locais</span>.
                </p>
              ) : (
                <Select
                  value={localId}
                  onValueChange={setLocalId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="local-destino-select" aria-label="Selecionar local de destino">
                    <SelectValue placeholder="Selecione o local..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locaisDisponiveis.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={
              isSubmitting ||
              !localId ||
              !podeContinuar ||
              locaisDisponiveis.length === 0
            }
            aria-label="Confirmar distribuição dos bens selecionados"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Distribuindo...
              </>
            ) : (
              'Confirmar distribuição'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
