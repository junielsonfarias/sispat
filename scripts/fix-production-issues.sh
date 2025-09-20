#!/bin/bash

# =============================================================================
# SCRIPT PARA CORRIGIR PROBLEMAS DE PRODUÇÃO - SISPAT
# Corrige redirecionamento HTTPS, CORS e configuração PM2
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🚀 $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root!"
    log_info "Execute: sudo su -"
    exit 1
fi

log_header "Corrigindo problemas de produção do SISPAT..."

# 1. Corrigir configuração do Nginx
log_header "Corrigindo configuração do Nginx..."

log_info "Fazendo backup da configuração atual..."
cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S) || true

# Obter domínio da configuração atual
DOMAIN=$(grep -o 'server_name [^;]*' /etc/nginx/sites-available/sispat | awk '{print $2}' | head -1)
if [ -z "$DOMAIN" ]; then
    DOMAIN="sispat.vps-kinghost.net"
fi

log_info "Domínio detectado: $DOMAIN"

# Criar nova configuração do Nginx sem redirecionamento HTTPS forçado
cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Configurações para servir arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Proxy para API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}

# Configuração HTTPS (será adicionada pelo Certbot se SSL for configurado)
# server {
#     listen 443 ssl http2;
#     server_name $DOMAIN;
#     # Certificados SSL serão configurados pelo Certbot
# }
EOF

log_info "Testando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK!"
    systemctl reload nginx
else
    log_error "Erro na configuração do Nginx!"
    exit 1
fi

# 2. Corrigir configuração CORS no backend
log_header "Corrigindo configuração CORS..."

if [ -f "/var/www/sispat/.env" ]; then
    log_info "Atualizando configurações CORS no .env..."
    
    # Adicionar configurações CORS flexíveis
    if ! grep -q "ALLOW_NO_ORIGIN" /var/www/sispat/.env; then
        echo "ALLOW_NO_ORIGIN=true" >> /var/www/sispat/.env
    fi
    
    if ! grep -q "CORS_ORIGIN" /var/www/sispat/.env; then
        echo "CORS_ORIGIN=*" >> /var/www/sispat/.env
    fi
    
    log_success "Configurações CORS atualizadas no .env!"
else
    log_warning "Arquivo .env não encontrado em /var/www/sispat/"
fi

# 3. Reiniciar PM2 com nova configuração
log_header "Reiniciando aplicação..."

cd /var/www/sispat

# Parar aplicação atual
pm2 stop all || true
pm2 delete all || true

# Iniciar com configuração corrigida
pm2 start ecosystem.production.config.cjs --env production
pm2 save

log_info "Aguardando aplicação inicializar..."
sleep 5

# 4. Verificar status
log_header "Verificando status dos serviços..."

log_info "Status do PM2:"
pm2 status

log_info "Status do Nginx:"
systemctl status nginx --no-pager -l

# 5. Testar conectividade
log_header "Testando conectividade..."

log_info "Testando localhost:80..."
if curl -s -I http://localhost:80 | grep -q "200 OK"; then
    log_success "✅ Localhost:80 respondendo"
else
    log_error "❌ Localhost:80 não respondendo"
fi

log_info "Testando API local..."
if curl -s -I http://localhost:3001 | grep -q "200 OK\|404 Not Found"; then
    log_success "✅ API local respondendo"
else
    log_error "❌ API local não respondendo"
fi

log_info "Verificando logs do PM2..."
pm2 logs --lines 5

log_success "Correções aplicadas com sucesso!"

log_info "💡 Próximos passos:"
log_info "   1. Teste a aplicação no navegador: http://$DOMAIN"
log_info "   2. Verifique os logs: pm2 logs"
log_info "   3. Configure SSL se necessário: certbot --nginx -d $DOMAIN"
log_info "   4. Monitore a aplicação: pm2 monit"
