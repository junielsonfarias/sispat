import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSync } from '@/contexts/SyncContext'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Cloud,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const SyncClient = () => {
  const { isSyncing, startSync } = useSync()
  // Sincronização automática ainda não é persistida nem executada em background —
  // os controles abaixo ficam desabilitados. A sincronização manual é real.
  const [autoSync] = useState(false)
  const [syncInterval, setSyncInterval] = useState('30')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const handleManualSync = () => {
    startSync()
    setLastSync(new Date())
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Cliente de Sincronização</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cliente de Sincronização</h1>
        <Button asChild variant="outline">
          <Link to="/downloads">
            <Download className="mr-2 h-4 w-4" /> Baixar Cliente
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Status da Sincronização</CardTitle>
          <CardDescription>
            Monitore e gerencie a sincronização de dados com a nuvem.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Status da Conexão
              </CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manual</div>
              <p className="text-xs text-muted-foreground">
                Monitoramento em tempo real não disponível
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Última Sincronização
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastSync ? lastSync.toLocaleTimeString() : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastSync
                  ? lastSync.toLocaleDateString()
                  : 'Nunca sincronizado nesta sessão'}
              </p>
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter>
          <Button onClick={handleManualSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Sincronização automática indisponível</AlertTitle>
            <AlertDescription>
              A sincronização em segundo plano ainda não está implementada. Use
              "Sincronizar Agora" para sincronizar manualmente.
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between rounded-lg border p-4 opacity-60">
            <Label htmlFor="auto-sync" className="flex flex-col gap-1">
              <span>Sincronização Automática</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Sincroniza os dados automaticamente em segundo plano.
              </span>
            </Label>
            <Switch id="auto-sync" checked={autoSync} disabled />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="sync-interval" className="flex flex-col gap-1">
              <span>Intervalo de Sincronização</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Frequência com que os dados são sincronizados.
              </span>
            </Label>
            <Select
              value={syncInterval}
              onValueChange={setSyncInterval}
              disabled={!autoSync}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">A cada 15 minutos</SelectItem>
                <SelectItem value="30">A cada 30 minutos</SelectItem>
                <SelectItem value="60">A cada 1 hora</SelectItem>
                <SelectItem value="240">A cada 4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SyncClient
