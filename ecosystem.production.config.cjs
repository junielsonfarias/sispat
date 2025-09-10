/* eslint-disable no-undef, no-dupe-keys */
/**
 * SISPAT - Configuração PM2 para Produção
 * Data: 09/09/2025
 * Versão: 0.0.193
 * Descrição: Configuração otimizada do PM2 para ambiente de produção
 */

module.exports = {
  apps: [
    {
      // Configuração principal da aplicação
      name: 'sispat',
      script: 'server/index.js',
      instances: 2, // Limitar a 2 instâncias para evitar consumo excessivo de recursos
      exec_mode: 'cluster',

      // Configurações de ambiente
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },

      // Configurações de performance
      max_memory_restart: '2G', // Aumentado de 1G para 2G
      node_args: '--max-old-space-size=2048', // Aumentado de 1024 para 2048

      // Configurações de logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Configurações de restart
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Configurações de monitoramento
      monitoring: true,
      pmx: true,

      // Configurações de cluster
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Configurações de cron
      cron_restart: '0 2 * * *', // Restart diário às 2h

      // Configurações de health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Configurações de source map
      source_map_support: true,

      // Configurações de timeout
      kill_retry_time: 100,

      // Configurações de interação
      interactive: false,

      // Configurações de merge logs
      merge_logs: true,

      // Configurações de timezone
      time: true,

      // Configurações de ignore watch
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        'backups',
        '.git',
        'dist',
        'coverage',
        'tests',
        'docs',
        'scripts',
        '*.log',
        '*.tmp',
        '*.temp',
      ],

      // Configurações de variáveis de ambiente específicas
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Performance
        UV_THREADPOOL_SIZE: 128,
        NODE_OPTIONS: '--max-old-space-size=1024 --max-semi-space-size=128',
        // Logging
        LOG_LEVEL: 'info',
        ENABLE_REQUEST_LOGGING: 'true',
        // Cache
        ENABLE_CACHE: 'true',
        CACHE_TTL: '300000',
        // Security
        BCRYPT_ROUNDS: '14',
        SESSION_TIMEOUT: '1800000',
        // Database
        DB_POOL_SIZE: '20',
        DB_IDLE_TIMEOUT: '30000',
        DB_CONNECTION_TIMEOUT: '10000',
        // Monitoring
        ENABLE_PERFORMANCE_MONITORING: 'true',
        SLOW_QUERY_THRESHOLD: '100',
        ENABLE_HEALTH_CHECKS: 'true',
        // Backup
        BACKUP_ENABLED: 'true',
        BACKUP_SCHEDULE: '0 2 * * *',
        BACKUP_RETENTION_DAYS: '30',
        // SSL
        SSL_ENABLED: 'true',
        // Maintenance
        MAINTENANCE_MODE: 'false',
        // Debug (desabilitado em produção)
        DEBUG_MODE: 'false',
        VERBOSE_LOGGING: 'false',
        ENABLE_DEBUG_ROUTES: 'false',
      },
    },
  ],

  // Configurações globais do PM2
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/sispat.git',
      path: '/var/www/sispat',
      'pre-deploy-local': '',
      'post-deploy':
        'pnpm install && pnpm run build && pm2 reload ecosystem.production.config.cjs --env production',
      'pre-setup': 'apt update && apt install -y nodejs pnpm postgresql-client',
    },
  },

  // Configurações de notificações
  notifications: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#sispat-alerts',
      username: 'SISPAT Bot',
      icon_emoji: ':warning:',
    },
    email: {
      to: process.env.ALERT_EMAIL || 'admin@yourdomain.com',
      from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
      subject: 'SISPAT Alert',
    },
  },
};
