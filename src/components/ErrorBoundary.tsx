import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo)
    
    // Callback customizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Se um fallback customizado foi fornecido, usar ele
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Fallback padrão
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Algo deu errado</CardTitle>
                  <CardDescription>
                    Ocorreu um erro inesperado na aplicação
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Detalhes do erro (apenas em desenvolvimento) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="font-semibold text-sm text-red-900 dark:text-red-100 mb-2">
                    Detalhes do Erro:
                  </p>
                  <pre className="text-xs text-red-800 dark:text-red-200 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              )}

              {/* Mensagem para usuário */}
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  Não se preocupe! Seus dados estão seguros. Você pode tentar:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Recarregar a página</li>
                  <li>Voltar para a página inicial</li>
                  <li>Limpar o cache do navegador</li>
                  <li>Entrar em contato com o suporte se o problema persistir</li>
                </ul>
              </div>

              {/* Ações */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar Novamente
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recarregar Página
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Ir para Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook para usar em componentes funcionais
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}

// Componente de fallback simples
export const ErrorFallback = ({ error, resetError }: { error?: Error; resetError?: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold mb-2">Erro ao carregar</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ocorreu um erro ao carregar este componente
      </p>
      {resetError && (
        <Button onClick={resetError} size="sm">
          Tentar Novamente
        </Button>
      )}
    </div>
  )
}

