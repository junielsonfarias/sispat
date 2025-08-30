// Configurações de Produção - SISPAT
module.exports = {
  // Servidor
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    environment: 'production',
  },

  // Banco de Dados
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'sispat_production',
    user: process.env.DB_USER || 'sispat_user',
    password: process.env.DB_PASSWORD || 'your_secure_password_here',
    ssl: true,
    maxConnections: 100,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // JWT
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your_super_secure_jwt_secret_here_min_32_chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: '7d',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || 'your_redis_password_here',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  // Logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || '/var/log/sispat/app.log',
    maxSize: '10m',
    maxFiles: '5',
  },

  // Segurança
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    bcryptRounds: 12,
    sessionTimeout: 3600000, // 1 hora
  },

  // Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    path: process.env.UPLOAD_PATH || '/var/sispat/uploads',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFiles: 10,
  },

  // Backup
  backup: {
    path: process.env.BACKUP_PATH || '/var/sispat/backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    schedule: '0 2 * * *', // 2h da manhã
    compression: true,
  },

  // Monitoramento
  monitoring: {
    enabled: process.env.ENABLE_MONITORING === 'true',
    alertEmail: process.env.ALERT_EMAIL || 'admin@yourdomain.com',
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    metricsInterval: 30000, // 30 segundos
    healthCheckInterval: 60000, // 1 minuto
  },

  // SSL/TLS
  ssl: {
    enabled: true,
    keyPath: process.env.SSL_KEY_PATH || '/etc/ssl/private/sispat.key',
    certPath: process.env.SSL_CERT_PATH || '/etc/ssl/certs/sispat.crt',
    caPath: process.env.SSL_CA_PATH,
  },

  // Performance
  performance: {
    cacheTTL: parseInt(process.env.CACHE_TTL) || 3600,
    queryTimeout: parseInt(process.env.QUERY_TIMEOUT) || 30000,
    maxConnections: parseInt(process.env.MAX_CONNECTIONS) || 100,
    compression: true,
    gzip: true,
  },

  // Analytics
  analytics: {
    enabled: process.env.ENABLE_ANALYTICS === 'true',
    key: process.env.ANALYTICS_KEY,
    trackingId: process.env.TRACKING_ID,
  },
};
