#!/bin/bash

# =============================================================================
# SCRIPT DE DIAGNÓSTICO - PROBLEMA HTTPS FORÇADO
# Verifica especificamente o problema de frontend tentando HTTPS
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

log_header "Iniciando diagnóstico específico do problema HTTPS..."

APP_DIR="/var/www/sispat"
NGINX_CONF="/etc/nginx/sites-available/sispat"

# 1. Verificar domínio configurado
log_info "Verificando domínio configurado..."
DOMAIN=$(grep "server_name" $NGINX_CONF | awk '{print $2}' | sed 's/;//')
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "_" ]; then
    DOMAIN=$(hostname -I | awk '{print $1}')
    log_warning "Domínio não encontrado no Nginx, usando IP da VPS: $DOMAIN"
else
    log_info "Domínio detectado: $DOMAIN"
fi

# 2. Verificar URLs HTTPS nos arquivos de build
log_header "Verificando URLs HTTPS nos arquivos de build..."
if [ -d "$APP_DIR/dist" ]; then
    cd "$APP_DIR"
    
    HTTPS_COUNT=$(grep -r "https://" dist | wc -l || echo "0")
    HTTPS_DOMAIN_COUNT=$(grep -r "https://$DOMAIN" dist | wc -l || echo "0")
    LOCALHOST_COUNT=$(grep -r "localhost" dist | wc -l || echo "0")
    
    log_info "URLs HTTPS encontradas: $HTTPS_COUNT"
    log_info "URLs HTTPS com domínio: $HTTPS_DOMAIN_COUNT"
    log_info "URLs localhost encontradas: $LOCALHOST_COUNT"
    
    if [ "$HTTPS_COUNT" -gt 0 ]; then
        log_error "❌ PROBLEMA ENCONTRADO: URLs HTTPS nos arquivos de build!"
        log_info "Primeiras 5 ocorrências:"
        grep -r "https://" dist | head -5
    else
        log_success "✅ Nenhuma URL HTTPS encontrada nos arquivos de build"
    fi
    
    if [ "$LOCALHOST_COUNT" -gt 0 ]; then
        log_warning "⚠️  URLs localhost encontradas nos arquivos de build!"
        log_info "Primeiras 5 ocorrências:"
        grep -r "localhost" dist | head -5
    else
        log_success "✅ Nenhuma URL localhost encontrada nos arquivos de build"
    fi
else
    log_error "❌ Diretório 'dist' não encontrado em $APP_DIR"
fi

# 3. Verificar configuração do Nginx
log_header "Verificando configuração do Nginx..."
if [ -f "$NGINX_CONF" ]; then
    log_info "Configuração do Nginx:"
    echo "----------------------------------------"
    cat "$NGINX_CONF"
    echo "----------------------------------------"
    
    # Verificar se está ouvindo na porta 80
    if grep -q "listen 80" "$NGINX_CONF"; then
        log_success "✅ Nginx configurado para ouvir na porta 80 (HTTP)"
    else
        log_error "❌ Nginx NÃO está configurado para ouvir na porta 80!"
    fi
    
    # Verificar se está forçando HTTP no proxy
    if grep -q "X-Forwarded-Proto http" "$NGINX_CONF"; then
        log_success "✅ Nginx configurado para forçar HTTP no proxy"
    else
        log_warning "⚠️  Nginx NÃO está forçando HTTP no proxy"
    fi
else
    log_error "❌ Arquivo de configuração do Nginx não encontrado!"
fi

# 4. Verificar status dos serviços
log_header "Verificando status dos serviços..."

# Nginx
if systemctl is-active --quiet nginx; then
    log_success "✅ Nginx está ativo"
else
    log_error "❌ Nginx NÃO está ativo"
fi

# PM2
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 status | grep -c "online" || echo "0")
    if [ "$PM2_STATUS" -gt 0 ]; then
        log_success "✅ PM2 está online com $PM2_STATUS processos"
        pm2 status
    else
        log_error "❌ PM2 NÃO está online"
    fi
else
    log_error "❌ PM2 não está instalado"
fi

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    log_success "✅ PostgreSQL está ativo"
else
    log_error "❌ PostgreSQL NÃO está ativo"
fi

# 5. Verificar conectividade da API
log_header "Verificando conectividade da API..."

# Testar localhost (backend direto)
log_info "Testando backend direto em localhost:3001..."
LOCAL_API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/health" || echo "000")
if [ "$LOCAL_API_RESPONSE" = "200" ] || [ "$LOCAL_API_RESPONSE" = "404" ]; then
    log_success "✅ Backend responde em localhost:3001"
else
    log_error "❌ Backend NÃO responde em localhost:3001. Código: $LOCAL_API_RESPONSE"
fi

# Testar através do Nginx (proxy)
log_info "Testando API através do Nginx..."
NGINX_API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/api/health" || echo "000")
if [ "$NGINX_API_RESPONSE" = "200" ] || [ "$NGINX_API_RESPONSE" = "404" ]; then
    log_success "✅ API acessível através do Nginx"
else
    log_error "❌ API NÃO acessível através do Nginx. Código: $NGINX_API_RESPONSE"
fi

# Testar HTTPS (que deve falhar)
log_info "Testando HTTPS (deve falhar)..."
HTTPS_API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" || echo "000")
if [ "$HTTPS_API_RESPONSE" = "000" ]; then
    log_success "✅ HTTPS falha corretamente (como esperado)"
else
    log_warning "⚠️  HTTPS respondeu com código $HTTPS_API_RESPONSE (pode indicar SSL configurado)"
fi

# 6. Verificar arquivo .env
log_header "Verificando arquivo .env..."
if [ -f "$APP_DIR/.env" ]; then
    log_info "Verificando URLs no arquivo .env..."
    
    HTTPS_ENV_COUNT=$(grep -c "https://" "$APP_DIR/.env" || echo "0")
    LOCALHOST_ENV_COUNT=$(grep -c "localhost" "$APP_DIR/.env" || echo "0")
    
    log_info "URLs HTTPS no .env: $HTTPS_ENV_COUNT"
    log_info "URLs localhost no .env: $LOCALHOST_ENV_COUNT"
    
    if [ "$HTTPS_ENV_COUNT" -gt 0 ]; then
        log_error "❌ PROBLEMA ENCONTRADO: URLs HTTPS no arquivo .env!"
        grep "https://" "$APP_DIR/.env"
    else
        log_success "✅ Nenhuma URL HTTPS no arquivo .env"
    fi
    
    if [ "$LOCALHOST_ENV_COUNT" -gt 0 ]; then
        log_warning "⚠️  URLs localhost no arquivo .env:"
        grep "localhost" "$APP_DIR/.env"
    else
        log_success "✅ Nenhuma URL localhost no arquivo .env"
    fi
else
    log_error "❌ Arquivo .env não encontrado!"
fi

# 7. Verificar logs do PM2
log_header "Verificando logs recentes do PM2..."
if command -v pm2 &> /dev/null; then
    log_info "Últimas 10 linhas dos logs do PM2:"
    pm2 logs --lines 10
else
    log_warning "PM2 não disponível para verificar logs"
fi

# 8. Verificar logs do Nginx
log_header "Verificando logs recentes do Nginx..."
if [ -f "/var/log/nginx/sispat.error.log" ]; then
    log_info "Últimas 10 linhas dos logs de erro do Nginx:"
    tail -10 /var/log/nginx/sispat.error.log
else
    log_warning "Logs de erro do Nginx não encontrados"
fi

# 9. Resumo do diagnóstico
log_header "RESUMO DO DIAGNÓSTICO:"

echo -e "\n${YELLOW}🔍 PROBLEMAS IDENTIFICADOS:${NC}"
if [ "$HTTPS_COUNT" -gt 0 ]; then
    echo -e "❌ URLs HTTPS nos arquivos de build: $HTTPS_COUNT"
fi
if [ "$LOCALHOST_COUNT" -gt 0 ]; then
    echo -e "❌ URLs localhost nos arquivos de build: $LOCALHOST_COUNT"
fi
if [ "$HTTPS_ENV_COUNT" -gt 0 ]; then
    echo -e "❌ URLs HTTPS no arquivo .env: $HTTPS_ENV_COUNT"
fi
if [ "$LOCALHOST_ENV_COUNT" -gt 0 ]; then
    echo -e "❌ URLs localhost no arquivo .env: $LOCALHOST_ENV_COUNT"
fi
if [ "$LOCAL_API_RESPONSE" != "200" ] && [ "$LOCAL_API_RESPONSE" != "404" ]; then
    echo -e "❌ Backend não responde em localhost:3001"
fi
if [ "$NGINX_API_RESPONSE" != "200" ] && [ "$NGINX_API_RESPONSE" != "404" ]; then
    echo -e "❌ API não acessível através do Nginx"
fi

echo -e "\n${GREEN}✅ STATUS DOS SERVIÇOS:${NC}"
echo -e "Nginx: $(systemctl is-active nginx)"
echo -e "PM2: $PM2_STATUS processos online"
echo -e "PostgreSQL: $(systemctl is-active postgresql)"
echo -e "Backend localhost: $LOCAL_API_RESPONSE"
echo -e "API via Nginx: $NGINX_API_RESPONSE"

echo -e "\n${BLUE}🔧 SOLUÇÕES RECOMENDADAS:${NC}"
if [ "$HTTPS_COUNT" -gt 0 ] || [ "$LOCALHOST_COUNT" -gt 0 ] || [ "$HTTPS_ENV_COUNT" -gt 0 ] || [ "$LOCALHOST_ENV_COUNT" -gt 0 ]; then
    echo -e "1. Execute o script de correção de emergência:"
    echo -e "   curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-https-emergency.sh -o fix-https.sh"
    echo -e "   chmod +x fix-https.sh"
    echo -e "   ./fix-https.sh"
fi
if [ "$LOCAL_API_RESPONSE" != "200" ] && [ "$LOCAL_API_RESPONSE" != "404" ]; then
    echo -e "2. Reinicie o PM2: pm2 restart all"
fi
if [ "$NGINX_API_RESPONSE" != "200" ] && [ "$NGINX_API_RESPONSE" != "404" ]; then
    echo -e "3. Reinicie o Nginx: systemctl restart nginx"
fi

log_success "Diagnóstico concluído!"
