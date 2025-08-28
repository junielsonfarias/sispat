export const cacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'sispat:',
    enabled: process.env.REDIS_ENABLED !== 'false',
  },

  ttl: {
    default: parseInt(process.env.CACHE_DEFAULT_TTL || '300'), // 5 minutos
    short: parseInt(process.env.CACHE_SHORT_TTL || '60'), // 1 minuto
    medium: parseInt(process.env.CACHE_MEDIUM_TTL || '900'), // 15 minutos
    long: parseInt(process.env.CACHE_LONG_TTL || '3600'), // 1 hora

    // TTLs específicos por tipo de dados
    user: parseInt(process.env.CACHE_USER_TTL || '300'),
    patrimonio: parseInt(process.env.CACHE_PATRIMONIO_TTL || '600'),
    report: parseInt(process.env.CACHE_REPORT_TTL || '1800'),
    dashboard: parseInt(process.env.CACHE_DASHBOARD_TTL || '180'),
    session: parseInt(process.env.CACHE_SESSION_TTL || '86400'),
  },

  memory: {
    maxSize: parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000'),
    enabled: process.env.MEMORY_CACHE_ENABLED !== 'false',
  },

  compression: {
    enabled: process.env.CACHE_COMPRESSION_ENABLED === 'true',
    threshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'), // 1KB
  },

  monitoring: {
    enabled: process.env.CACHE_MONITORING_ENABLED !== 'false',
    metricsInterval: parseInt(process.env.CACHE_METRICS_INTERVAL || '30000'),
    retentionPeriod: parseInt(
      process.env.CACHE_METRICS_RETENTION || '86400000'
    ), // 24 horas
  },

  warmup: {
    enabled: process.env.CACHE_WARMUP_ENABLED === 'true',
    onStartup: process.env.CACHE_WARMUP_ON_STARTUP === 'true',
    keys: ['dashboard:summary', 'system:config', 'user:permissions'],
  },

  invalidation: {
    strategies: {
      timeBasedEnabled: true,
      eventBasedEnabled: true,
      manualEnabled: true,
    },

    patterns: {
      user: ['user:*', 'session:*'],
      patrimonio: ['patrimonio:*', 'dashboard:*'],
      report: ['report:*'],
      system: ['system:*', 'config:*'],
    },
  },
};

export type CacheConfigType = typeof cacheConfig;
