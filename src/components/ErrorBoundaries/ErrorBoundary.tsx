import { Component, ReactNode, ErrorInfo } from 'react'
import { DashboardError } from './DashboardError'
import { ListError } from './ListError'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  type?: 'dashboard' | 'list'
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const resetError = () => {
        this.setState({ hasError: false, error: undefined })
      }

      switch (this.props.type) {
        case 'dashboard':
          return <DashboardError error={this.state.error} resetError={resetError} />
        case 'list':
          return <ListError error={this.state.error} resetError={resetError} />
        default:
          return <ListError error={this.state.error} resetError={resetError} />
      }
    }

    return this.props.children
  }
}
