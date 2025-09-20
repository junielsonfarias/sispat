#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE CONFIGURAÇÃO DUPLICADA DO NGINX - SISPAT
# Para corrigir erro "duplicate location /api/ in /etc/nginx/sites-enabled/sispat"
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

log_header "Corrigindo configuração duplicada do Nginx..."

# 1. Fazer backup da configuração atual
log_info "Fazendo backup da configuração atual..."
cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)

# 2. Verificar o problema
log_info "Verificando configuração atual..."
if grep -c "location /api/" /etc/nginx/sites-available/sispat > 1; then
    log_warning "Encontradas múltiplas diretivas 'location /api/' - corrigindo..."
    
    # 3. Recriar configuração limpa
    log_info "Recriando configuração do Nginx..."
    cat > /etc/nginx/sites-available/sispat << 'EOF'
server {
    listen 80;
    server_name sispat.vps-kinghost.net;

    # Servir arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para API (única diretiva)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}
EOF
    
    log_success "Configuração do Nginx recriada!"
else
    log_info "Nenhuma duplicação encontrada na configuração atual"
fi

# 4. Testar configuração
log_info "Testando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK!"
    
    # 5. Recarregar Nginx
    log_info "Recarregando Nginx..."
    systemctl reload nginx
    log_success "Nginx recarregado com sucesso!"
else
    log_error "Erro na configuração do Nginx!"
    log_info "Restaurando backup..."
    cp /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/sispat
    exit 1
fi

# 6. Verificar status
log_info "Verificando status do Nginx..."
systemctl status nginx --no-pager -l

log_success "Correção da configuração do Nginx concluída!"
log_info "Agora você pode continuar com a instalação."
