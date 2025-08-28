/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './main.css';
import { logBuildInfo } from '@/config/build-info';
import { APP_CONFIG } from '@/config/app';
import { initSentry } from '@/config/sentry';
import { performanceMonitor } from '@/config/performance';

// Inicialização independente do SISPAT
initializeApp();

createRoot(document.getElementById('root')!).render(<App />);

function initializeApp() {
  // Inicializar Sentry para error tracking
  initSentry();

  // Log de informações de build
  logBuildInfo();

  // Configuração de error handling global
  const events: Parameters<typeof window.onerror>[] = [];
  const w = window;

  function onError(
    message: string,
    source?: string,
    line?: number,
    column?: number,
    error?: Error
  ) {
    events.push([message, source, line, column, error]);

    // Log do erro para desenvolvimento
    if (APP_CONFIG.development.enableDebugLogs) {
      console.error('🚨 SISPAT Error:', {
        message,
        source,
        line,
        column,
        error,
      });
    }

    // Registrar métrica de erro
    performanceMonitor.recordMetric('Error', 1, 'count', {
      message,
      source,
      line,
      column,
      errorType: error?.name || 'Unknown',
    });
  }

  // Configurar error handlers globais
  w.onerror = onError;
  w.onunhandledrejection = errorEvent =>
    onError(
      errorEvent.reason?.message || 'Unhandled Promise Rejection',
      errorEvent.reason?.source,
      errorEvent.reason?.line,
      errorEvent.reason?.column,
      errorEvent.reason
    );

  // Log de inicialização
  if (APP_CONFIG.development.enableDebugLogs) {
    console.log(
      '🚀 SISPAT - Sistema de Gestão Patrimonial inicializado com sucesso!'
    );
    console.log('📊 Versão:', APP_CONFIG.version);
    console.log('🌍 Ambiente:', import.meta.env.MODE);
    console.log('🔗 API URL:', APP_CONFIG.backendUrl);
    console.log('🔍 Sentry: Configurado para error tracking');
    console.log('📊 Performance Monitor: Ativo');
  }
}
