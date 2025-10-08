import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useVersion } from '@/contexts/VersionContext'
import {
  GitBranch,
  CheckCircle,
  ArrowUpCircle,
  Loader2,
  History,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatRelativeDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const VersionUpdate = () => {
  const {
    currentVersion,
    availableVersions,
    latestVersion,
    isLatestVersion,
    isUpdating,
    updateToLatest,
    rollbackHistory,
    rollbackToVersion,
  } = useVersion()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Atualização de Versão</h1>
      <Card>
        <CardHeader>
          <CardTitle>Status da Versão</CardTitle>
          <CardDescription>
            Verifique a versão atual do sistema e atualize se necessário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Versão Atual</p>
                <p className="font-semibold">v{currentVersion}</p>
              </div>
            </div>
            <Button
              onClick={updateToLatest}
              disabled={isLatestVersion || isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="mr-2 h-4 w-4" />
              )}
              {isUpdating
                ? 'Atualizando...'
                : isLatestVersion
                  ? 'Versão mais recente'
                  : `Atualizar para v${latestVersion?.version}`}
            </Button>
          </div>
          {isLatestVersion ? (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                Sistema Atualizado
              </AlertTitle>
              <AlertDescription className="text-green-700">
                Você está utilizando a versão mais recente do SISPAT.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <ArrowUpCircle className="h-4 w-4" />
              <AlertTitle>Nova Versão Disponível</AlertTitle>
              <AlertDescription>
                A versão {latestVersion?.version} está disponível. Clique no
                botão acima para atualizar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Versões</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-6">
                {availableVersions.map((v) => (
                  <div key={v.version} className="relative pl-8">
                    <div className="absolute left-0 top-1 h-6 w-6 bg-muted rounded-full flex items-center justify-center">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Versão {v.version}</p>
                      {v.version === latestVersion?.version && (
                        <Badge>Mais Recente</Badge>
                      )}
                      {v.version === currentVersion && (
                        <Badge variant="secondary">Atual</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(new Date(v.releaseDate))}
                    </p>
                    <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {v.changelog.map((change, index) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                    {v.version < currentVersion && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mt-2"
                            disabled={isUpdating}
                          >
                            <History className="mr-2 h-4 w-4" /> Reverter para
                            esta versão
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Reverter para v{v.version}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá recarregar a aplicação e pode levar
                              alguns instantes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => rollbackToVersion(v.version)}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Log de Reversões (Rollbacks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {rollbackHistory.length > 0 ? (
                <ul className="space-y-4">
                  {rollbackHistory.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3">
                      <div>
                        <Badge
                          variant={
                            entry.status === 'success'
                              ? 'default'
                              : 'destructive'
                          }
                          className="capitalize"
                        >
                          {entry.status === 'success' ? 'Sucesso' : 'Falha'}
                        </Badge>
                      </div>
                      <div className="flex-1 text-sm">
                        <p>
                          Reversão de <strong>v{entry.fromVersion}</strong> para{' '}
                          <strong>v{entry.toVersion}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(new Date(entry.timestamp))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma reversão de versão foi realizada.
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default VersionUpdate
