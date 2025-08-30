module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0',
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'sispat_production',
        DB_USER: process.env.DB_USER || 'sispat_user',
        DB_PASSWORD: process.env.DB_PASSWORD || 'your_secure_password_here',
        JWT_SECRET: process.env.JWT_SECRET || 'your_super_secure_jwt_secret_here_min_32_chars',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'your_redis_password_here',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_FILE: process.env.LOG_FILE || './logs/app.log',
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://yourdomain.com',
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '900000',
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
        MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '10485760',
        UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
        BACKUP_PATH: process.env.BACKUP_PATH || './backups',
        BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS || '30',
        ENABLE_MONITORING: process.env.ENABLE_MONITORING || 'true',
        ALERT_EMAIL: process.env.ALERT_EMAIL || 'admin@yourdomain.com',
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
        CACHE_TTL: process.env.CACHE_TTL || '3600',
        QUERY_TIMEOUT: process.env.QUERY_TIMEOUT || '30000',
        MAX_CONNECTIONS: process.env.MAX_CONNECTIONS || '100',
        ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS || 'true',
        ANALYTICS_KEY: process.env.ANALYTICS_KEY,
        TRACKING_ID: process.env.TRACKING_ID
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      source_map_support: false,
      node_args: '--max-old-space-size=1024',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000
    },
    {
      name: 'sispat-frontend',
      script: 'npm',
      args: 'run preview',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 8080
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        VITE_API_URL: process.env.VITE_API_URL || 'https://yourdomain.com/api',
        VITE_APP_NAME: 'SISPAT',
        VITE_APP_VERSION: '1.0.0'
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 2000,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
      source_map_support: false,
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 5000
    }
  ],

  deploy: {
    production: {
      user: 'sispat',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/seu-usuario/sispat.git',
      path: '/var/www/sispat',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
      'post-setup': 'npm install && npm run build',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
