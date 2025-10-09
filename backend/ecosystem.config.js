/**
 * Configuração PM2 para SISPAT Backend
 * 
 * Uso:
 *   Desenvolvimento: pm2 start ecosystem.config.js --env development
 *   Produção: pm2 start ecosystem.config.js --env production
 * 
 * Comandos úteis:
 *   pm2 status           - Ver status dos processos
 *   pm2 logs sispat      - Ver logs em tempo real
 *   pm2 monit            - Monitor de recursos
 *   pm2 restart sispat   - Reiniciar aplicação
 *   pm2 stop sispat      - Parar aplicação
 *   pm2 delete sispat    - Remover do PM2
 *   pm2 save             - Salvar configuração atual
 *   pm2 startup          - Configurar auto-start no boot
 */

module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: './dist/index.js',
      
      // Modo de execução
      instances: process.env.NODE_ENV === 'production' ? 2 : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Logs
      error_file: './logs/pm2/error.log',
      out_file: './logs/pm2/out.log',
      log_file: './logs/pm2/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // Merge logs para melhor visibilidade
      merge_logs: true,
      
      // Limitar tamanho dos arquivos de log
      max_log_size: '10M',
      
      // Auto-restart em caso de crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoramento de memória
      max_memory_restart: '500M',
      
      // Watch em desenvolvimento
      watch: process.env.NODE_ENV === 'development',
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git',
        '*.log',
        '*.md'
      ],
      
      // Variáveis de ambiente
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Cron para restart programado (opcional)
      // cron_restart: '0 0 * * *', // Restart diário à meia-noite
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: false,
      
      // Source maps para melhor debugging
      source_map_support: true,
      
      // Habilitar modo de desenvolvimento
      node_args: process.env.NODE_ENV === 'development' 
        ? '--inspect' 
        : undefined,
    },
  ],
  
  // Configuração de deploy (opcional)
  deploy: {
    production: {
      user: 'deploy',
      host: ['seu-servidor.com'],
      ref: 'origin/main',
      repo: 'git@github.com:seu-repo/sispat.git',
      path: '/var/www/sispat',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    },
  }
}

