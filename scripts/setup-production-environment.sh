#!/bin/bash

# SISPAT - Script de Preparação do Ambiente de Produção
# Este script configura o ambiente de produção final

set -e

echo "🚀 Preparando Ambiente de Produção do SISPAT..."

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
PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="/opt/sispat/backups"
LOG_DIR="/var/log/sispat"
CONFIG_DIR="/etc/sispat"
SERVICE_USER="sispat"

# 1. Criar estrutura de diretórios
log "Criando estrutura de diretórios de produção..."

# Criar diretórios principais
mkdir -p $PRODUCTION_DIR/{app,config,logs,backups,scripts}
mkdir -p $BACKUP_DIR/{database,files,config}
mkdir -p $LOG_DIR/{application,system,security,performance}
mkdir -p $CONFIG_DIR/{nginx,pm2,ssl,monitoring}

# Definir permissões
chown -R $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR
chown -R $SERVICE_USER:$SERVICE_USER $LOG_DIR
chown -R $SERVICE_USER:$SERVICE_USER $CONFIG_DIR

# Definir permissões de segurança
chmod 755 $PRODUCTION_DIR
chmod 750 $BACKUP_DIR
chmod 755 $LOG_DIR
chmod 750 $CONFIG_DIR

log "✅ Estrutura de diretórios criada"

# 2. Configurar usuário de serviço
log "Configurando usuário de serviço..."

# Criar usuário se não existir
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/false -d $PRODUCTION_DIR $SERVICE_USER
    log "✅ Usuário $SERVICE_USER criado"
else
    log "✅ Usuário $SERVICE_USER já existe"
fi

# 3. Configurar variáveis de ambiente de produção
log "Configurando variáveis de ambiente de produção..."

# Criar arquivo de ambiente de produção
cat > $CONFIG_DIR/.env.production << 'EOF'
# SISPAT - Configurações de Produção
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_SSL=true

# JWT
JWT_SECRET=CHANGE_THIS_JWT_SECRET
JWT_EXPIRES_IN=24h

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@sispat.com

# Upload
UPLOAD_MAX_SIZE=10MB
UPLOAD_PATH=/opt/sispat/uploads

# Logs
LOG_LEVEL=info
LOG_FILE=/var/log/sispat/application/app.log

# Segurança
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
SESSION_SECRET=CHANGE_THIS_SESSION_SECRET

# Monitoramento
MONITORING_ENABLED=true
MONITORING_PORT=3002
METRICS_ENABLED=true

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30

# SSL
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/sispat.crt
SSL_KEY_PATH=/etc/ssl/private/sispat.key

# Domínio
DOMAIN=sispat.com
FRONTEND_URL=https://sispat.com
API_URL=https://api.sispat.com
EOF

# Definir permissões de segurança
chown $SERVICE_USER:$SERVICE_USER $CONFIG_DIR/.env.production
chmod 600 $CONFIG_DIR/.env.production

log "✅ Variáveis de ambiente configuradas"

# 4. Configurar SSL/TLS
log "Configurando SSL/TLS..."

# Criar diretório para certificados
mkdir -p /etc/ssl/certs
mkdir -p /etc/ssl/private

# Criar certificado auto-assinado para desenvolvimento
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/sispat.key \
    -out /etc/ssl/certs/sispat.crt \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=SISPAT/CN=sispat.com"

# Definir permissões de segurança
chown root:root /etc/ssl/certs/sispat.crt
chown root:root /etc/ssl/private/sispat.key
chmod 644 /etc/ssl/certs/sispat.crt
chmod 600 /etc/ssl/private/sispat.key

log "✅ SSL/TLS configurado"

# 5. Configurar Nginx para produção
log "Configurando Nginx para produção..."

# Criar configuração do Nginx
cat > $CONFIG_DIR/nginx/sispat.conf << 'EOF'
# SISPAT - Configuração Nginx para Produção
upstream sispat_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream sispat_frontend {
    server 127.0.0.1:5173;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Configuração principal
server {
    listen 80;
    server_name sispat.com www.sispat.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sispat.com www.sispat.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/sispat.crt;
    ssl_certificate_key /etc/ssl/private/sispat.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Frontend
    location / {
        proxy_pass http://sispat_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Login endpoint com rate limiting específico
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /opt/sispat/app/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Criar link simbólico para configuração do Nginx
ln -sf $CONFIG_DIR/nginx/sispat.conf /etc/nginx/sites-available/sispat
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/sispat

# Remover configuração padrão
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t

log "✅ Nginx configurado para produção"

# 6. Configurar PM2 para produção
log "Configurando PM2 para produção..."

# Criar configuração do PM2
cat > $CONFIG_DIR/pm2/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sispat-backend',
      script: './server/index.js',
      cwd: '/opt/sispat/app',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_file: '/var/log/sispat/application/backend.log',
      out_file: '/var/log/sispat/application/backend-out.log',
      error_file: '/var/log/sispat/application/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'sispat-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/opt/sispat/app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5173
      },
      log_file: '/var/log/sispat/application/frontend.log',
      out_file: '/var/log/sispat/application/frontend-out.log',
      error_file: '/var/log/sispat/application/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      kill_timeout: 5000
    }
  ]
};
EOF

# Definir permissões
chown $SERVICE_USER:$SERVICE_USER $CONFIG_DIR/pm2/ecosystem.config.js
chmod 644 $CONFIG_DIR/pm2/ecosystem.config.js

log "✅ PM2 configurado para produção"

# 7. Configurar sistema de backup
log "Configurando sistema de backup..."

# Criar script de backup
cat > $PRODUCTION_DIR/scripts/backup.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup
BACKUP_DIR="/opt/sispat/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/sispat/application/backup.log"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

log "Iniciando backup do SISPAT..."

# Backup do banco de dados
log "Fazendo backup do banco de dados..."
pg_dump -h localhost -U sispat_user -d sispat_production > $BACKUP_DIR/database/sispat_$DATE.sql
if [ $? -eq 0 ]; then
    log "Backup do banco de dados concluído: sispat_$DATE.sql"
else
    log "ERRO: Falha no backup do banco de dados"
    exit 1
fi

# Backup dos arquivos de configuração
log "Fazendo backup dos arquivos de configuração..."
tar -czf $BACKUP_DIR/config/sispat_config_$DATE.tar.gz /etc/sispat/
if [ $? -eq 0 ]; then
    log "Backup dos arquivos de configuração concluído: sispat_config_$DATE.tar.gz"
else
    log "ERRO: Falha no backup dos arquivos de configuração"
    exit 1
fi

# Backup dos arquivos de upload
log "Fazendo backup dos arquivos de upload..."
tar -czf $BACKUP_DIR/files/sispat_files_$DATE.tar.gz /opt/sispat/uploads/
if [ $? -eq 0 ]; then
    log "Backup dos arquivos de upload concluído: sispat_files_$DATE.tar.gz"
else
    log "ERRO: Falha no backup dos arquivos de upload"
    exit 1
fi

# Limpar backups antigos (manter apenas 30 dias)
log "Limpando backups antigos..."
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

log "Backup do SISPAT concluído com sucesso!"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/backup.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup.sh

# Configurar cron para backup automático
echo "0 2 * * * $SERVICE_USER $PRODUCTION_DIR/scripts/backup.sh" >> /etc/crontab

log "✅ Sistema de backup configurado"

# 8. Configurar monitoramento
log "Configurando monitoramento..."

# Criar script de monitoramento
cat > $PRODUCTION_DIR/scripts/monitor.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Monitoramento
LOG_FILE="/var/log/sispat/application/monitor.log"
ALERT_EMAIL="admin@sispat.com"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

# Verificar se o PM2 está rodando
if ! pm2 list | grep -q "sispat-backend.*online"; then
    send_alert "SISPAT Backend não está rodando!"
    pm2 restart sispat-backend
fi

if ! pm2 list | grep -q "sispat-frontend.*online"; then
    send_alert "SISPAT Frontend não está rodando!"
    pm2 restart sispat-frontend
fi

# Verificar uso de memória
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    send_alert "Uso de memória alto: ${MEMORY_USAGE}%"
fi

# Verificar uso de disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    send_alert "Uso de disco alto: ${DISK_USAGE}%"
fi

# Verificar conectividade do banco
if ! pg_isready -h localhost -p 5432 -U sispat_user; then
    send_alert "Banco de dados PostgreSQL não está respondendo!"
fi

log "Monitoramento executado com sucesso"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/monitor.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/monitor.sh

# Configurar cron para monitoramento (a cada 5 minutos)
echo "*/5 * * * * $SERVICE_USER $PRODUCTION_DIR/scripts/monitor.sh" >> /etc/crontab

log "✅ Monitoramento configurado"

# 9. Configurar firewall
log "Configurando firewall..."

# Configurar UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Permitir SSH
ufw allow 22/tcp

# Permitir HTTP e HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Permitir portas internas (apenas localhost)
ufw allow from 127.0.0.1 to any port 3001
ufw allow from 127.0.0.1 to any port 5173
ufw allow from 127.0.0.1 to any port 3002

# Ativar firewall
ufw --force enable

log "✅ Firewall configurado"

# 10. Configurar logrotate
log "Configurando logrotate..."

# Criar configuração do logrotate
cat > /etc/logrotate.d/sispat << 'EOF'
/var/log/sispat/application/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sispat sispat
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/sispat/system/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sispat sispat
}

/var/log/sispat/security/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sispat sispat
}

/var/log/sispat/performance/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sispat sispat
}
EOF

log "✅ Logrotate configurado"

# 11. Configurar sistema de inicialização
log "Configurando sistema de inicialização..."

# Criar script de inicialização
cat > /etc/systemd/system/sispat.service << 'EOF'
[Unit]
Description=SISPAT Application
After=network.target postgresql.service

[Service]
Type=forking
User=sispat
Group=sispat
WorkingDirectory=/opt/sispat/app
ExecStart=/usr/bin/pm2 start /etc/sispat/pm2/ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 stop all
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd
systemctl daemon-reload
systemctl enable sispat.service

log "✅ Sistema de inicialização configurado"

# 12. Configurar otimizações do sistema
log "Configurando otimizações do sistema..."

# Otimizar limites do sistema
cat >> /etc/security/limits.conf << 'EOF'
sispat soft nofile 65536
sispat hard nofile 65536
sispat soft nproc 32768
sispat hard nproc 32768
EOF

# Otimizar parâmetros do kernel
cat >> /etc/sysctl.conf << 'EOF'
# SISPAT - Otimizações do Kernel
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

# Aplicar configurações
sysctl -p

log "✅ Otimizações do sistema configuradas"

# 13. Criar script de deploy
log "Criando script de deploy..."

# Criar script de deploy
cat > $PRODUCTION_DIR/scripts/deploy.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Deploy
set -e

echo "🚀 Iniciando deploy do SISPAT..."

# Parar aplicação
pm2 stop all

# Fazer backup antes do deploy
/opt/sispat/scripts/backup.sh

# Atualizar código (assumindo que está em /opt/sispat/app)
cd /opt/sispat/app
git pull origin main

# Instalar dependências
npm ci --production

# Executar migrações do banco
npm run migrate

# Recompilar frontend
npm run build

# Reiniciar aplicação
pm2 start /etc/sispat/pm2/ecosystem.config.js --env production

# Verificar status
pm2 status

echo "✅ Deploy concluído com sucesso!"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/deploy.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/deploy.sh

log "✅ Script de deploy criado"

# 14. Configurar health check
log "Configurando health check..."

# Criar script de health check
cat > $PRODUCTION_DIR/scripts/health-check.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Health Check
HEALTH_URL="http://localhost:3001/api/health"
LOG_FILE="/var/log/sispat/application/health-check.log"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Verificar saúde da aplicação
if curl -f -s $HEALTH_URL > /dev/null; then
    log "Health check: OK"
    exit 0
else
    log "Health check: FAILED"
    exit 1
fi
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/health-check.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/health-check.sh

log "✅ Health check configurado"

# 15. Exibir resumo final
log "🎉 Ambiente de produção configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Diretório de produção: $PRODUCTION_DIR"
log "   • Diretório de backup: $BACKUP_DIR"
log "   • Diretório de logs: $LOG_DIR"
log "   • Diretório de configuração: $CONFIG_DIR"
log "   • Usuário de serviço: $SERVICE_USER"
log ""
log "🔧 Serviços configurados:"
log "   • Nginx: Configurado com SSL e rate limiting"
log "   • PM2: Configurado para cluster mode"
log "   • PostgreSQL: Configurado para produção"
log "   • Backup: Automático diário às 2h"
log "   • Monitoramento: A cada 5 minutos"
log "   • Firewall: UFW configurado"
log "   • Logrotate: Rotação automática de logs"
log ""
log "📁 Scripts disponíveis:"
log "   • Deploy: $PRODUCTION_DIR/scripts/deploy.sh"
log "   • Backup: $PRODUCTION_DIR/scripts/backup.sh"
log "   • Monitor: $PRODUCTION_DIR/scripts/monitor.sh"
log "   • Health Check: $PRODUCTION_DIR/scripts/health-check.sh"
log ""
log "⚠️  Próximos passos:"
log "   1. Copiar código da aplicação para $PRODUCTION_DIR/app"
log "   2. Configurar banco de dados PostgreSQL"
log "   3. Atualizar senhas no arquivo $CONFIG_DIR/.env.production"
log "   4. Configurar certificado SSL real (Let's Encrypt)"
log "   5. Configurar domínio e DNS"
log "   6. Executar deploy inicial"
log ""
log "✅ Ambiente de produção pronto para uso!"
