import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ListErrorProps {
  error?: Error
  resetError?: () => void
  title?: string
}

export const ListError = ({ error, resetError, title = "Lista" }: ListErrorProps) => {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-4">
      <div className="max-w-sm w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao Carregar {title}</AlertTitle>
          <AlertDescription className="mt-2">
            Não foi possível carregar a lista. Verifique sua conexão e tente novamente.
            {error && (
              <details className="mt-2 text-xs opacity-75">
                <summary className="cursor-pointer">Detalhes</summary>
                <pre className="mt-1 whitespace-pre-wrap">{error.message}</pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
        {resetError && (
          <Button 
            onClick={resetError} 
            variant="outline" 
            size="sm"
            className="w-full mt-3"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Recarregar
          </Button>
        )}
      </div>
    </div>
  )
}
