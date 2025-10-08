import { useState, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useVersion } from '@/contexts/VersionContext'
import {
  GitBranch,
  CheckCircle,
  ArrowUpCircle,
  Loader2,
  History,
} from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
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
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

export const VersionChecker = () => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const {
    currentVersion,
    availableVersions,
    latestVersion,
    isLatestVersion,
    isUpdating,
    updateToLatest,
    rollbackToVersion,
  } = useVersion()

  const previousVersions = useMemo(() => {
    const currentIndex = availableVersions.findIndex(
      (v) => v.version === currentVersion,
    )
    return currentIndex > -1 ? availableVersions.slice(currentIndex + 1) : []
  }, [availableVersions, currentVersion])

  if (!user || (user.role !== 'superuser' && user.role !== 'admin')) {
    return null
  }

  return (
    <>
      <div className="absolute bottom-4 right-4 z-50 no-print">
        <Button
          onClick={() => setIsOpen(true)}
          variant={isLatestVersion ? 'secondary' : 'default'}
          className="rounded-full shadow-lg"
        >
          <GitBranch className="mr-2 h-4 w-4" />v{currentVersion}
          {!isLatestVersion && (
            <span className="ml-2 h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
          )}
        </Button>
      </div>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Gerenciador de Versão</SheetTitle>
            <SheetDescription>
              Verifique a versão atual, atualize ou reverta para uma versão
              anterior.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow pr-4 -mr-4 my-4">
            <div className="space-y-6">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Versão Atual</p>
                <p className="text-2xl font-bold">v{currentVersion}</p>
                {isLatestVersion ? (
                  <div className="flex items-center text-sm text-green-600 mt-1">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>Você está na versão mais recente.</span>
                  </div>
                ) : (
                  <div className="text-sm text-blue-600 mt-1">
                    <span>
                      Uma nova versão (v{latestVersion?.version}) está
                      disponível.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Histórico de Versões
                </h3>
                <div className="space-y-4">
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
                    </div>
                  ))}
                </div>
              </div>

              {previousVersions.length > 0 && (
                <div>
                  <Separator className="my-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Reverter Versão
                  </h3>
                  <div className="space-y-2">
                    {previousVersions.map((v) => (
                      <div
                        key={v.version}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div>
                          <p className="font-semibold">Versão {v.version}</p>
                          <p className="text-xs text-muted-foreground">
                            Lançada{' '}
                            {formatRelativeDate(new Date(v.releaseDate))}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isUpdating}
                            >
                              <History className="mr-2 h-4 w-4" /> Reverter
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Reverter para v{v.version}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá recarregar a aplicação.
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <SheetFooter>
            <Button
              className="w-full"
              onClick={updateToLatest}
              disabled={isLatestVersion || isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="mr-2 h-4 w-4" />
              )}
              {isUpdating
                ? 'Processando...'
                : isLatestVersion
                  ? 'Versão mais recente instalada'
                  : `Atualizar para v${latestVersion?.version}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
