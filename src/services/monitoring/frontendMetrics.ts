import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
}

export interface NavigationMetric {
  type: string;
  value: number;
  timestamp: number;
}

export interface ErrorMetric {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  userAgent: string;
  url: string;
}

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

// Classe para coleta de métricas do frontend
export class FrontendMetricsCollector {
  private metrics: WebVitalsMetric[] = [];
  private navigationMetrics: NavigationMetric[] = [];
  private errors: ErrorMetric[] = [];
  private performanceEntries: PerformanceEntry[] = [];
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  // Inicializar coleta de métricas
  private initialize(): void {
    if (this.isInitialized) return;

    // Coletar Web Vitals
    this.collectWebVitals();

    // Coletar métricas de navegação
    this.collectNavigationMetrics();

    // Configurar monitoramento de erros
    this.setupErrorTracking();

    // Monitorar performance de componentes React
    this.setupReactPerformanceTracking();

    // Coletar métricas de recursos
    this.collectResourceMetrics();

    this.isInitialized = true;
    console.log('Frontend metrics collector initialized');
  }

  // Coletar Web Vitals
  private collectWebVitals(): void {
    const handleMetric = (metric: Metric) => {
      const webVital: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        id: metric.id
      };

      this.metrics.push(webVital);
      this.sendMetricToServer(webVital);

      console.log(`Web Vital - ${metric.name}:`, metric.value, metric.rating);
    };

    // Coletar todas as métricas Web Vitals
    getCLS(handleMetric);
    getFCP(handleMetric);
    getFID(handleMetric);
    getLCP(handleMetric);
    getTTFB(handleMetric);
  }

  // Coletar métricas de navegação
  private collectNavigationMetrics(): void {
    if (!window.performance?.getEntriesByType) return;

    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = [
        { type: 'dns-lookup', value: navigation.domainLookupEnd - navigation.domainLookupStart },
        { type: 'tcp-connect', value: navigation.connectEnd - navigation.connectStart },
        { type: 'ssl-handshake', value: navigation.connectEnd - navigation.secureConnectionStart },
        { type: 'ttfb', value: navigation.responseStart - navigation.requestStart },
        { type: 'download', value: navigation.responseEnd - navigation.responseStart },
        { type: 'dom-processing', value: navigation.domComplete - navigation.domLoading },
        { type: 'load-complete', value: navigation.loadEventEnd - navigation.loadEventStart }
      ];

      metrics.forEach(metric => {
        if (metric.value > 0) {
          const navMetric: NavigationMetric = {
            ...metric,
            timestamp: Date.now()
          };
          this.navigationMetrics.push(navMetric);
          this.sendNavigationMetricToServer(navMetric);
        }
      });
    }
  }

  // Configurar rastreamento de erros
  private setupErrorTracking(): void {
    // Erros JavaScript
    window.addEventListener('error', (event) => {
      const error: ErrorMetric = {
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      this.errors.push(error);
      this.sendErrorToServer(error);
    });

    // Promessas rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      const error: ErrorMetric = {
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      this.errors.push(error);
      this.sendErrorToServer(error);
    });

    // Erros de recursos
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        const error: ErrorMetric = {
          message: `Resource load error: ${target.tagName} - ${target.getAttribute('src') || target.getAttribute('href')}`,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        };

        this.errors.push(error);
        this.sendErrorToServer(error);
      }
    }, true);
  }

  // Configurar rastreamento de performance do React
  private setupReactPerformanceTracking(): void {
    // Hook para monitorar renders de componentes
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalCreateElement = (window as any).React.createElement;
      
      (window as any).React.createElement = function(...args: any[]) {
        const startTime = performance.now();
        const result = originalCreateElement.apply(this, args);
        const endTime = performance.now();
        
        // Log apenas se demorou mais que 16ms (60fps)
        if (endTime - startTime > 16) {
          console.warn(`Slow component render: ${args[0]?.name || args[0]} took ${endTime - startTime}ms`);
        }
        
        return result;
      };
    }
  }

  // Coletar métricas de recursos
  private collectResourceMetrics(): void {
    if (!window.performance?.getEntriesByType) return;

    const resources = window.performance.getEntriesByType('resource');
    
    resources.forEach(resource => {
      const entry: PerformanceEntry = {
        name: resource.name,
        entryType: resource.entryType,
        startTime: resource.startTime,
        duration: resource.duration
      };

      this.performanceEntries.push(entry);

      // Log recursos lentos
      if (resource.duration > 1000) { // > 1 segundo
        console.warn(`Slow resource load: ${resource.name} took ${resource.duration}ms`);
        this.sendSlowResourceAlert(resource);
      }
    });
  }

  // Medir performance de função customizada
  public measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    const entry: PerformanceEntry = {
      name: `custom-${name}`,
      entryType: 'measure',
      startTime,
      duration
    };

    this.performanceEntries.push(entry);

    // Log se demorou mais que 100ms
    if (duration > 100) {
      console.warn(`Slow function execution: ${name} took ${duration}ms`);
    }

    return result;
  }

  // Medir performance de operação assíncrona
  public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    const entry: PerformanceEntry = {
      name: `async-${name}`,
      entryType: 'measure',
      startTime,
      duration
    };

    this.performanceEntries.push(entry);

    // Log se demorou mais que 1 segundo
    if (duration > 1000) {
      console.warn(`Slow async operation: ${name} took ${duration}ms`);
    }

    return result;
  }

  // Marcar evento customizado
  public markEvent(name: string, data?: any): void {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
    }

    const entry: PerformanceEntry = {
      name: `event-${name}`,
      entryType: 'mark',
      startTime: performance.now(),
      duration: 0
    };

    this.performanceEntries.push(entry);

    // Enviar para servidor se necessário
    if (data) {
      this.sendCustomEventToServer(name, data);
    }
  }

  // Obter métricas coletadas
  public getMetrics(): {
    webVitals: WebVitalsMetric[];
    navigation: NavigationMetric[];
    errors: ErrorMetric[];
    performance: PerformanceEntry[];
  } {
    return {
      webVitals: this.metrics,
      navigation: this.navigationMetrics,
      errors: this.errors,
      performance: this.performanceEntries
    };
  }

  // Limpar métricas antigas
  public cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 horas
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.navigationMetrics = this.navigationMetrics.filter(m => m.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
    this.performanceEntries = this.performanceEntries.filter(e => e.startTime > cutoff);
  }

  // Enviar métrica Web Vital para servidor
  private sendMetricToServer(metric: WebVitalsMetric): void {
    // Em produção, enviar para sua API de métricas
    if (process.env.NODE_ENV === 'development') {
      console.log('Sending Web Vital metric:', metric);
    } else {
      // fetch('/api/metrics/web-vitals', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metric)
      // }).catch(console.error);
    }
  }

  // Enviar métrica de navegação para servidor
  private sendNavigationMetricToServer(metric: NavigationMetric): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sending navigation metric:', metric);
    }
  }

  // Enviar erro para servidor
  private sendErrorToServer(error: ErrorMetric): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('Frontend error:', error);
    } else {
      // fetch('/api/metrics/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // }).catch(console.error);
    }
  }

  // Enviar alerta de recurso lento
  private sendSlowResourceAlert(resource: PerformanceResourceTiming): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Slow resource alert:', resource);
    }
  }

  // Enviar evento customizado para servidor
  private sendCustomEventToServer(name: string, data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Custom event:', name, data);
    }
  }
}

// Instância global do coletor de métricas
export const frontendMetrics = new FrontendMetricsCollector();

// Hook para usar em componentes React
export function useFrontendMetrics() {
  return {
    measureFunction: frontendMetrics.measureFunction.bind(frontendMetrics),
    measureAsync: frontendMetrics.measureAsync.bind(frontendMetrics),
    markEvent: frontendMetrics.markEvent.bind(frontendMetrics),
    getMetrics: frontendMetrics.getMetrics.bind(frontendMetrics)
  };
}

// Função para inicialização manual
export function initializeFrontendMetrics(): void {
  // A inicialização já acontece no constructor
  console.log('Frontend metrics initialized');
}

// Função para obter resumo das métricas
export function getMetricsSummary(): {
  totalErrors: number;
  averageWebVital: Record<string, number>;
  slowResources: number;
  performanceScore: number;
} {
  const metrics = frontendMetrics.getMetrics();
  
  // Calcular médias dos Web Vitals
  const webVitalAverages: Record<string, number> = {};
  metrics.webVitals.forEach(metric => {
    if (!webVitalAverages[metric.name]) {
      webVitalAverages[metric.name] = 0;
    }
    webVitalAverages[metric.name] += metric.value;
  });

  Object.keys(webVitalAverages).forEach(key => {
    const count = metrics.webVitals.filter(m => m.name === key).length;
    webVitalAverages[key] = webVitalAverages[key] / count;
  });

  // Contar recursos lentos
  const slowResources = metrics.performance.filter(p => p.duration > 1000).length;

  // Calcular score de performance (simplificado)
  const goodVitals = metrics.webVitals.filter(m => m.rating === 'good').length;
  const totalVitals = metrics.webVitals.length;
  const performanceScore = totalVitals > 0 ? (goodVitals / totalVitals) * 100 : 0;

  return {
    totalErrors: metrics.errors.length,
    averageWebVital: webVitalAverages,
    slowResources,
    performanceScore
  };
}
