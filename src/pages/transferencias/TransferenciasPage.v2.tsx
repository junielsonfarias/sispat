/**
 * ✅ VERSÃO 2.0.6: Usa React Query ao invés de TransferContext
 * 
 * ANTES (v2.0.5): TransferContext (localStorage)
 * DEPOIS (v2.0.6): use-transferencias (React Query + API)
 * 
 * BENEFÍCIOS:
 * - Dados persistentes no banco
 * - Cache automático
 * - Invalidação inteligente
 * - Loading/error states
 * - Optimistic updates
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  useTransferencias, 
  useAprovarTransferencia, 
  useRejeitarTransferencia 
} from '@/hooks/queries/use-transferencias'
import { useAuth } from '@/contexts/AuthContext'
import { FileText, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function TransferenciasPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'pendente' | 'aprovada' | 'rejeitada' | undefined>()

  // ✅ React Query: busca transferências
  const { data, isLoading, error } = useTransferencias(statusFilter)

  // ✅ React Query: mutations para aprovar/rejeitar
  const aprovarMutation = useAprovarTransferencia()
  const rejeitarMutation = useRejeitarTransferencia()

  // Verificar se user pode aprovar
  const podeAprovar = ['supervisor', 'admin', 'superuser'].includes(user?.role || '')

  const handleAprovar = (id: string) => {
    if (confirm('Deseja aprovar esta transferência?\n\nO patrimônio será movido para o setor destino automaticamente.')) {
      aprovarMutation.mutate({ id })
    }
  }

  const handleRejeitar = (id: string) => {
    const comentarios = prompt('Motivo da rejeição (opcional):')
    rejeitarMutation.mutate({ id, comentarios: comentarios || undefined })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pendente: { variant: 'warning', icon: Clock, label: 'Pendente' },
      aprovada: { variant: 'success', icon: CheckCircle, label: 'Aprovada' },
      rejeitada: { variant: 'destructive', icon: XCircle, label: 'Rejeitada' },
    }

    const config = variants[status] || variants.pendente
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-12 w-64" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao carregar transferências</CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const transferencias = data?.transferencias || []

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transferências</h1>
          <p className="text-muted-foreground">
            {transferencias.length} transferência(s) encontrada(s)
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === undefined ? 'default' : 'outline'}
            onClick={() => setStatusFilter(undefined)}
            size="sm"
          >
            Todas
          </Button>
          <Button
            variant={statusFilter === 'pendente' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pendente')}
            size="sm"
          >
            Pendentes
          </Button>
          <Button
            variant={statusFilter === 'aprovada' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('aprovada')}
            size="sm"
          >
            Aprovadas
          </Button>
          <Button
            variant={statusFilter === 'rejeitada' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('rejeitada')}
            size="sm"
          >
            Rejeitadas
          </Button>
        </div>
      </div>

      {/* Lista de Transferências */}
      {transferencias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma transferência encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transferencias.map((transferencia) => (
            <Card key={transferencia.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {transferencia.numero_patrimonio}
                      {getStatusBadge(transferencia.status)}
                    </CardTitle>
                    <CardDescription>{transferencia.descricao_bem}</CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(transferencia.dataTransferencia), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Movimento */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex-1">
                    <p className="font-semibold text-muted-foreground mb-1">Origem</p>
                    <p className="font-medium">{transferencia.setorOrigem}</p>
                    <p className="text-xs text-muted-foreground">{transferencia.localOrigem}</p>
                  </div>

                  <ArrowRight className="h-6 w-6 text-primary" />

                  <div className="flex-1">
                    <p className="font-semibold text-muted-foreground mb-1">Destino</p>
                    <p className="font-medium">{transferencia.setorDestino}</p>
                    <p className="text-xs text-muted-foreground">{transferencia.localDestino}</p>
                  </div>
                </div>

                {/* Motivo */}
                <div>
                  <p className="font-semibold text-sm text-muted-foreground mb-1">Motivo</p>
                  <p className="text-sm">{transferencia.motivo}</p>
                </div>

                {/* Responsáveis */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold">Solicitante:</span> {transferencia.responsavelOrigem}
                  </div>
                  {transferencia.responsavelDestino && (
                    <div>
                      <span className="font-semibold">Destinatário:</span> {transferencia.responsavelDestino}
                    </div>
                  )}
                </div>

                {/* Observações */}
                {transferencia.observacoes && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-semibold text-sm mb-1">Observações:</p>
                    <p className="text-sm">{transferencia.observacoes}</p>
                  </div>
                )}

                {/* Ações (apenas para pendentes e se user pode aprovar) */}
                {transferencia.status === 'pendente' && podeAprovar && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      onClick={() => handleAprovar(transferencia.id)}
                      disabled={aprovarMutation.isPending}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => handleRejeitar(transferencia.id)}
                      disabled={rejeitarMutation.isPending}
                      className="flex-1"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                )}
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
 * ANTES (v2.0.5 com TransferContext):
 * ❌ const { transferencias } = useTransfer()
 * ❌ const updateStatus = (id, status) => { ... localStorage ... }
 * ❌ Dados se perdem ao limpar cache
 * ❌ Não atualiza patrimônio.sectorId
 * ❌ Sem histórico rastreado
 * 
 * DEPOIS (v2.0.6 com React Query):
 * ✅ const { data, isLoading } = useTransferencias('pendente')
 * ✅ const aprovarMutation = useAprovarTransferencia()
 * ✅ aprovarMutation.mutate({ id })
 * ✅ Dados persistentes no banco
 * ✅ Atualiza patrimônio automaticamente (backend)
 * ✅ Histórico completo
 * ✅ Cache automático
 * ✅ Loading/error states
 * ✅ Optimistic updates
 */

