#!/bin/bash

# ===========================================
# SISPAT 2.0 - SETUP DO SERVIDOR DEBIAN 12
# ===========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo $0"
fi

log "=== SISPAT 2.0 - SETUP DO SERVIDOR DEBIAN 12 ==="

# Atualizar sistema
log "Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências básicas
log "Instalando dependências básicas..."
apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Instalar Node.js 18
log "Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar PNPM
log "Instalando PNPM..."
npm install -g pnpm

# Instalar Docker
log "Instalando Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Instalar Docker Compose
log "Instalando Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar PostgreSQL (alternativa ao Docker)
log "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Instalar Nginx
log "Instalando Nginx..."
apt install -y nginx

# Instalar PM2
log "Instalando PM2..."
npm install -g pm2

# Instalar Certbot (Let's Encrypt)
log "Instalando Certbot..."
apt install -y certbot python3-certbot-nginx

# Configurar firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar PostgreSQL
log "Configurando PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Criar usuário e banco
sudo -u postgres psql -c "CREATE USER sispat_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE sispat_prod OWNER sispat_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;"

# Configurar Nginx
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/sispat << 'EOF'
server {
    listen 80;
    server_name sispat.seudominio.com;
    
    root /var/www/sispat/dist;
    
    # Backend API - DEVE vir ANTES de /uploads
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Arquivos estáticos (uploads) - ^~ garante precedência sobre regex
    # DEVE vir ANTES do location ~* para não ser capturado pelo regex
    location ^~ /uploads {
        alias /var/www/sispat/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
        access_log off;
    }
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache estático - DEVE vir DEPOIS de /uploads
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    # Limitar tamanho de upload
    client_max_body_size 10M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t

# Configurar systemd para SISPAT
log "Configurando serviço systemd..."
cat > /etc/systemd/system/sispat-backend.service << 'EOF'
[Unit]
Description=SISPAT Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/sispat/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/sispat/backend/.env

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sispat-backend

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/sispat/backend/uploads /var/www/sispat/backend/logs /var/www/sispat/backend/backups

[Install]
WantedBy=multi-user.target
EOF

# Configurar logrotate
log "Configurando logrotate..."
cat > /etc/logrotate.d/sispat << 'EOF'
/var/www/sispat/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload sispat-backend
    endscript
}
EOF

# Configurar backup automático
log "Configurando backup automático..."
cat > /usr/local/bin/sispat-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/sispat"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup do banco
pg_dump -U sispat_user -d sispat_prod > "$BACKUP_DIR/sispat_db_$DATE.sql"

# Backup dos uploads
tar -czf "$BACKUP_DIR/sispat_uploads_$DATE.tar.gz" /var/www/sispat/backend/uploads

# Limpar backups antigos (manter 30 dias)
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup concluído: $DATE"
EOF

chmod +x /usr/local/bin/sispat-backup.sh

# Configurar cron para backup
log "Configurando cron para backup..."
echo "0 2 * * * /usr/local/bin/sispat-backup.sh" | crontab -u root -

# Configurar monitoramento
log "Configurando monitoramento..."
cat > /usr/local/bin/sispat-monitor.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/sispat-monitor.log"

check_service() {
    if ! systemctl is-active --quiet $1; then
        echo "$(date): $1 não está rodando, reiniciando..." >> "$LOG_FILE"
        systemctl restart $1
    fi
}

check_health() {
    if ! curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "$(date): Health check falhou, reiniciando SISPAT..." >> "$LOG_FILE"
        systemctl restart sispat-backend
    fi
}

check_service nginx
check_service postgresql
check_service sispat-backend
check_health
EOF

chmod +x /usr/local/bin/sispat-monitor.sh

# Configurar cron para monitoramento
echo "*/5 * * * * /usr/local/bin/sispat-monitor.sh" | crontab -u root -

# Criar diretórios necessários
log "Criando diretórios..."
mkdir -p /var/www/sispat
mkdir -p /var/www/sispat/backend/uploads
mkdir -p /var/www/sispat/backend/logs
mkdir -p /var/backups/sispat
mkdir -p /var/log/sispat

# Configurar permissões
chown -R www-data:www-data /var/www/sispat
chown -R www-data:www-data /var/backups/sispat
chown -R www-data:www-data /var/log/sispat

# Configurar permissões específicas para uploads e logs
log "Configurando permissões de uploads e logs..."
chmod 755 /var/www/sispat/backend/uploads
chmod 755 /var/www/sispat/backend/logs
find /var/www/sispat/backend/uploads -type f -exec chmod 644 {} \; 2>/dev/null || true
find /var/www/sispat/backend/uploads -type d -exec chmod 755 {} \; 2>/dev/null || true
find /var/www/sispat/backend/logs -type f -exec chmod 644 {} \; 2>/dev/null || true
find /var/www/sispat/backend/logs -type d -exec chmod 755 {} \; 2>/dev/null || true

# Configurar limites do sistema
log "Configurando limites do sistema..."
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Configurar PostgreSQL para produção
log "Otimizando PostgreSQL..."
cat >> /etc/postgresql/15/main/postgresql.conf << 'EOF'
# SISPAT Otimizações
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
max_connections = 100
EOF

# Reiniciar serviços
log "Reiniciando serviços..."
systemctl restart postgresql
systemctl restart nginx
systemctl daemon-reload

success "Setup do servidor concluído!"
echo ""
echo "Próximos passos:"
echo "1. Configure o DNS para apontar para este servidor"
echo "2. Execute: certbot --nginx -d sispat.seudominio.com"
echo "3. Clone o repositório SISPAT em /var/www/sispat"
echo "4. Configure as variáveis de ambiente"
echo "5. Execute o deploy: ./scripts/deploy.sh"
echo ""
echo "Configurações importantes:"
echo "- Banco: sispat_prod (usuário: sispat_user)"
echo "- Diretório: /var/www/sispat"
echo "- Logs: /var/log/sispat"
echo "- Backups: /var/backups/sispat"
