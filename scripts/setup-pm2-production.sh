#!/bin/bash

# SISPAT - Script de Configuração do PM2 para Produção
# Este script configura o PM2 para gerenciar os processos do SISPAT

set -e

echo "🚀 Configurando PM2 para Produção..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Configurações
PROJECT_DIR=${1:-"/var/www/sispat"}
NODE_ENV=${2:-"production"}
PM2_USER=${3:-"www-data"}

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado. Instale primeiro o Node.js."
    exit 1
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    log "Instalando PM2..."
    sudo npm install -g pm2
    log "PM2 instalado com sucesso"
fi

# 1. Configurar PM2 para inicialização automática
log "Configurando PM2 para inicialização automática..."
sudo pm2 startup systemd -u $PM2_USER --hp /home/$PM2_USER

# 2. Criar diretório de logs
log "Criando diretório de logs..."
sudo mkdir -p /var/log/pm2
sudo chown $PM2_USER:$PM2_USER /var/log/pm2

# 3. Configurar ecosystem do PM2
log "Configurando ecosystem do PM2..."

sudo tee $PROJECT_DIR/ecosystem.config.cjs > /dev/null << EOF
module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: './server/index.js',
      cwd: '$PROJECT_DIR',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: '$NODE_ENV',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'sispat_db',
        DB_USER: 'postgres',
        DB_PASSWORD: '6273',
        JWT_SECRET: 'your_secure_jwt_secret_here_use_openssl_to_generate',
        JWT_EXPIRES_IN: '24h',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'your-email@gmail.com',
        SMTP_PASS: 'your-app-password',
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: 10485760,
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        ALLOWED_ORIGINS: 'https://yourdomain.com,https://www.yourdomain.com,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080',
        BCRYPT_ROUNDS: 12,
        SESSION_TIMEOUT: 1800000,
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 1800000,
        LOG_LEVEL: 'info',
        ENABLE_REQUEST_LOGGING: true
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'sispat_db',
        DB_USER: 'postgres',
        DB_PASSWORD: '6273',
        JWT_SECRET: 'your_secure_jwt_secret_here_use_openssl_to_generate',
        JWT_EXPIRES_IN: '24h',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'your-email@gmail.com',
        SMTP_PASS: 'your-app-password',
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: 10485760,
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        ALLOWED_ORIGINS: 'https://yourdomain.com,https://www.yourdomain.com',
        BCRYPT_ROUNDS: 12,
        SESSION_TIMEOUT: 1800000,
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 1800000,
        LOG_LEVEL: 'info',
        ENABLE_REQUEST_LOGGING: true
      },
      log_file: '/var/log/pm2/sispat-backend.log',
      out_file: '/var/log/pm2/sispat-backend-out.log',
      error_file: '/var/log/pm2/sispat-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      watch_options: {
        followSymlinks: false
      }
    },
    {
      name: 'sispat-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '$PROJECT_DIR',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: '$NODE_ENV',
        PORT: 8080,
        VITE_API_URL: 'http://localhost:3001/api'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        VITE_API_URL: 'https://yourdomain.com/api'
      },
      log_file: '/var/log/pm2/sispat-frontend.log',
      out_file: '/var/log/pm2/sispat-frontend-out.log',
      error_file: '/var/log/pm2/sispat-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
      watch_options: {
        followSymlinks: false
      }
    }
  ],
  
  deploy: {
    production: {
      user: '$PM2_USER',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/sispat.git',
      path: '$PROJECT_DIR',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': ''
    }
  }
};
EOF

log "Ecosystem do PM2 configurado"

# 4. Configurar monitoramento do PM2
log "Configurando monitoramento do PM2..."

# Instalar PM2 Plus se disponível
if command -v pm2 &> /dev/null; then
    log "PM2 Plus disponível para monitoramento avançado"
fi

# 5. Configurar logs do PM2
log "Configurando logs do PM2..."

# Configurar logrotate para PM2
sudo tee /etc/logrotate.d/pm2 > /dev/null << EOF
/var/log/pm2/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $PM2_USER $PM2_USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 6. Configurar monitoramento de recursos
log "Configurando monitoramento de recursos..."

# Criar script de monitoramento
sudo tee /usr/local/bin/monitor-pm2.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Monitoramento do PM2
# Monitora o status dos processos PM2

LOG_FILE="/var/log/pm2/monitor.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando monitoramento do PM2..."

# Verificar status dos processos
BACKEND_STATUS=\$(pm2 jlist | jq -r '.[] | select(.name=="sispat-backend") | .pm2_env.status')
FRONTEND_STATUS=\$(pm2 jlist | jq -r '.[] | select(.name=="sispat-frontend") | .pm2_env.status')

if [ "\$BACKEND_STATUS" = "online" ]; then
    log "✅ Backend SISPAT: Online"
else
    log "❌ Backend SISPAT: Offline"
    pm2 restart sispat-backend
    log "🔄 Backend SISPAT reiniciado"
fi

if [ "\$FRONTEND_STATUS" = "online" ]; then
    log "✅ Frontend SISPAT: Online"
else
    log "❌ Frontend SISPAT: Offline"
    pm2 restart sispat-frontend
    log "🔄 Frontend SISPAT reiniciado"
fi

# Verificar uso de memória
BACKEND_MEMORY=\$(pm2 jlist | jq -r '.[] | select(.name=="sispat-backend") | .monit.memory')
FRONTEND_MEMORY=\$(pm2 jlist | jq -r '.[] | select(.name=="sispat-frontend") | .monit.memory')

log "💾 Uso de memória - Backend: \$BACKEND_MEMORY bytes, Frontend: \$FRONTEND_MEMORY bytes"

# Verificar CPU
BACKEND_CPU=\$(pm2 jlist | jq -r '.[] | select(.name=="sispat-backend") | .monit.cpu')
FRONTEND_CPU=\$(pm2 jlist | jq -r '.[] | select(.name=="sispat-frontend") | .monit.cpu')

log "⚡ Uso de CPU - Backend: \$BACKEND_CPU%, Frontend: \$FRONTEND_CPU%"

log "Monitoramento do PM2 finalizado"
EOF

sudo chmod +x /usr/local/bin/monitor-pm2.sh

# 7. Configurar agendamento de monitoramento
log "Configurando agendamento de monitoramento..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-pm2.sh") | crontab -

# 8. Configurar backup do PM2
log "Configurando backup do PM2..."

# Criar script de backup
sudo tee /usr/local/bin/backup-pm2.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Backup do PM2
# Faz backup da configuração do PM2

BACKUP_DIR="/var/backups/pm2"
DATE=\$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p \$BACKUP_DIR

# Fazer backup da configuração
pm2 save
cp ~/.pm2/dump.pm2 \$BACKUP_DIR/dump_\$DATE.pm2

# Limpar backups antigos (mais de 30 dias)
find \$BACKUP_DIR -name "dump_*.pm2" -mtime +30 -delete

echo "\$(date '+%Y-%m-%d %H:%M:%S') - Backup do PM2 concluído"
EOF

sudo chmod +x /usr/local/bin/backup-pm2.sh

# Agendar backup diário
(crontab -l 2>/dev/null; echo "0 1 * * * /usr/local/bin/backup-pm2.sh") | crontab -

# 9. Configurar alertas
log "Configurando alertas do PM2..."

# Criar script de alertas
sudo tee /usr/local/bin/pm2-alerts.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Alertas do PM2
# Envia alertas quando há problemas

LOG_FILE="/var/log/pm2/alerts.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

# Verificar se há processos offline
OFFLINE_PROCESSES=\$(pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | .name')

if [ -n "\$OFFLINE_PROCESSES" ]; then
    log "🚨 ALERTA: Processos offline detectados: \$OFFLINE_PROCESSES"
    # Aqui você pode adicionar envio de email ou notificação
fi

# Verificar uso excessivo de memória
HIGH_MEMORY=\$(pm2 jlist | jq -r '.[] | select(.monit.memory > 1000000000) | .name')

if [ -n "\$HIGH_MEMORY" ]; then
    log "⚠️ ALERTA: Uso alto de memória detectado: \$HIGH_MEMORY"
fi

# Verificar uso excessivo de CPU
HIGH_CPU=\$(pm2 jlist | jq -r '.[] | select(.monit.cpu > 80) | .name')

if [ -n "\$HIGH_CPU" ]; then
    log "⚠️ ALERTA: Uso alto de CPU detectado: \$HIGH_CPU"
fi

log "Verificação de alertas finalizada"
EOF

sudo chmod +x /usr/local/bin/pm2-alerts.sh

# Agendar verificação de alertas a cada 10 minutos
(crontab -l 2>/dev/null; echo "*/10 * * * * /usr/local/bin/pm2-alerts.sh") | crontab -

# 10. Configurar PM2 para produção
log "Configurando PM2 para produção..."

# Parar processos existentes
pm2 delete all 2>/dev/null || true

# Iniciar processos com o ecosystem
cd $PROJECT_DIR
pm2 start ecosystem.config.cjs --env production

# Salvar configuração
pm2 save

# 11. Verificar status
log "Verificando status do PM2..."
pm2 status

# 12. Configurar logrotate para logs do PM2
log "Configurando logrotate para logs do PM2..."
sudo tee /etc/logrotate.d/pm2-logs > /dev/null << EOF
/var/log/pm2/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $PM2_USER $PM2_USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 13. Testar configuração
log "Testando configuração do PM2..."

# Verificar se os processos estão rodando
if pm2 list | grep -q "sispat-backend.*online"; then
    log "✅ Backend SISPAT está rodando"
else
    error "❌ Backend SISPAT não está rodando"
fi

if pm2 list | grep -q "sispat-frontend.*online"; then
    log "✅ Frontend SISPAT está rodando"
else
    error "❌ Frontend SISPAT não está rodando"
fi

# 14. Configurar monitoramento de saúde
log "Configurando monitoramento de saúde..."

# Criar script de health check
sudo tee /usr/local/bin/pm2-health-check.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Health Check do PM2
# Verifica a saúde dos processos

LOG_FILE="/var/log/pm2/health-check.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando health check do PM2..."

# Verificar se o PM2 está rodando
if ! pgrep -f "PM2" > /dev/null; then
    log "🚨 CRÍTICO: PM2 não está rodando"
    exit 1
fi

# Verificar processos
PROCESSES=\$(pm2 jlist | jq -r '.[].name')
for process in \$PROCESSES; do
    STATUS=\$(pm2 jlist | jq -r ".[] | select(.name==\"\$process\") | .pm2_env.status")
    if [ "\$STATUS" != "online" ]; then
        log "🚨 CRÍTICO: Processo \$process está \$STATUS"
        pm2 restart \$process
        log "🔄 Processo \$process reiniciado"
    else
        log "✅ Processo \$process está online"
    fi
done

log "Health check do PM2 finalizado"
EOF

sudo chmod +x /usr/local/bin/pm2-health-check.sh

# Agendar health check a cada 2 minutos
(crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/pm2-health-check.sh") | crontab -

log "🎉 Configuração do PM2 concluída com sucesso!"
log "📋 Configurações aplicadas:"
log "   • PM2 configurado para inicialização automática"
log "   • Ecosystem configurado para produção"
log "   • Monitoramento de recursos configurado"
log "   • Logs configurados e rotacionados"
log "   • Backup automático configurado"
log "   • Alertas configurados"
log "   • Health check configurado"
log "   • Processos iniciados em modo cluster"
log ""
log "🔧 Comandos úteis:"
log "   • Ver status: pm2 status"
log "   • Ver logs: pm2 logs"
log "   • Reiniciar: pm2 restart all"
log "   • Parar: pm2 stop all"
log "   • Iniciar: pm2 start all"
log "   • Monitorar: pm2 monit"
log "   • Salvar: pm2 save"
log "   • Recarregar: pm2 reload all"
log ""
log "📊 Monitoramento:"
log "   • Logs: /var/log/pm2/"
log "   • Monitoramento: a cada 5 minutos"
log "   • Health check: a cada 2 minutos"
log "   • Alertas: a cada 10 minutos"
log "   • Backup: diário às 1:00"
