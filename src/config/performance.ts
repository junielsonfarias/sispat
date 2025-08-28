import { APP_CONFIG } from './app'

// Interface para métricas de performance
interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  context?: Record<string, any>
}

// Interface para métricas de API
interface APIMetric {
  endpoint: string
  method: string
  duration: number
  status: number
  timestamp: number
  success: boolean
}

// Classe para monitoramento de performance
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private apiMetrics: APIMetric[] = []
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initObservers()
  }

  // Inicializar observadores de performance
  private initObservers() {
    if (typeof PerformanceObserver !== 'undefined') {
      // Observar métricas de navegação
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordNavigationMetrics(navEntry)
          }
        }
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })

      // Observar métricas de recursos
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            this.recordResourceMetrics(resourceEntry)
          }
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })

      this.observers.push(navigationObserver, resourceObserver)
    }
  }

  // Registrar métricas de navegação
  private recordNavigationMetrics(navEntry: PerformanceNavigationTiming) {
    const metrics = [
      { name: 'DOMContentLoaded', value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart },
      { name: 'LoadComplete', value: navEntry.loadEventEnd - navEntry.loadEventStart },
      { name: 'FirstPaint', value: navEntry.responseStart - navEntry.requestStart },
      { name: 'TotalLoadTime', value: navEntry.loadEventEnd - navEntry.fetchStart },
    ]

    metrics.forEach(metric => {
      this.recordMetric(metric.name, metric.value, 'ms', {
        url: window.location.href,
        type: 'navigation'
      })
    })
  }

  // Registrar métricas de recursos
  private recordResourceMetrics(resourceEntry: PerformanceResourceTiming) {
    this.recordMetric('ResourceLoad', resourceEntry.duration, 'ms', {
      url: resourceEntry.name,
      type: 'resource',
      resourceType: resourceEntry.initiatorType
    })
  }

  // Registrar métrica personalizada
  recordMetric(name: string, value: number, unit: string, context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context
    }

    this.metrics.push(metric)

    // Manter apenas as últimas 1000 métricas
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Log em desenvolvimento
    if (APP_CONFIG.development.enableDebugLogs) {
      console.log(`📊 Performance: ${name} = ${value}${unit}`, context)
    }
  }

  // Registrar métrica de API
  recordAPIMetric(endpoint: string, method: string, duration: number, status: number, success: boolean) {
    const metric: APIMetric = {
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
      success
    }

    this.apiMetrics.push(metric)

    // Manter apenas as últimas 500 métricas de API
    if (this.apiMetrics.length > 500) {
      this.apiMetrics = this.apiMetrics.slice(-500)
    }

    // Log em desenvolvimento
    if (APP_CONFIG.development.enableDebugLogs) {
      console.log(`🌐 API: ${method} ${endpoint} - ${duration}ms - ${status}`, { success })
    }
  }

  // Obter métricas de performance
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  // Obter métricas de API
  getAPIMetrics(): APIMetric[] {
    return [...this.apiMetrics]
  }

  // Obter estatísticas de performance
  getPerformanceStats() {
    const recentMetrics = this.metrics.filter(m => 
      Date.now() - m.timestamp < 5 * 60 * 1000 // Últimos 5 minutos
    )

    const apiStats = this.apiMetrics.filter(m => 
      Date.now() - m.timestamp < 5 * 60 * 1000
    )

    return {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.length,
      averageLoadTime: this.calculateAverage(recentMetrics.filter(m => m.name === 'TotalLoadTime')),
      averageAPITime: this.calculateAverage(apiStats.map(m => ({ value: m.duration }))),
      apiSuccessRate: apiStats.length > 0 ? 
        (apiStats.filter(m => m.success).length / apiStats.length) * 100 : 0,
      slowestAPIs: this.getSlowestAPIs(10)
    }
  }

  // Calcular média
  private calculateAverage(metrics: { value: number }[]): number {
    if (metrics.length === 0) return 0
    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return Math.round(sum / metrics.length)
  }

  // Obter APIs mais lentas
  private getSlowestAPIs(limit: number): APIMetric[] {
    return this.apiMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  // Limpar métricas antigas
  clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000) { // 24 horas
    const cutoff = Date.now() - maxAge
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff)
  }

  // Exportar métricas para análise
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      apiMetrics: this.apiMetrics,
      stats: this.getPerformanceStats(),
      exportTime: new Date().toISOString()
    }, null, 2)
  }

  // Destruir observadores
  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor()

// Hook para monitoramento de performance
export function usePerformanceMonitoring() {
  return {
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    recordAPIMetric: performanceMonitor.recordAPIMetric.bind(performanceMonitor),
    getStats: performanceMonitor.getPerformanceStats.bind(performanceMonitor),
    exportMetrics: performanceMonitor.exportMetrics.bind(performanceMonitor)
  }
}
