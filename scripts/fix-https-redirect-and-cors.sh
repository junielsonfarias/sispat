#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE REDIRECIONAMENTO HTTPS E CORS - SISPAT VPS
# Para corrigir problemas de acesso externo
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

log_header "Corrigindo redirecionamento HTTPS e CORS..."

# 1. Fazer backup da configuração atual
log_info "Fazendo backup da configuração atual..."
cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)

# 2. Corrigir configuração do Nginx (remover redirecionamento HTTPS forçado)
log_header "Corrigindo configuração do Nginx..."
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
        
        # CORS headers para arquivos estáticos
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    }

    # Proxy para API
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
        
        # CORS headers para API
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
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

log_success "Configuração do Nginx corrigida!"

# 3. Testar configuração do Nginx
log_info "Testando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK!"
    systemctl reload nginx
else
    log_error "Erro na configuração do Nginx!"
    exit 1
fi

# 4. Corrigir configuração CORS no backend
log_header "Corrigindo configuração CORS no backend..."
cd /var/www/sispat

# Verificar se o arquivo .env existe e corrigir CORS
if [ -f ".env" ]; then
    log_info "Atualizando configurações CORS no .env..."
    
    # Remover configurações CORS antigas
    sed -i '/CORS_/d' .env
    
    # Adicionar configurações CORS corretas
    cat >> .env << 'EOF'

# CORS Configuration
CORS_ORIGIN=*
CORS_CREDENTIALS=false
ALLOWED_ORIGINS=*
EOF
    
    log_success "Configurações CORS atualizadas no .env!"
else
    log_error "Arquivo .env não encontrado!"
fi

# 5. Reiniciar serviços
log_header "Reiniciando serviços..."
pm2 restart all
sleep 3

# 6. Testar conectividade
log_header "Testando conectividade..."

log_info "Testando localhost:80:"
if curl -I http://localhost:80 2>/dev/null | head -1; then
    log_success "Localhost:80 respondendo"
else
    log_error "Localhost:80 não está respondendo"
fi

log_info "Testando API local:"
if curl -I http://localhost:3001/api/health 2>/dev/null | head -1; then
    log_success "API local respondendo"
else
    log_warning "API local não está respondendo (pode ser normal se não houver rota /api/health)"
fi

# 7. Verificar logs
log_header "Verificando logs..."
log_info "Logs do PM2 (últimas 5 linhas):"
pm2 logs --lines 5

# 8. Informações finais
log_header "Correções aplicadas!"
echo -e "${GREEN}✅ Redirecionamento HTTPS forçado removido${NC}"
echo -e "${GREEN}✅ CORS configurado para permitir acesso externo${NC}"
echo -e "${GREEN}✅ Nginx recarregado${NC}"
echo -e "${GREEN}✅ PM2 reiniciado${NC}"

echo -e "\n${YELLOW}🎯 AGORA TESTE:${NC}"
echo "1. Acesse: http://sispat.vps-kinghost.net"
echo "2. Se ainda não funcionar, verifique o DNS:"
echo "   nslookup sispat.vps-kinghost.net"
echo "3. Teste com IP direto:"
echo "   curl -I http://$(curl -s ifconfig.me)"

log_success "Correção de HTTPS e CORS concluída!"
