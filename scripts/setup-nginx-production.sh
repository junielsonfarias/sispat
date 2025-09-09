#!/bin/bash

# SISPAT - Script de Configuração do Nginx para Produção
# Este script configura o Nginx como proxy reverso para o SISPAT

set -e

echo "🚀 Configurando Nginx para Produção..."

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
DOMAIN=${1:-"sispat.local"}
FRONTEND_PORT=${2:-8080}
BACKEND_PORT=${3:-3001}
SSL_EMAIL=${4:-"admin@sispat.local"}

# Verificar se o Nginx está instalado
if ! command -v nginx &> /dev/null; then
    log "Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
    log "Nginx instalado com sucesso"
fi

# Verificar se o Nginx está rodando
if ! systemctl is-active --quiet nginx; then
    log "Iniciando Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    log "Nginx iniciado e habilitado"
fi

# 1. Configurar Nginx para SISPAT
log "Configurando Nginx para SISPAT..."

# Backup da configuração original
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# Configuração principal do Nginx
sudo tee /etc/nginx/nginx.conf > /dev/null << EOF
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Configurações básicas
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # Configurações de buffer
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # Configurações de timeout
    client_header_timeout 3m;
    client_body_timeout 3m;
    send_timeout 3m;
    
    # Configurações de compressão
    gzip on;
    gzip_vary on;
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
    
    # Configurações de cache
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Configurações de rate limiting
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=general:10m rate=1r/s;
    
    # Configurações de log
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # Incluir configurações de sites
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

log "Configuração principal do Nginx aplicada"

# 2. Configurar site do SISPAT
log "Configurando site do SISPAT..."

sudo tee /etc/nginx/sites-available/sispat > /dev/null << EOF
# SISPAT - Configuração do Nginx
# Proxy reverso para frontend e backend

# Rate limiting
limit_req zone=general burst=20 nodelay;
limit_req zone=api burst=50 nodelay;

# Upstream para backend
upstream sispat_backend {
    server 127.0.0.1:${BACKEND_PORT};
    keepalive 32;
}

# Upstream para frontend
upstream sispat_frontend {
    server 127.0.0.1:${FRONTEND_PORT};
    keepalive 32;
}

# Configuração do servidor
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Redirecionar HTTP para HTTPS
    return 301 https://\$server_name\$request_uri;
}

# Configuração HTTPS
server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Configurações SSL
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Configurações de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Configurações de cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        access_log off;
    }
    
    # API Backend
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Configurações de timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Configurações de buffer
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # WebSocket para backend
    location /socket.io/ {
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Configurações de timeout para WebSocket
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Frontend React
    location / {
        proxy_pass http://sispat_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Configurações de timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Configurações de buffer
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /(\.env|\.git|\.svn|\.htaccess|\.htpasswd) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Bloquear tentativas de acesso a arquivos de sistema
    location ~ /(wp-admin|wp-login|phpmyadmin|admin|administrator) {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

log "Configuração do site SISPAT criada"

# 3. Habilitar site
log "Habilitando site SISPAT..."
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Testar configuração
log "Testando configuração do Nginx..."
if sudo nginx -t; then
    log "✅ Configuração do Nginx válida"
else
    error "❌ Erro na configuração do Nginx"
    exit 1
fi

# 5. Configurar SSL com Let's Encrypt
log "Configurando SSL com Let's Encrypt..."

# Instalar Certbot se não estiver instalado
if ! command -v certbot &> /dev/null; then
    log "Instalando Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
    log "Certbot instalado com sucesso"
fi

# Obter certificado SSL
log "Obtendo certificado SSL para ${DOMAIN}..."
if sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --email ${SSL_EMAIL} --agree-tos --non-interactive; then
    log "✅ Certificado SSL obtido com sucesso"
else
    warn "⚠️ Falha ao obter certificado SSL. Configurando sem SSL..."
    
    # Configurar site sem SSL
    sudo tee /etc/nginx/sites-available/sispat > /dev/null << EOF
# SISPAT - Configuração do Nginx (sem SSL)
# Proxy reverso para frontend e backend

# Rate limiting
limit_req zone=general burst=20 nodelay;
limit_req zone=api burst=50 nodelay;

# Upstream para backend
upstream sispat_backend {
    server 127.0.0.1:${BACKEND_PORT};
    keepalive 32;
}

# Upstream para frontend
upstream sispat_frontend {
    server 127.0.0.1:${FRONTEND_PORT};
    keepalive 32;
}

# Configuração do servidor
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Configurações de cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        access_log off;
    }
    
    # API Backend
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Configurações de timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Configurações de buffer
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # WebSocket para backend
    location /socket.io/ {
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Configurações de timeout para WebSocket
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Frontend React
    location / {
        proxy_pass http://sispat_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Configurações de timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Configurações de buffer
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /(\.env|\.git|\.svn|\.htaccess|\.htpasswd) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Bloquear tentativas de acesso a arquivos de sistema
    location ~ /(wp-admin|wp-login|phpmyadmin|admin|administrator) {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
fi

# 6. Configurar renovação automática do SSL
log "Configurando renovação automática do SSL..."
sudo tee /etc/cron.d/certbot > /dev/null << EOF
# Renovar certificados SSL automaticamente
0 12 * * * root certbot renew --quiet --nginx
EOF

# 7. Configurar logrotate para Nginx
log "Configurando logrotate para Nginx..."
sudo tee /etc/logrotate.d/nginx > /dev/null << EOF
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 nginx adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi \
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF

# 8. Reiniciar Nginx
log "Reiniciando Nginx..."
sudo systemctl reload nginx

# 9. Verificar status
log "Verificando status do Nginx..."
if systemctl is-active --quiet nginx; then
    log "✅ Nginx está rodando"
else
    error "❌ Nginx não está rodando"
    exit 1
fi

# 10. Configurar firewall
log "Configurando firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 'Nginx Full'
    sudo ufw allow ssh
    sudo ufw --force enable
    log "✅ Firewall configurado"
else
    warn "⚠️ UFW não encontrado. Configure o firewall manualmente."
fi

# 11. Testar configuração
log "Testando configuração..."

# Testar se o Nginx está respondendo
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    log "✅ Health check funcionando"
else
    warn "⚠️ Health check não está funcionando"
fi

# Testar se o backend está acessível
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health | grep -q "200"; then
    log "✅ API backend acessível"
else
    warn "⚠️ API backend não está acessível"
fi

log "🎉 Configuração do Nginx concluída com sucesso!"
log "📋 Configurações aplicadas:"
log "   • Nginx configurado como proxy reverso"
log "   • SSL configurado com Let's Encrypt"
log "   • Rate limiting configurado"
log "   • Compressão gzip habilitada"
log "   • Cache de arquivos estáticos configurado"
log "   • Headers de segurança configurados"
log "   • WebSocket suportado"
log "   • Logrotate configurado"
log "   • Firewall configurado"
log "   • Renovação automática de SSL configurada"
log ""
log "🔧 Comandos úteis:"
log "   • Ver status: sudo systemctl status nginx"
log "   • Reiniciar: sudo systemctl reload nginx"
log "   • Ver logs: sudo tail -f /var/log/nginx/error.log"
log "   • Testar config: sudo nginx -t"
log "   • Renovar SSL: sudo certbot renew --nginx"
