#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE EMERGÊNCIA - HTTPS FORÇADO PARA HTTP
# Resolve definitivamente o problema de frontend tentando HTTPS
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

log_header "Iniciando correção de emergência para HTTPS forçado..."

APP_DIR="/var/www/sispat"
NGINX_CONF="/etc/nginx/sites-available/sispat"

# 1. Detectar domínio
DOMAIN=$(grep "server_name" $NGINX_CONF | awk '{print $2}' | sed 's/;//')
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "_" ]; then
    DOMAIN=$(hostname -I | awk '{print $1}')
    log_warning "Domínio não encontrado no Nginx, usando IP da VPS: $DOMAIN"
else
    log_info "Domínio detectado: $DOMAIN"
fi

FRONTEND_URL="http://$DOMAIN"
API_URL="http://$DOMAIN/api"

log_info "URLs de destino: Frontend=$FRONTEND_URL, API=$API_URL"

# 2. PARAR TODOS OS SERVIÇOS
log_info "Parando todos os serviços..."
systemctl stop nginx 2>/dev/null || true
pm2 stop all 2>/dev/null || true
sleep 5

# 3. CORREÇÃO AGRESSIVA DOS ARQUIVOS DE BUILD
log_info "Executando correção AGRESSIVA dos arquivos de build..."
if [ -d "$APP_DIR/dist" ]; then
    cd "$APP_DIR"
    
    # Lista de todos os arquivos que podem conter URLs
    log_info "Encontrando arquivos para correção..."
    find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" \) -print0 | while IFS= read -r -d $'\0' file; do
        log_info "Processando: $file"
        
        # Substituir TODAS as ocorrências de HTTPS por HTTP
        sed -i 's|https://|http://|g' "$file"
        
        # Substituir localhost por domínio
        sed -i "s|localhost:3001|$DOMAIN|g" "$file"
        sed -i "s|localhost:8080|$DOMAIN|g" "$file"
        sed -i "s|localhost|$DOMAIN|g" "$file"
        
        # Substituir URLs específicas do domínio
        sed -i "s|https://$DOMAIN|$FRONTEND_URL|g" "$file"
        sed -i "s|http://$DOMAIN|$FRONTEND_URL|g" "$file"
        sed -i "s|https://$DOMAIN/api|$API_URL|g" "$file"
        sed -i "s|http://$DOMAIN/api|$API_URL|g" "$file"
    done
    
    log_success "Correção agressiva concluída nos arquivos de build!"
else
    log_warning "Diretório 'dist' não encontrado. Tentando rebuild..."
    cd "$APP_DIR"
    
    # Tentar fazer rebuild
    log_info "Fazendo rebuild do frontend..."
    npm run build:prod || npm run build || {
        log_error "Falha no rebuild. Continuando com correções..."
    }
    
    # Aplicar correções novamente se o build foi bem-sucedido
    if [ -d "dist" ]; then
        find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" \) -exec sed -i 's|https://|http://|g' {} \;
        find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" \) -exec sed -i "s|localhost|$DOMAIN|g" {} \;
        log_success "Correções aplicadas após rebuild!"
    fi
fi

# 4. CORRIGIR ARQUIVO .ENV
log_info "Corrigindo arquivo .env..."
if [ -f "$APP_DIR/.env" ]; then
    # Backup do .env original
    cp "$APP_DIR/.env" "$APP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Corrigir URLs no .env
    sed -i "s|https://|http://|g" "$APP_DIR/.env"
    sed -i "s|localhost:3001|$DOMAIN|g" "$APP_DIR/.env"
    sed -i "s|localhost:8080|$DOMAIN|g" "$APP_DIR/.env"
    sed -i "s|localhost|$DOMAIN|g" "$APP_DIR/.env"
    
    log_success "Arquivo .env corrigido!"
fi

# 5. CORRIGIR CONFIGURAÇÃO DO NGINX
log_info "Corrigindo configuração do Nginx..."
if [ -f "$NGINX_CONF" ]; then
    # Backup da configuração original
    cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Recriar configuração do Nginx FORÇANDO HTTP
    cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Headers anti-cache para forçar reload dos arquivos corrigidos
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;

    # Configurações para servir arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Proxy para API - FORÇANDO HTTP
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support - FORÇANDO HTTP
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}
EOF
    
    log_success "Configuração do Nginx corrigida!"
else
    log_warning "Arquivo de configuração do Nginx não encontrado!"
fi

# 6. VERIFICAR E CORRIGIR PM2
log_info "Verificando e corrigindo PM2..."
cd "$APP_DIR"

# Parar PM2 se estiver rodando
pm2 kill 2>/dev/null || true
sleep 3

# Iniciar PM2 novamente
pm2 start ecosystem.production.config.cjs --env production
pm2 save

log_success "PM2 reiniciado!"

# 7. TESTAR CONFIGURAÇÃO DO NGINX
log_info "Testando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK!"
else
    log_error "Erro na configuração do Nginx!"
    nginx -t
    exit 1
fi

# 8. INICIAR SERVIÇOS
log_info "Iniciando serviços..."
systemctl start nginx
sleep 5

# Verificar se os serviços estão rodando
if systemctl is-active --quiet nginx; then
    log_success "Nginx iniciado com sucesso!"
else
    log_error "Falha ao iniciar Nginx!"
    systemctl status nginx
    exit 1
fi

# 9. VERIFICAR PM2
log_info "Verificando PM2..."
sleep 10  # Dar tempo para o backend inicializar

PM2_STATUS=$(pm2 status | grep -c "online" || echo "0")
if [ "$PM2_STATUS" -gt 0 ]; then
    log_success "PM2 está online com $PM2_STATUS processos!"
else
    log_warning "PM2 pode não estar funcionando. Verificando logs..."
    pm2 logs --lines 20
fi

# 10. TESTE FINAL DE CONECTIVIDADE
log_info "Executando teste final de conectividade..."
sleep 10

# Testar frontend
log_info "Testando frontend: $FRONTEND_URL"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    log_success "✅ Frontend acessível!"
else
    log_error "❌ Frontend não acessível. Código: $FRONTEND_RESPONSE"
fi

# Testar API
log_info "Testando API: $API_URL/health"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "404" ]; then
    log_success "✅ API acessível!"
else
    log_error "❌ API não acessível. Código: $API_RESPONSE"
fi

# 11. VERIFICAR SE AINDA HÁ URLs HTTPS NOS ARQUIVOS
log_info "Verificando se ainda há URLs HTTPS nos arquivos..."
if [ -d "$APP_DIR/dist" ]; then
    HTTPS_COUNT=$(grep -r "https://" "$APP_DIR/dist" | wc -l || echo "0")
    if [ "$HTTPS_COUNT" -eq 0 ]; then
        log_success "✅ Nenhuma URL HTTPS encontrada nos arquivos!"
    else
        log_warning "⚠️  Ainda há $HTTPS_COUNT URLs HTTPS nos arquivos:"
        grep -r "https://" "$APP_DIR/dist" | head -5
    fi
fi

# 12. RESUMO FINAL
log_header "RESUMO DA CORREÇÃO DE EMERGÊNCIA:"
log_info "Domínio: $DOMAIN"
log_info "Frontend: $FRONTEND_URL"
log_info "API: $API_URL"
log_info "Nginx: $(systemctl is-active nginx)"
log_info "PM2: $PM2_STATUS processos online"
log_info "Frontend Response: $FRONTEND_RESPONSE"
log_info "API Response: $API_RESPONSE"

if [ "$FRONTEND_RESPONSE" = "200" ] && [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "404" ]; then
    log_success "🎉 CORREÇÃO DE EMERGÊNCIA CONCLUÍDA COM SUCESSO!"
    log_info "Agora você deve conseguir acessar o sistema sem erros de HTTPS!"
    log_info "Lembre-se de limpar o cache do navegador (Ctrl+Shift+R)!"
else
    log_warning "⚠️  Alguns problemas persistem. Verifique os logs acima."
    log_info "Tente executar o script novamente ou verifique os logs do PM2:"
    log_info "pm2 logs"
fi

log_success "Correção de emergência finalizada!"
