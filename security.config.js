/**
 * Configurações de Segurança para SISPAT
 * Este arquivo centraliza todas as configurações de segurança da aplicação
 */

export const securityConfig = {
  // Configurações JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256',
    issuer: 'sispat-system',
    audience: 'sispat-users',
  },

  // Configurações de Senha
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },

  // Configurações de Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    authMaxRequests: 5,
    authWindowMs: 15 * 60 * 1000, // 15 minutos
    criticalMaxRequests: 30,
    uploadMaxRequests: 10,
    uploadWindowMs: 5 * 60 * 1000, // 5 minutos
  },

  // Configurações de Lockout
  lockout: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 30 * 60 * 1000, // 30 minutos
    resetAttemptsAfter: 24 * 60 * 60 * 1000, // 24 horas
  },

  // Configurações de Sessão
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT) || 8 * 60 * 60 * 1000, // 8 horas
    refreshThreshold: 30 * 60 * 1000, // 30 minutos
    maxConcurrentSessions: 3,
  },

  // Configurações de CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-Client-Version',
    ],
  },

  // Configurações de Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    scanForViruses: process.env.NODE_ENV === 'production',
  },

  // Configurações de Headers de Segurança
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 ano
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  },

  // Configurações de Logging de Segurança
  securityLogging: {
    enabled: true,
    logLevel: process.env.LOG_LEVEL || 'info',
    logFailedLogins: true,
    logSuspiciousActivity: true,
    logDataAccess: true,
    logAdminActions: true,
  },

  // Configurações de Backup
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2 AM daily
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    backupPath: process.env.BACKUP_PATH || './backups',
    encryptBackups: process.env.NODE_ENV === 'production',
  },

  // Configurações de Monitoramento
  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT) || 9090,
    healthCheckInterval: 30000, // 30 segundos
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90,
      responseTime: 5000, // 5 segundos
    },
  },

  // Configurações de API
  api: {
    version: 'v1',
    rateLimitPerHour: 1000,
    requireApiKey: process.env.NODE_ENV === 'production',
    enableSwagger: process.env.NODE_ENV !== 'production',
  },

  // Configurações de Desenvolvimento
  development: {
    disableDatabase: process.env.DISABLE_DATABASE === 'true',
    enableDebugEndpoints: process.env.ENABLE_DEBUG_ENDPOINTS === 'true',
    mockData: process.env.USE_MOCK_DATA === 'true',
  },
};

// Validação das configurações críticas
export const validateSecurityConfig = () => {
  const errors = [];

  if (!securityConfig.jwt.secret || securityConfig.jwt.secret.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres');
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
      errors.push('ALLOWED_ORIGINS é obrigatório em produção');
    }

    if (securityConfig.cors.allowedOrigins.includes('*')) {
      errors.push('CORS não pode permitir todas as origens em produção');
    }

    if (securityConfig.development.enableDebugEndpoints) {
      errors.push('Endpoints de debug não devem estar habilitados em produção');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default securityConfig;
