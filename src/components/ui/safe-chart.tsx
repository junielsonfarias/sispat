/* Safe wrapper for chart components with error boundary */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ChartFallback } from './chart-fallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SafeChart extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <ChartFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default SafeChart;
