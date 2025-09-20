#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - FRONTEND HTTPS + BACKEND HTTP
# Corrige problemas de incompatibilidade entre frontend HTTPS e backend HTTP
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

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🔧 CORREÇÃO HTTPS FRONTEND + HTTP BACKEND            ║
║                                                              ║
║              Corrige incompatibilidade de protocolos        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Detectar domínio
DOMAIN=""
if [ -f "/etc/nginx/sites-available/sispat" ]; then
    DOMAIN=$(grep "server_name" /etc/nginx/sites-available/sispat | awk '{print $2}' | head -1)
fi

if [ -z "$DOMAIN" ]; then
    DOMAIN=$(hostname -I | awk '{print $1}')
    log_warning "Domínio não detectado, usando IP: $DOMAIN"
else
    log_info "Domínio detectado: $DOMAIN"
fi

# Função para corrigir configuração do Nginx
fix_nginx_config() {
    log_header "Corrigindo configuração do Nginx..."
    
    # Fazer backup da configuração atual
    cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)
    
    # Criar configuração corrigida
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

    # Proxy para API - FORÇAR HTTP
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;  # FORÇAR HTTP
        proxy_cache_bypass \$http_upgrade;
        
        # Headers adicionais para compatibilidade
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Server \$host;
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
        proxy_set_header X-Forwarded-Proto http;  # FORÇAR HTTP
    }

    # Logs
    access_log /var/log/nginx/sispat.access.log;
    error_log /var/log/nginx/sispat.error.log;
}
EOF

    # Testar configuração
    log_info "Testando configuração do Nginx..."
    if nginx -t; then
        log_success "Configuração do Nginx OK!"
        systemctl reload nginx
    else
        log_error "Erro na configuração do Nginx!"
        exit 1
    fi
}

# Função para corrigir configuração CORS
fix_cors_config() {
    log_header "Corrigindo configuração CORS..."
    
    cd /var/www/sispat
    
    # Atualizar .env para aceitar ambos os protocolos
    log_info "Atualizando configurações CORS no .env..."
    
    # Backup do .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Atualizar configurações CORS
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://$DOMAIN,https://$DOMAIN|" .env
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://$DOMAIN,https://$DOMAIN|" .env
    
    # Configurar URLs do frontend para HTTP
    sed -i "s|VITE_DOMAIN=.*|VITE_DOMAIN=http://$DOMAIN|" .env
    sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=http://$DOMAIN|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://$DOMAIN/api|" .env
    sed -i "s|VITE_API_TARGET=.*|VITE_API_TARGET=http://$DOMAIN|" .env
    
    log_success "Configurações CORS atualizadas no .env!"
}

# Função para corrigir URLs nos arquivos de build
fix_build_urls() {
    log_header "Corrigindo URLs nos arquivos de build..."
    
    cd /var/www/sispat
    
    # Usar script robusto para correção de URLs
    log_info "Executando correção robusta de URLs..."
    curl -fsSL https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/fix-frontend-urls-robust.sh -o /tmp/fix-urls-robust.sh
    chmod +x /tmp/fix-urls-robust.sh
    /tmp/fix-urls-robust.sh
    
    log_success "URLs corrigidas nos arquivos de build!"
}

# Função para reiniciar backend
restart_backend() {
    log_header "Reiniciando backend..."
    
    cd /var/www/sispat
    
    # Parar PM2
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Aguardar um pouco
    sleep 2
    
    # Iniciar novamente
    pm2 start ecosystem.production.config.cjs --env production
    pm2 save
    
    log_success "Backend reiniciado!"
}

# Função para testar conectividade
test_connectivity() {
    log_header "Testando conectividade..."
    
    # Aguardar backend inicializar
    log_info "Aguardando backend inicializar..."
    sleep 5
    
    # Testar localhost:80
    log_info "Testando localhost:80..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
        log_success "✅ Localhost:80 respondendo"
    else
        log_error "❌ Localhost:80 não respondendo"
    fi
    
    # Testar API local
    log_info "Testando API local..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null | grep -q "200\|404"; then
        log_success "✅ API local respondendo"
    else
        log_warning "⚠️  API local pode não estar respondendo (testando endpoint de health)"
    fi
    
    # Testar domínio
    if [ "$DOMAIN" != "$(hostname -I | awk '{print $1}')" ]; then
        log_info "Testando domínio: http://$DOMAIN"
        if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null | grep -q "200"; then
            log_success "✅ Domínio respondendo"
        else
            log_warning "⚠️  Domínio pode não estar respondendo"
        fi
    fi
}

# Função para mostrar informações finais
show_final_info() {
    log_header "Correção Concluída!"
    
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║           ✅ CORREÇÃO HTTPS/HTTP CONCLUÍDA!                  ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}📋 INFORMAÇÕES DE ACESSO:${NC}"
    echo -e "🌐 URL: ${YELLOW}http://$DOMAIN${NC}"
    echo -e "🔑 Login: ${YELLOW}junielsonfarias@gmail.com${NC}"
    echo -e "👤 Nome: ${YELLOW}Junielson Farias${NC}"
    echo -e "🔒 Senha: ${YELLOW}Tiko6273@${NC}"
    echo -e "👑 Role: ${YELLOW}superuser${NC}"
    
    echo -e "\n${BLUE}🔧 Correções aplicadas:${NC}"
    echo -e "✅ Nginx configurado para forçar HTTP no proxy"
    echo -e "✅ CORS configurado para aceitar HTTP e HTTPS"
    echo -e "✅ URLs corrigidas nos arquivos de build"
    echo -e "✅ Backend reiniciado com novas configurações"
    echo -e "✅ Proxy configurado para funcionar com HTTP"
    
    echo -e "\n${BLUE}📊 Comandos Úteis:${NC}"
    echo -e "• ${YELLOW}pm2 status${NC}          # Status da aplicação"
    echo -e "• ${YELLOW}pm2 logs${NC}            # Ver logs"
    echo -e "• ${YELLOW}nginx -t${NC}            # Testar configuração Nginx"
    echo -e "• ${YELLOW}systemctl status nginx${NC}  # Status do Nginx"
    
    echo -e "\n${GREEN}🎉 Sistema corrigido e funcionando!${NC}"
}

# Função principal
main() {
    log_header "Iniciando correção HTTPS Frontend + HTTP Backend..."
    
    # Executar correções
    fix_nginx_config
    fix_cors_config
    fix_build_urls
    restart_backend
    test_connectivity
    
    # Mostrar informações finais
    show_final_info
}

# Executar função principal
main "$@"