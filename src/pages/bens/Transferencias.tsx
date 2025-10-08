import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTransfers } from '@/contexts/TransferContext'
import { Transferencia, TransferenciaStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const Transferencias = () => {
  const { transferencias, updateTransferenciaStatus } = useTransfers()
  const { user } = useAuth()

  const filteredTransfers = (status: TransferenciaStatus) =>
    transferencias.filter((t) => t.status === status)

  const handleUpdateStatus = (id: string, status: 'aprovada' | 'rejeitada') => {
    if (!user) return
    updateTransferenciaStatus(id, status, { id: user.id, name: user.name })
  }

  const statusConfig: Record<
    TransferenciaStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' }
  > = {
    pendente: { label: 'Pendente', variant: 'secondary' },
    aprovada: { label: 'Aprovada', variant: 'default' },
    rejeitada: { label: 'Rejeitada', variant: 'destructive' },
  }

  const renderTable = (data: Transferencia[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patrimônio</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Destino</TableHead>
          <TableHead>Solicitante</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <Link
                to={`/bens-cadastrados/ver/${t.patrimonioId}`}
                className="text-primary hover:underline"
              >
                {t.patrimonioNumero}
              </Link>
            </TableCell>
            <TableCell className="capitalize">{t.type}</TableCell>
            <TableCell>{t.setorOrigem}</TableCell>
            <TableCell>{t.setorDestino || t.destinatarioExterno}</TableCell>
            <TableCell>{t.solicitanteNome}</TableCell>
            <TableCell>{formatDate(t.dataSolicitacao)}</TableCell>
            <TableCell>
              <Badge variant={statusConfig[t.status].variant}>
                {statusConfig[t.status].label}
              </Badge>
            </TableCell>
            <TableCell>
              {t.status === 'pendente' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(t.id, 'aprovada')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleUpdateStatus(t.id, 'rejeitada')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Fluxo de Transferência de Bens</h1>
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Transferência e Doação</CardTitle>
          <CardDescription>
            Aprove ou rejeite as solicitações de movimentação de bens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendente">
            <TabsList>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
              <TabsTrigger value="rejeitada">Rejeitadas</TabsTrigger>
            </TabsList>
            <TabsContent value="pendente">
              {renderTable(filteredTransfers('pendente'))}
            </TabsContent>
            <TabsContent value="aprovada">
              {renderTable(filteredTransfers('aprovada'))}
            </TabsContent>
            <TabsContent value="rejeitada">
              {renderTable(filteredTransfers('rejeitada'))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Transferencias
