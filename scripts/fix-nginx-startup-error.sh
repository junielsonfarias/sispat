#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - ERRO DE INICIALIZAÇÃO DO NGINX
# Corrige problemas comuns que impedem o Nginx de iniciar
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

log_header "CORREÇÃO DE ERRO DE INICIALIZAÇÃO DO NGINX"

# 1. Parar Nginx se estiver rodando
log_info "Parando Nginx..."
systemctl stop nginx 2>/dev/null || true

# 2. Verificar logs de erro
log_info "Verificando logs de erro do Nginx..."
if [ -f "/var/log/nginx/error.log" ]; then
    log_info "Últimas linhas do log de erro:"
    tail -20 /var/log/nginx/error.log
fi

# 3. Verificar configuração do Nginx
log_info "Testando configuração do Nginx..."
if nginx -t 2>&1; then
    log_success "Configuração do Nginx está OK!"
else
    log_warning "Problemas na configuração do Nginx detectados!"
    
    # 4. Verificar se há conflitos de porta
    log_info "Verificando conflitos de porta..."
    if netstat -tlnp | grep :80; then
        log_warning "Porta 80 está em uso por outro processo!"
        log_info "Processos usando porta 80:"
        netstat -tlnp | grep :80
    fi
    
    # 5. Verificar se Apache está rodando (conflito comum)
    log_info "Verificando se Apache está rodando..."
    if systemctl is-active --quiet apache2; then
        log_warning "Apache está rodando! Parando para evitar conflito..."
        systemctl stop apache2
        systemctl disable apache2
    fi
    
    # 6. Limpar configurações problemáticas
    log_info "Limpando configurações problemáticas..."
    
    # Remover sites habilitados problemáticos
    rm -f /etc/nginx/sites-enabled/*
    
    # Criar configuração básica limpa
    log_info "Criando configuração básica do Nginx..."
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name _;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
    
    # Habilitar site padrão
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    
    # 7. Verificar se limit_req_zone está no lugar certo
    log_info "Verificando configuração de rate limiting..."
    if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
        log_info "Adicionando limit_req_zone ao nginx.conf..."
        cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        sed -i '/http {/a\    # Rate limiting zones\n    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
    fi
    
    # 8. Testar configuração novamente
    log_info "Testando configuração após correções..."
    if nginx -t; then
        log_success "Configuração corrigida com sucesso!"
    else
        log_error "Ainda há problemas na configuração!"
        log_info "Logs de erro:"
        nginx -t 2>&1 || true
        exit 1
    fi
fi

# 9. Verificar permissões
log_info "Verificando permissões..."
chown -R www-data:www-data /var/www/html 2>/dev/null || true
chmod -R 755 /var/www/html 2>/dev/null || true

# 10. Criar página de teste se não existir
if [ ! -f "/var/www/html/index.html" ]; then
    log_info "Criando página de teste..."
    cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Nginx Test</title>
</head>
<body>
    <h1>Nginx está funcionando!</h1>
    <p>Se você está vendo esta página, o Nginx foi configurado corretamente.</p>
</body>
</html>
EOF
fi

# 11. Tentar iniciar Nginx
log_info "Tentando iniciar Nginx..."
if systemctl start nginx; then
    log_success "Nginx iniciado com sucesso!"
    
    # Verificar se está rodando
    if systemctl is-active --quiet nginx; then
        log_success "Nginx está rodando corretamente!"
        
        # Testar acesso
        log_info "Testando acesso ao Nginx..."
        if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
            log_success "Nginx respondendo corretamente!"
        else
            log_warning "Nginx não está respondendo corretamente"
        fi
    else
        log_error "Nginx não está rodando após tentativa de inicialização!"
        systemctl status nginx
        exit 1
    fi
else
    log_error "Falha ao iniciar Nginx!"
    log_info "Status do serviço:"
    systemctl status nginx
    log_info "Logs de erro:"
    journalctl -u nginx --no-pager -l
    exit 1
fi

# 12. Habilitar Nginx para inicializar no boot
log_info "Habilitando Nginx para inicializar no boot..."
systemctl enable nginx

log_success "Correção do Nginx concluída com sucesso!"
log_info "Nginx está funcionando e configurado para inicializar automaticamente."

# Mostrar informações finais
echo -e "\n${GREEN}📋 INFORMAÇÕES DO NGINX:${NC}"
echo -e "• Status: ${GREEN}$(systemctl is-active nginx)${NC}"
echo -e "• Configuração: ${GREEN}$(nginx -t 2>&1 | head -1)${NC}"
echo -e "• Porta: ${GREEN}80${NC}"
echo -e "• Teste: ${GREEN}curl http://localhost${NC}"

echo -e "\n${BLUE}🔧 Próximos passos:${NC}"
echo -e "• O Nginx está funcionando com configuração básica"
echo -e "• A configuração do SISPAT será aplicada na próxima etapa"
echo -e "• Se houver problemas, execute: ${YELLOW}systemctl status nginx${NC}"
