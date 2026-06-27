import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  /** ID curto para o usuário citar ao suporte (não vaza nada além do timestamp). */
  errorId = ''

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorId = `err_${Date.now().toString(36)}`
    logger.error(`ErrorBoundary [${this.errorId}] caught:`, error, {
      componentStack: errorInfo.componentStack,
    })
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-muted p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-foreground">
                Ops! Algo deu errado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Ocorreu um erro inesperado na aplicação. Isso pode ser temporário.
              </p>
              
              {/* Em produção: mostra apenas um ID curto para o usuário citar ao suporte.
                  Stack trace e componentStack ficam só em dev — evita vazar caminhos,
                  nomes de componentes e estrutura interna. */}
              {import.meta.env.MODE === 'production' ? (
                <p className="text-xs text-center text-muted-foreground">
                  ID do erro: <code className="font-mono">{this.errorId || 'gerando...'}</code>
                  <br />
                  Informe esse código ao suporte se o problema persistir.
                </p>
              ) : (
                this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                      Detalhes do erro (apenas em dev)
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-60">
                      <div className="font-bold mb-2">Erro:</div>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack && (
                        <>
                          <div className="font-bold mt-3 mb-2">Component Stack:</div>
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                      {this.state.error.stack && (
                        <>
                          <div className="font-bold mt-3 mb-2">Stack:</div>
                          {this.state.error.stack}
                        </>
                      )}
                    </pre>
                  </details>
                )
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                >
                  Recarregar Página
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

export default ErrorBoundary
