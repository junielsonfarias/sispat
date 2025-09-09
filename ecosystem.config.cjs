/* eslint-disable no-undef */
/**
 * SISPAT - Configuração PM2 para Produção
 * Data: 09/09/2025
 * Versão: 0.0.193
 * Descrição: Configuração simplificada do PM2 para ambiente de produção
 */

module.exports = {
  apps: [
    {
      // Configuração principal da aplicação
      name: 'sispat',
      script: 'server/index.js',
      instances: 1, // Usar apenas 1 instância para evitar problemas
      exec_mode: 'fork',

      // Configurações de ambiente
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Configurações de performance
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',

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

      // Configurações de timeout
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
    },
  ],
};