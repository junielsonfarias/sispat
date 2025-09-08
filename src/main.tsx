/* Main entry point for the application - renders the root React component */
import React from 'react';
import { APP_CONFIG } from '@/config/app';
import { logBuildInfo } from '@/config/build-info';
import { logger } from '@/config/logging';
import { performanceMonitor } from '@/config/performance';
import { initSentry } from '@/config/sentry';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './main.css';
import './styles/responsive.css';

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

    // Log do erro usando sistema de logging
    logger.error('SISPAT Error', 'ErrorBoundary', {
      message,
      source,
      line,
      column,
      error: error?.message,
      stack: error?.stack,
    });

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
  logger.info(
    'SISPAT - Sistema de Gestão Patrimonial inicializado com sucesso!',
    'App'
  );
  logger.debug('Versão', 'App', { version: APP_CONFIG.version });
  logger.debug('Ambiente', 'App', { mode: import.meta.env.MODE });
  logger.debug('API URL', 'App', { backendUrl: APP_CONFIG.backendUrl });
  logger.debug('Sentry: Configurado para error tracking', 'App');
  logger.debug('Performance Monitor: Ativo', 'App');
}
