// Serviços de monitoramento
export * from './databaseMonitoring';
export * from './expressIntegration';
export * from './frontendMetrics';
export * from './middleware';
export * from './performanceMetrics';
export * from './systemMetrics';
export * from './websocket';

// Re-exportar principais classes e funções
export {
  PerformanceMonitor,
  getPrometheusMetrics,
  performanceMonitor,
  recordCustomMetric,
  updateMemoryMetrics,
} from './performanceMetrics';

export {
  apiPerformanceMiddleware,
  errorTrackingMiddleware,
  healthCheckMiddleware,
  performanceMiddleware,
  slowQueryMiddleware,
} from './middleware';

export {
  SystemMonitor,
  checkAlerts,
  getSystemInfo,
  getSystemMetrics,
  systemMonitor,
} from './systemMetrics';

export { MonitoringWebSocketServer, monitoringWS } from './websocket';

export {
  DatabaseMonitor,
  databaseMonitor,
  monitoredQuery,
  setSlowQueryThreshold,
} from './databaseMonitoring';

export {
  FrontendMetricsCollector,
  frontendMetrics,
  getMetricsSummary,
  initializeFrontendMetrics,
  useFrontendMetrics,
} from './frontendMetrics';

export {
  ExpressMonitoringIntegration,
  createDatabaseWrapper,
  setupCompleteMonitoring,
  setupPostgreSQLMonitoring,
  setupPrismaMonitoring,
  setupSequelizeMonitoring,
} from './expressIntegration';
