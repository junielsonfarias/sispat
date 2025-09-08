#!/bin/bash

# Script de configuração de ambiente para SISPAT em VPS
# Configura variáveis de ambiente, SSL, domínio, etc.

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário com sudo."
fi

# Solicitar informações do usuário
get_user_input() {
    echo -e "${BLUE}=== Configuração do Ambiente SISPAT ===${NC}"
    echo
    
    read -p "Digite o domínio do seu site (ex: sispat.exemplo.com): " DOMAIN
    read -p "Digite o email para certificados SSL: " EMAIL
    read -p "Digite a senha do banco de dados PostgreSQL: " DB_PASSWORD
    read -p "Digite a chave secreta JWT (ou pressione Enter para gerar): " JWT_SECRET
    
    # Gerar JWT_SECRET se não fornecido
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        log "JWT_SECRET gerado automaticamente"
    fi
    
    # Gerar outras chaves secretas
    API_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32)
}

# Criar arquivo .env
create_env_file() {
    log "Criando arquivo .env..."
    
    cat > .env <<EOF
# Configurações do SISPAT
NODE_ENV=production
PORT=3001
VITE_PORT=8080

# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat
DB_USER=sispat
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false
PGSSLMODE=disable

# JWT e Segurança
JWT_SECRET=$JWT_SECRET
API_SECRET=$API_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# URLs
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=SISPAT
VITE_APP_VERSION=1.0.0

# Configurações de produção
LOG_LEVEL=info
MAX_FILE_SIZE=10485760
SESSION_SECRET=$JWT_SECRET

# Configurações de backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Configurações de monitoramento
MONITORING_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
EOF
    
    log "Arquivo .env criado com sucesso"
}

# Configurar SSL com Let's Encrypt
setup_ssl() {
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        warn "Domínio ou email não fornecido. Pulando configuração SSL."
        return
    fi
    
    log "Configurando SSL com Let's Encrypt..."
    
    # Instalar Certbot
    if command -v certbot &> /dev/null; then
        log "Certbot já instalado"
    else
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # Obter certificado
    sudo certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    # Configurar renovação automática
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log "SSL configurado com sucesso"
}

# Atualizar configuração do Nginx
update_nginx_config() {
    if [ -z "$DOMAIN" ]; then
        warn "Domínio não fornecido. Usando configuração padrão."
        return
    fi
    
    log "Atualizando configuração do Nginx..."
    
    sudo tee /etc/nginx/sites-available/sispat > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:8080;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Testar configuração
    sudo nginx -t
    
    # Reiniciar Nginx
    sudo systemctl reload nginx
    
    log "Configuração do Nginx atualizada com sucesso"
}

# Configurar PM2
setup_pm2() {
    log "Configurando PM2..."
    
    # Criar arquivo de configuração do PM2
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'sispat-backend',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/sispat/err.log',
    out_file: '/var/log/sispat/out.log',
    log_file: '/var/log/sispat/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF
    
    log "Configuração do PM2 criada com sucesso"
}

# Configurar backup automático
setup_backup() {
    log "Configurando backup automático..."
    
    # Criar script de backup
    sudo tee /opt/sispat/backup.sh > /dev/null <<'EOF'
#!/bin/bash

# Script de backup do SISPAT
BACKUP_DIR="/opt/sispat/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="sispat_backup_$DATE.tar.gz"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Fazer backup do banco de dados
pg_dump -h localhost -U sispat -d sispat > $BACKUP_DIR/db_backup_$DATE.sql

# Fazer backup dos arquivos
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=backups \
    --exclude=.git \
    /opt/sispat

# Remover backups antigos (manter apenas 30 dias)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup concluído: $BACKUP_FILE"
EOF
    
    sudo chmod +x /opt/sispat/backup.sh
    sudo chown sispat:sispat /opt/sispat/backup.sh
    
    # Agendar backup diário
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/sispat/backup.sh") | crontab -
    
    log "Backup automático configurado com sucesso"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando monitoramento..."
    
    # Criar script de monitoramento
    sudo tee /opt/sispat/monitor.sh > /dev/null <<'EOF'
#!/bin/bash

# Script de monitoramento do SISPAT
LOG_FILE="/var/log/sispat/monitor.log"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Verificar se o PM2 está rodando
if ! pm2 list | grep -q "sispat-backend"; then
    log "ERRO: Aplicação SISPAT não está rodando"
    pm2 restart ecosystem.config.js
    log "Aplicação reiniciada"
fi

# Verificar uso de memória
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    log "ALERTA: Uso de memória alto: ${MEMORY_USAGE}%"
fi

# Verificar uso de disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log "ALERTA: Uso de disco alto: ${DISK_USAGE}%"
fi

log "Monitoramento executado - Memória: ${MEMORY_USAGE}%, Disco: ${DISK_USAGE}%"
EOF
    
    sudo chmod +x /opt/sispat/monitor.sh
    sudo chown sispat:sispat /opt/sispat/monitor.sh
    
    # Agendar monitoramento a cada 5 minutos
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/sispat/monitor.sh") | crontab -
    
    log "Monitoramento configurado com sucesso"
}

# Função principal
main() {
    log "Iniciando configuração do ambiente SISPAT..."
    
    get_user_input
    create_env_file
    setup_ssl
    update_nginx_config
    setup_pm2
    setup_backup
    setup_monitoring
    
    log "Configuração do ambiente concluída com sucesso!"
    log "Próximos passos:"
    log "1. Execute 'npm install' para instalar dependências"
    log "2. Execute 'npm run build' para construir a aplicação"
    log "3. Execute 'pm2 start ecosystem.config.js' para iniciar a aplicação"
    log "4. Execute 'pm2 save' para salvar a configuração do PM2"
    log "5. Acesse https://$DOMAIN para verificar a instalação"
}

# Executar função principal
main "$@"
