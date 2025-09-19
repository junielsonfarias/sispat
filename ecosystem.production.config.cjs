/**
 * Configuração PM2 para Produção - SISPAT
 * Este arquivo configura o PM2 para executar a aplicação em produção
 */

module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: 'server/index.js',
      instances: 'max', // Usar todos os cores disponíveis
      exec_mode: 'cluster',
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

      // Configurações de log
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Configurações de restart
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Configurações de monitoramento
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],

      // Configurações de cluster
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Configurações de ambiente
      env_file: '.env',

      // Configurações de segurança
      uid: 'sispat',
      gid: 'sispat',

      // Configurações de health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Configurações de merge logs
      merge_logs: true,

      // Configurações de timezone
      time: true,
    },
  ],

  // Configurações de deploy (opcional)
  deploy: {
    production: {
      user: 'sispat',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/sispat.git',
      path: '/var/www/sispat',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npm run build:prod && pm2 reload ecosystem.production.config.cjs --env production',
      'pre-setup': '',
    },
  },
};
