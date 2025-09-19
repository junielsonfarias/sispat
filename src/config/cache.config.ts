/**
 * Configuração de Cache para SISPAT
 */

export const cacheConfig = {
  // Cache de consultas do banco de dados
  database: {
    enabled: true,
    ttl: 300, // 5 minutos
    maxSize: 1000,
    keyPrefix: 'db:',
  },

  // Cache de sessões
  session: {
    enabled: true,
    ttl: 8 * 60 * 60, // 8 horas
    maxSize: 10000,
    keyPrefix: 'session:',
  },

  // Cache de arquivos estáticos
  static: {
    enabled: true,
    ttl: 24 * 60 * 60, // 24 horas
    maxSize: 100,
    keyPrefix: 'static:',
  },

  // Cache de relatórios
  reports: {
    enabled: true,
    ttl: 60 * 60, // 1 hora
    maxSize: 100,
    keyPrefix: 'report:',
  },

  // Configurações do Redis (se disponível)
  redis: {
    enabled: process.env.REDIS_HOST ? true : false,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },
};

export default cacheConfig;
