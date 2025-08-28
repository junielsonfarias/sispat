const promClient = require('prom-client');

// Configuração do Prometheus
const register = new promClient.Registry();

// Adicionar métricas padrão
promClient.collectDefaultMetrics({ register });

// Contadores para requisições HTTP
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Contadores para autenticação
const authAttemptsTotal = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total de tentativas de autenticação',
  labelNames: ['success', 'method'],
  registers: [register],
});

// Contadores para operações de banco de dados
const dbOperationsTotal = new promClient.Counter({
  name: 'db_operations_total',
  help: 'Total de operações no banco de dados',
  labelNames: ['operation', 'table', 'success'],
  registers: [register],
});

const dbOperationDuration = new promClient.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duração das operações no banco de dados',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Contadores para cache
const cacheOperationsTotal = new promClient.Counter({
  name: 'cache_operations_total',
  help: 'Total de operações de cache',
  labelNames: ['operation', 'cache_type', 'hit'],
  registers: [register],
});

// Gauge para usuários ativos
const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Número de usuários ativos',
  registers: [register],
});

// Gauge para patrimônios
const totalPatrimonios = new promClient.Gauge({
  name: 'patrimonios_total',
  help: 'Total de patrimônios no sistema',
  registers: [register],
});

// Gauge para memória do sistema
const systemMemoryUsage = new promClient.Gauge({
  name: 'system_memory_usage_bytes',
  help: 'Uso de memória do sistema',
  registers: [register],
});

const systemCpuUsage = new promClient.Gauge({
  name: 'system_cpu_usage_percent',
  help: 'Uso de CPU do sistema',
  registers: [register],
});

// Contadores para erros
const errorsTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total de erros no sistema',
  labelNames: ['type', 'severity'],
  registers: [register],
});

// Contadores para uploads
const uploadsTotal = new promClient.Counter({
  name: 'uploads_total',
  help: 'Total de uploads de arquivos',
  labelNames: ['type', 'success'],
  registers: [register],
});

const uploadSize = new promClient.Histogram({
  name: 'upload_size_bytes',
  help: 'Tamanho dos arquivos enviados',
  labelNames: ['type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760], // 1KB, 10KB, 100KB, 1MB, 10MB
  registers: [register],
});

// Funções auxiliares para incrementar métricas
const metrics = {
  // Métricas HTTP
  incrementHttpRequest: (method, route, statusCode) => {
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
  },

  startHttpRequestTimer: (method, route) => {
    return httpRequestDuration.startTimer({ method, route });
  },

  // Métricas de autenticação
  incrementAuthAttempt: (success, method) => {
    authAttemptsTotal.inc({ success: success.toString(), method });
  },

  // Métricas de banco de dados
  incrementDbOperation: (operation, table, success) => {
    dbOperationsTotal.inc({ operation, table, success: success.toString() });
  },

  startDbOperationTimer: (operation, table) => {
    return dbOperationDuration.startTimer({ operation, table });
  },

  // Métricas de cache
  incrementCacheOperation: (operation, cacheType, hit) => {
    cacheOperationsTotal.inc({
      operation,
      cache_type: cacheType,
      hit: hit.toString(),
    });
  },

  // Métricas de usuários
  setActiveUsers: count => {
    activeUsers.set(count);
  },

  // Métricas de patrimônios
  setTotalPatrimonios: count => {
    totalPatrimonios.set(count);
  },

  // Métricas do sistema
  setSystemMemoryUsage: bytes => {
    systemMemoryUsage.set(bytes);
  },

  setSystemCpuUsage: percent => {
    systemCpuUsage.set(percent);
  },

  // Métricas de erros
  incrementError: (type, severity) => {
    errorsTotal.inc({ type, severity });
  },

  // Métricas de upload
  incrementUpload: (type, success) => {
    uploadsTotal.inc({ type, success: success.toString() });
  },

  observeUploadSize: (type, bytes) => {
    uploadSize.observe({ type }, bytes);
  },

  // Middleware para métricas HTTP
  httpMetricsMiddleware: (req, res, next) => {
    const start = Date.now();
    const method = req.method;
    const route = req.route?.path || req.path;

    // Incrementar contador de requisições
    metrics.incrementHttpRequest(method, route, res.statusCode);

    // Medir duração da requisição
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      httpRequestDuration.observe({ method, route }, duration);
    });

    next();
  },

  // Função para obter métricas
  getMetrics: async () => {
    return await register.metrics();
  },

  // Função para obter métricas em formato JSON
  getMetricsJson: async () => {
    const metrics = await register.getMetricsAsJSON();
    return metrics;
  },

  // Função para limpar métricas (útil para testes)
  clearMetrics: () => {
    register.clear();
  },
};

module.exports = metrics;
