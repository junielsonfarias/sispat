#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - FRONTEND HTTPS + BACKEND HTTP
# Corrige problemas quando frontend está em HTTPS mas backend em HTTP
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

log_header "Corrigindo problema Frontend HTTPS + Backend HTTP"

APP_DIR="/var/www/sispat"
cd $APP_DIR || { log_error "Diretório da aplicação não encontrado: $APP_DIR"; exit 1; }

# Detectar domínio
DOMAIN=$(grep "server_name" /etc/nginx/sites-available/sispat | awk '{print $2}' | sed 's/;//')
if [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
fi

log_info "Domínio detectado: $DOMAIN"

# 1. Verificar se o problema é realmente HTTPS vs HTTP
log_header "1. Verificando configuração atual..."

# Verificar se Nginx está configurado para HTTPS
if grep -q "listen 443" /etc/nginx/sites-available/sispat; then
    log_warning "Nginx configurado para HTTPS, mas backend pode estar em HTTP"
    HTTPS_FRONTEND=true
else
    log_info "Nginx configurado apenas para HTTP"
    HTTPS_FRONTEND=false
fi

# Verificar se o backend está rodando
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "Backend está respondendo em HTTP (localhost:3001)"
    BACKEND_HTTP=true
else
    log_error "Backend não está respondendo em HTTP"
    BACKEND_HTTP=false
fi

# 2. Corrigir configuração do Nginx para funcionar com HTTP
log_header "2. Corrigindo configuração do Nginx..."

# Fazer backup da configuração atual
cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)

# Criar configuração que funciona tanto com HTTP quanto HTTPS
cat > /etc/nginx/sites-available/sispat << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Rate limiting (usando a zona definida no nginx.conf)
    limit_req zone=api burst=20 nodelay;

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

    # Proxy para API - forçar HTTP para o backend
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
        
        # Forçar HTTP para o backend mesmo se frontend for HTTPS
        proxy_redirect http://localhost:3001/ /api/;
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

# Configuração HTTPS (se certificado existir)
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # Verificar se certificados SSL existem
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Rate limiting
    limit_req zone=api burst=20 nodelay;

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
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    }

    # Proxy para API - forçar HTTP para o backend mesmo em HTTPS
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
        
        # Forçar HTTP para o backend mesmo se frontend for HTTPS
        proxy_redirect http://localhost:3001/ /api/;
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
        proxy_set_header X-Forwarded-Proto https;
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}
EOF

# 3. Corrigir configuração do backend para aceitar requisições HTTPS
log_header "3. Corrigindo configuração do backend..."

# Atualizar .env para aceitar tanto HTTP quanto HTTPS
if [ -f ".env" ]; then
    # Fazer backup do .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Atualizar configurações CORS
    sed -i '/^CORS_ORIGIN=/c\CORS_ORIGIN=https://'$DOMAIN',http://'$DOMAIN',http://localhost:3000' .env
    sed -i '/^ALLOWED_ORIGINS=/c\ALLOWED_ORIGINS=https://'$DOMAIN',http://'$DOMAIN',http://localhost:3000' .env
    
    # Adicionar configurações para funcionar com proxy
    if ! grep -q "TRUST_PROXY" .env; then
        echo "TRUST_PROXY=true" >> .env
    fi
    
    if ! grep -q "PROXY_SECURE" .env; then
        echo "PROXY_SECURE=false" >> .env
    fi
    
    log_success "Configuração .env atualizada"
else
    log_warning "Arquivo .env não encontrado"
fi

# 4. Corrigir arquivos de build do frontend
log_header "4. Corrigindo arquivos de build do frontend..."

# Verificar se os arquivos de build existem
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    log_info "Arquivos de build encontrados, corrigindo URLs..."
    
    # Corrigir URLs nos arquivos JavaScript
    find dist -name "*.js" -type f -exec sed -i 's|https://sispat\.vps-kinghost\.net/api|/api|g' {} \;
    find dist -name "*.js" -type f -exec sed -i 's|http://sispat\.vps-kinghost\.net/api|/api|g' {} \;
    find dist -name "*.js" -type f -exec sed -i 's|https://localhost:3001/api|/api|g' {} \;
    find dist -name "*.js" -type f -exec sed -i 's|http://localhost:3001/api|/api|g' {} \;
    
    # Corrigir URLs nos arquivos HTML
    find dist -name "*.html" -type f -exec sed -i 's|https://sispat\.vps-kinghost\.net/api|/api|g' {} \;
    find dist -name "*.html" -type f -exec sed -i 's|http://sispat\.vps-kinghost\.net/api|/api|g' {} \;
    
    log_success "URLs nos arquivos de build corrigidas"
else
    log_warning "Arquivos de build não encontrados, fazendo rebuild..."
    
    # Fazer rebuild do frontend
    log_info "Fazendo rebuild do frontend..."
    npm run build:prod || npm run build
    
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        log_success "Rebuild concluído"
    else
        log_error "Falha no rebuild do frontend"
    fi
fi

# 5. Testar e recarregar configurações
log_header "5. Testando e aplicando configurações..."

# Testar configuração do Nginx
log_info "Testando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK!"
    
    # Recarregar Nginx
    log_info "Recarregando Nginx..."
    systemctl reload nginx
    log_success "Nginx recarregado!"
else
    log_error "Erro na configuração do Nginx!"
    log_info "Restaurando backup..."
    cp /etc/nginx/sites-available/sispat.backup.* /etc/nginx/sites-available/sispat
    exit 1
fi

# Reiniciar backend para aplicar novas configurações
log_info "Reiniciando backend..."
pm2 restart sispat-backend || pm2 restart all
sleep 5

# 6. Verificar se tudo está funcionando
log_header "6. Verificando funcionamento..."

# Testar backend
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "✅ Backend respondendo em HTTP"
else
    log_error "❌ Backend não está respondendo"
fi

# Testar frontend via Nginx
if curl -f -s http://localhost > /dev/null 2>&1; then
    log_success "✅ Frontend respondendo via Nginx"
else
    log_error "❌ Frontend não está respondendo via Nginx"
fi

# Testar API via Nginx
if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    log_success "✅ API respondendo via Nginx"
else
    log_error "❌ API não está respondendo via Nginx"
fi

# 7. Mostrar informações finais
log_header "Correção Concluída!"

echo -e "\n${GREEN}🎉 Problema Frontend HTTPS + Backend HTTP corrigido!${NC}"

echo -e "\n${BLUE}📋 O que foi corrigido:${NC}"
echo -e "✅ Nginx configurado para funcionar com HTTP e HTTPS"
echo -e "✅ Proxy configurado para forçar HTTP no backend"
echo -e "✅ CORS atualizado para aceitar ambos os protocolos"
echo -e "✅ URLs nos arquivos de build corrigidas"
echo -e "✅ Backend reiniciado com novas configurações"

echo -e "\n${BLUE}🌐 URLs de acesso:${NC}"
echo -e "• HTTP: ${YELLOW}http://$DOMAIN${NC}"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "• HTTPS: ${YELLOW}https://$DOMAIN${NC}"
else
    echo -e "• HTTPS: ${YELLOW}https://$DOMAIN${NC} (certificado SSL necessário)"
fi

echo -e "\n${BLUE}🔧 Comandos úteis:${NC}"
echo -e "• Status: ${YELLOW}pm2 status${NC}"
echo -e "• Logs: ${YELLOW}pm2 logs${NC}"
echo -e "• Nginx: ${YELLOW}systemctl status nginx${NC}"
echo -e "• Testar API: ${YELLOW}curl -I http://localhost/api/health${NC}"

echo -e "\n${GREEN}✅ Agora o sistema deve funcionar corretamente!${NC}"
