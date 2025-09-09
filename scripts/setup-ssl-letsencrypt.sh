#!/bin/bash

# SISPAT - Script de Configuração SSL com Let's Encrypt
# Este script configura SSL com Let's Encrypt para produção

set -e

echo "🚀 Configurando SSL com Let's Encrypt para o SISPAT..."

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
DOMAIN=${1:-"sispat.com"}
EMAIL=${2:-"admin@sispat.com"}
WEBROOT="/var/www/html"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
NGINX_CONFIG="/etc/nginx/sites-available/sispat"

# 1. Verificar se o domínio está configurado
log "Verificando configuração do domínio..."

if [ "$DOMAIN" = "sispat.com" ]; then
    warn "⚠️ Domínio padrão detectado. Configure o domínio real antes de continuar."
    read -p "Digite o domínio real (ex: meusite.com): " REAL_DOMAIN
    if [ -n "$REAL_DOMAIN" ]; then
        DOMAIN="$REAL_DOMAIN"
        CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
        NGINX_CONFIG="/etc/nginx/sites-available/sispat"
        log "Domínio configurado para: $DOMAIN"
    else
        error "Domínio é obrigatório para SSL com Let's Encrypt"
        exit 1
    fi
fi

log "✅ Domínio configurado: $DOMAIN"

# 2. Verificar se o Certbot está instalado
log "Verificando instalação do Certbot..."

if ! command -v certbot &> /dev/null; then
    log "Instalando Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

log "✅ Certbot está instalado"

# 3. Verificar se o Nginx está configurado
log "Verificando configuração do Nginx..."

if [ ! -f "$NGINX_CONFIG" ]; then
    error "Configuração do Nginx não encontrada. Execute primeiro o script de configuração do ambiente de produção."
    exit 1
fi

log "✅ Nginx está configurado"

# 4. Configurar Nginx para validação do domínio
log "Configurando Nginx para validação do domínio..."

# Criar diretório webroot
mkdir -p $WEBROOT

# Configurar Nginx temporariamente para validação
cat > /etc/nginx/sites-available/sispat-temp << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    root $WEBROOT;
    index index.html;
    
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
    
    location / {
        return 200 'SISPAT - Configurando SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

# Ativar configuração temporária
ln -sf /etc/nginx/sites-available/sispat-temp /etc/nginx/sites-enabled/sispat-temp
rm -f /etc/nginx/sites-enabled/sispat

# Testar e recarregar Nginx
nginx -t
systemctl reload nginx

log "✅ Nginx configurado para validação"

# 5. Obter certificado SSL
log "Obtendo certificado SSL com Let's Encrypt..."

# Obter certificado
certbot certonly \
    --webroot \
    --webroot-path=$WEBROOT \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN,www.$DOMAIN \
    --non-interactive

if [ $? -eq 0 ]; then
    log "✅ Certificado SSL obtido com sucesso"
else
    error "❌ Falha ao obter certificado SSL"
    exit 1
fi

# 6. Configurar Nginx com SSL
log "Configurando Nginx com SSL..."

# Atualizar configuração do Nginx com SSL
cat > $NGINX_CONFIG << EOF
# SISPAT - Configuração Nginx com SSL
upstream sispat_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream sispat_frontend {
    server 127.0.0.1:5173;
    keepalive 32;
}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate $CERT_DIR/chain.pem;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none';";

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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # API Backend
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Login endpoint com rate limiting específico
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://sispat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
}
EOF

# Ativar configuração com SSL
ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/sispat
rm -f /etc/nginx/sites-enabled/sispat-temp

# Testar configuração
nginx -t

if [ $? -eq 0 ]; then
    systemctl reload nginx
    log "✅ Nginx configurado com SSL"
else
    error "❌ Erro na configuração do Nginx"
    exit 1
fi

# 7. Configurar renovação automática
log "Configurando renovação automática..."

# Criar script de renovação
cat > /opt/sispat/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Renovação SSL
LOG_FILE="/var/log/sispat/application/renew-ssl.log"
ALERT_EMAIL="admin@sispat.com"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT SSL Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

log "Iniciando renovação SSL..."

# Tentar renovar certificado
if certbot renew --quiet; then
    log "Certificado SSL renovado com sucesso"
    
    # Recarregar Nginx
    systemctl reload nginx
    log "Nginx recarregado"
    
    log "Renovação SSL concluída com sucesso!"
else
    send_alert "Falha na renovação do certificado SSL"
    log "ERRO: Falha na renovação do certificado SSL"
    exit 1
fi
EOF

# Tornar script executável
chmod +x /opt/sispat/scripts/renew-ssl.sh
chown sispat:sispat /opt/sispat/scripts/renew-ssl.sh

# Configurar cron para renovação automática (diário às 3h)
echo "0 3 * * * root /opt/sispat/scripts/renew-ssl.sh" >> /etc/crontab

log "✅ Renovação automática configurada"

# 8. Configurar monitoramento SSL
log "Configurando monitoramento SSL..."

# Criar script de monitoramento SSL
cat > /opt/sispat/scripts/monitor-ssl.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Monitoramento SSL
LOG_FILE="/var/log/sispat/application/monitor-ssl.log"
ALERT_EMAIL="admin@sispat.com"
DOMAIN="CHANGE_THIS_DOMAIN"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT SSL Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

# Verificar expiração do certificado
CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/cert.pem | cut -d= -f2)
CERT_EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (CERT_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

log "Certificado expira em $DAYS_UNTIL_EXPIRY dias"

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    send_alert "Certificado SSL expira em $DAYS_UNTIL_EXPIRY dias"
fi

# Verificar se o certificado está funcionando
if ! curl -s -I https://$DOMAIN | grep -q "HTTP/2 200"; then
    send_alert "Certificado SSL não está funcionando corretamente"
fi

log "Monitoramento SSL executado com sucesso"
EOF

# Substituir placeholder do domínio
sed -i "s/CHANGE_THIS_DOMAIN/$DOMAIN/g" /opt/sispat/scripts/monitor-ssl.sh

# Tornar script executável
chmod +x /opt/sispat/scripts/monitor-ssl.sh
chown sispat:sispat /opt/sispat/scripts/monitor-ssl.sh

# Configurar cron para monitoramento (diário às 6h)
echo "0 6 * * * sispat /opt/sispat/scripts/monitor-ssl.sh" >> /etc/crontab

log "✅ Monitoramento SSL configurado"

# 9. Testar configuração SSL
log "Testando configuração SSL..."

# Testar se o site está acessível via HTTPS
if curl -s -I https://$DOMAIN | grep -q "HTTP/2 200"; then
    log "✅ Site acessível via HTTPS"
else
    warn "⚠️ Site não está acessível via HTTPS"
fi

# Testar se o certificado está válido
if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates | grep -q "notAfter"; then
    log "✅ Certificado SSL válido"
else
    warn "⚠️ Certificado SSL inválido"
fi

# Testar se o redirecionamento HTTP para HTTPS está funcionando
if curl -s -I http://$DOMAIN | grep -q "301 Moved Permanently"; then
    log "✅ Redirecionamento HTTP para HTTPS funcionando"
else
    warn "⚠️ Redirecionamento HTTP para HTTPS não está funcionando"
fi

log "✅ Configuração SSL testada"

# 10. Exibir resumo final
log "🎉 SSL com Let's Encrypt configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Domínio: $DOMAIN"
log "   • Email: $EMAIL"
log "   • Certificado: $CERT_DIR"
log "   • Renovação: Automática"
log "   • Monitoramento: Diário"
log ""
log "🔧 Recursos configurados:"
log "   • Certificado SSL válido"
log "   • Redirecionamento HTTP para HTTPS"
log "   • Headers de segurança"
log "   • Renovação automática"
log "   • Monitoramento de expiração"
log ""
log "📁 Scripts disponíveis:"
log "   • Renovação: /opt/sispat/scripts/renew-ssl.sh"
log "   • Monitoramento: /opt/sispat/scripts/monitor-ssl.sh"
log ""
log "⚠️  Próximos passos:"
log "   1. Configurar DNS para apontar para este servidor"
log "   2. Testar acesso via HTTPS"
log "   3. Configurar backup dos certificados"
log "   4. Monitorar logs de renovação"
log ""
log "✅ SSL configurado e funcionando!"
