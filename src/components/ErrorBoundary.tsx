import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props & { navigate: (path: string) => void }, State> {
  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Chamar callback de erro se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log do erro para monitoramento
    this.logError(error, errorInfo)
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    // Em produção, enviar para serviço de monitoramento
    if (process.env.NODE_ENV === 'production') {
      // Aqui você pode integrar com Sentry, LogRocket, etc.
      console.error('Error logged:', errorData)
    } else {
      console.error('Development error:', errorData)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleGoHome = () => {
    this.props.navigate('/')
    this.handleRetry()
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Renderizar fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Renderizar UI de erro padrão
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Algo deu errado
              </CardTitle>
              <CardDescription className="text-gray-600">
                Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-100 p-2 text-xs text-gray-800">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
                
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline" 
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Ir para o Início
                </Button>
                
                <Button 
                  onClick={this.handleReload} 
                  variant="ghost" 
                  className="w-full"
                >
                  Recarregar Página
                </Button>
              </div>
              
              <div className="text-center text-xs text-gray-500">
                Se o problema persistir, entre em contato com o suporte técnico.
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper para fornecer navigate
export const ErrorBoundaryWrapper = ({ children, ...props }: Props) => {
  const navigate = useNavigate()
  return (
    <ErrorBoundary {...props} navigate={navigate}>
      {children}
    </ErrorBoundary>
  )
}

// Hook para usar error boundary em componentes funcionais
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    console.error('Error handled by hook:', error)
    setError(error)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleError,
    clearError
  }
}

// Componente para capturar erros em componentes específicos
export const ErrorCatcher = ({ 
  children, 
  fallback 
}: { 
  children: ReactNode
  fallback?: (error: Error) => ReactNode 
}) => {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      setError(event.reason)
    }

    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error)
      setError(event.error)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  if (error) {
    if (fallback) {
      return <>{fallback(error)}</>
    }
    
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-gray-600">
          Ocorreu um erro. Tente novamente.
        </p>
        <Button 
          onClick={() => setError(null)} 
          size="sm" 
          className="mt-2"
        >
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

export default ErrorBoundaryWrapper
