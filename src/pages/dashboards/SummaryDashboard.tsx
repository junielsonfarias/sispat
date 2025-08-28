import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  PlusCircle,
  RefreshCw,
  Loader2,
  GitBranch,
  CheckCircle,
  ArrowUpCircle,
} from 'lucide-react'
import { useDashboard, WidgetConfig } from '@/contexts/DashboardContext'
import { AddWidgetDialog } from '@/components/dashboard/AddWidgetDialog'
import { WidgetWrapper } from '@/components/dashboard/WidgetWrapper'
import { StatsCardsWidget } from '@/components/dashboard/widgets/StatsCardsWidget'
import { StatusChartWidget } from '@/components/dashboard/widgets/StatusChartWidget'
import { TypeChartWidget } from '@/components/dashboard/widgets/TypeChartWidget'
import { RecentActivityWidget } from '@/components/dashboard/widgets/RecentActivityWidget'
import { PendingTasksWidget } from '@/components/dashboard/widgets/PendingTasksWidget'
import { ImoveisWidget } from '@/components/dashboard/widgets/ImoveisWidget'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/contexts/SyncContext'
import { useVersion } from '@/contexts/VersionContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const widgetMap: { [key: string]: React.ComponentType<any> } = {
  StatsCardsWidget,
  StatusChartWidget,
  TypeChartWidget,
  RecentActivityWidget,
  PendingTasksWidget,
  ImoveisWidget,
}

const SummaryDashboard = () => {
  const { widgets } = useDashboard()
  const [isAddWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false)
  const { user } = useAuth()
  const { isSyncing, startSync } = useSync()
  const {
    currentVersion,
    latestVersion,
    isLatestVersion,
    isUpdating,
    updateToLatest,
  } = useVersion()

  const renderWidget = (widget: WidgetConfig) => {
    const Component = widgetMap[widget.component]
    return Component ? <Component /> : null
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Resumo</h1>
        <div className="flex items-center gap-2">
          {user && (user.role === 'supervisor' || user.role === 'usuario') && (
            <Button onClick={startSync} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setAddWidgetDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Widget
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-6 auto-rows-fr md:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget, index) => (
          <WidgetWrapper
            key={widget.id}
            id={widget.id}
            title={widget.title}
            index={index}
          >
            {renderWidget(widget)}
          </WidgetWrapper>
        ))}
      </div>
      <AddWidgetDialog
        open={isAddWidgetDialogOpen}
        onOpenChange={setAddWidgetDialogOpen}
      />
    </div>
  )
}

export default SummaryDashboard
