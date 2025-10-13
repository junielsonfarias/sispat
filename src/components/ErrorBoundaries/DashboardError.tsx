import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface DashboardErrorProps {
  error?: Error
  resetError?: () => void
}

export const DashboardError = ({ error, resetError }: DashboardErrorProps) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro no Dashboard</AlertTitle>
          <AlertDescription className="mt-2">
            Ocorreu um erro ao carregar o dashboard. Tente recarregar a página.
            {error && (
              <details className="mt-2 text-xs opacity-75">
                <summary className="cursor-pointer">Detalhes do erro</summary>
                <pre className="mt-1 whitespace-pre-wrap">{error.message}</pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
        {resetError && (
          <Button 
            onClick={resetError} 
            variant="outline" 
            className="w-full mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
      </div>
    </div>
  )
}
