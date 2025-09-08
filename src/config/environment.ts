/**
 * Configurações centralizadas de ambiente para SISPAT
 * Consolida todas as configurações em um local
 */

export interface EnvironmentConfig {
  // Servidor
  server: {
    port: number;
    host: string;
    environment: string;
  };

  // Banco de Dados
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password: string;
    url: string;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
  };

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // CORS
  cors: {
    origin: string[];
    credentials: boolean;
  };

  // Logs
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: string;
  };

  // Segurança
  security: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    bcryptRounds: number;
    sessionTimeout: number;
  };

  // Upload
  upload: {
    maxFileSize: number;
    path: string;
    allowedTypes: string[];
    maxFiles: number;
  };

  // Backup
  backup: {
    path: string;
    retentionDays: number;
    schedule: string;
    compression: boolean;
  };

  // Monitoramento
  monitoring: {
    enabled: boolean;
    alertEmail: string;
    slackWebhook?: string;
    metricsInterval: number;
    healthCheckInterval: number;
  };

  // Performance
  performance: {
    cacheTTL: number;
    queryTimeout: number;
    maxConnections: number;
    compression: boolean;
    gzip: boolean;
  };
}

// Função para obter configuração baseada no ambiente
export function getEnvironmentConfig(): EnvironmentConfig {
  // Usar import.meta.env para Vite em vez de process.env
  const isProduction = import.meta.env.MODE === 'production';
  const isDevelopment = import.meta.env.MODE === 'development';

  return {
    server: {
      port: parseInt(import.meta.env.VITE_PORT || '3001'),
      host: import.meta.env.VITE_HOST || '0.0.0.0',
      environment: import.meta.env.MODE || 'development',
    },

    database: {
      host: import.meta.env.VITE_DB_HOST || 'localhost',
      port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
      name:
        import.meta.env.VITE_DB_NAME ||
        (isProduction ? 'sispat_production' : 'sispat_development'),
      user: import.meta.env.VITE_DB_USER || 'sispat_user',
      password:
        import.meta.env.VITE_DB_PASSWORD || 'CHANGE_ME_STRONG_DB_PASSWORD_2025',
      ssl: isProduction,
      maxConnections: parseInt(
        import.meta.env.VITE_DB_MAX_CONNECTIONS || '100'
      ),
      idleTimeoutMillis: parseInt(
        import.meta.env.VITE_DB_IDLE_TIMEOUT || '30000'
      ),
      connectionTimeoutMillis: parseInt(
        import.meta.env.VITE_DB_CONNECTION_TIMEOUT || '2000'
      ),
    },

    redis: {
      host: import.meta.env.VITE_REDIS_HOST || 'localhost',
      port: parseInt(import.meta.env.VITE_REDIS_PORT || '6379'),
      password:
        import.meta.env.VITE_REDIS_PASSWORD ||
        'CHANGE_ME_STRONG_REDIS_PASSWORD_2025',
      url:
        import.meta.env.VITE_REDIS_URL ||
        `redis://:${import.meta.env.VITE_REDIS_PASSWORD || 'CHANGE_ME_STRONG_REDIS_PASSWORD_2025'}@localhost:6379`,
      retryDelayOnFailover: parseInt(
        import.meta.env.VITE_REDIS_RETRY_DELAY || '100'
      ),
      maxRetriesPerRequest: parseInt(
        import.meta.env.VITE_REDIS_MAX_RETRIES || '3'
      ),
    },

    jwt: {
      secret:
        import.meta.env.VITE_JWT_SECRET ||
        'CHANGE_ME_STRONG_JWT_SECRET_2025_MIN_32_CHARS_LONG',
      expiresIn: import.meta.env.VITE_JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: import.meta.env.VITE_JWT_REFRESH_EXPIRES_IN || '7d',
    },

    cors: {
      origin: (
        import.meta.env.VITE_CORS_ORIGIN ||
        'http://localhost:3000,http://localhost:8080'
      ).split(','),
      credentials: import.meta.env.VITE_CORS_CREDENTIALS === 'true',
    },

    logging: {
      level:
        import.meta.env.VITE_LOG_LEVEL || (isProduction ? 'warn' : 'debug'),
      file:
        import.meta.env.VITE_LOG_FILE ||
        (isProduction ? '/var/log/sispat/app.log' : './logs/app.log'),
      maxSize: import.meta.env.VITE_LOG_MAX_SIZE || '10m',
      maxFiles: import.meta.env.VITE_LOG_MAX_FILES || '5',
    },

    security: {
      rateLimitWindowMs: parseInt(
        import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || '900000'
      ),
      rateLimitMaxRequests: parseInt(
        import.meta.env.VITE_RATE_LIMIT_MAX_REQUESTS || '100'
      ),
      bcryptRounds: parseInt(import.meta.env.VITE_BCRYPT_ROUNDS || '12'),
      sessionTimeout: parseInt(
        import.meta.env.VITE_SESSION_TIMEOUT || '3600000'
      ),
    },

    upload: {
      maxFileSize: parseInt(import.meta.env.VITE_UPLOAD_MAX_SIZE || '10485760'),
      path:
        import.meta.env.VITE_UPLOAD_PATH ||
        (isProduction ? '/var/sispat/uploads' : './uploads'),
      allowedTypes: (
        import.meta.env.VITE_UPLOAD_ALLOWED_TYPES ||
        'image/jpeg,image/png,image/gif,application/pdf'
      ).split(','),
      maxFiles: parseInt(import.meta.env.VITE_UPLOAD_MAX_FILES || '10'),
    },

    backup: {
      path:
        import.meta.env.VITE_BACKUP_PATH ||
        (isProduction ? '/var/sispat/backups' : './backups'),
      retentionDays: parseInt(
        import.meta.env.VITE_BACKUP_RETENTION_DAYS || '30'
      ),
      schedule: import.meta.env.VITE_BACKUP_SCHEDULE || '0 2 * * *',
      compression: import.meta.env.VITE_BACKUP_COMPRESSION !== 'false',
    },

    monitoring: {
      enabled: import.meta.env.VITE_ENABLE_MONITORING === 'true',
      alertEmail: import.meta.env.VITE_ALERT_EMAIL || 'admin@sispat.com',
      slackWebhook: import.meta.env.VITE_SLACK_WEBHOOK_URL,
      metricsInterval: parseInt(
        import.meta.env.VITE_METRICS_INTERVAL || '30000'
      ),
      healthCheckInterval: parseInt(
        import.meta.env.VITE_HEALTH_CHECK_INTERVAL || '60000'
      ),
    },

    performance: {
      cacheTTL: parseInt(import.meta.env.VITE_CACHE_TTL || '3600'),
      queryTimeout: parseInt(import.meta.env.VITE_QUERY_TIMEOUT || '30000'),
      maxConnections: parseInt(import.meta.env.VITE_MAX_CONNECTIONS || '100'),
      compression: import.meta.env.VITE_COMPRESSION !== 'false',
      gzip: import.meta.env.VITE_GZIP !== 'false',
    },
  };
}

// Instância singleton da configuração
export const config = getEnvironmentConfig();

export default config;
