#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - ERRO DE INICIALIZAÇÃO DO NGINX
# Corrige problemas de startup do Nginx durante instalação
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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
    echo -e "\n${PURPLE}🚀 $1${NC}"
}

# Função para verificar se está rodando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root!"
        log_info "Execute: sudo su -"
        exit 1
    fi
}

# Função para diagnosticar problemas do Nginx
diagnose_nginx() {
    log_header "Diagnosticando problemas do Nginx..."
    
    # Verificar status do Nginx
    log_info "Verificando status do Nginx..."
    systemctl status nginx --no-pager || true
    
    # Verificar logs do Nginx
    log_info "Verificando logs do Nginx..."
    journalctl -u nginx --no-pager -n 20 || true
    
    # Verificar se há processos usando a porta 80
    log_info "Verificando processos na porta 80..."
    if netstat -tlnp | grep -q ":80"; then
        log_warning "Porta 80 está em uso:"
        netstat -tlnp | grep ":80"
    else
        log_success "Porta 80 está livre"
    fi
    
    # Verificar configuração do Nginx
    log_info "Testando configuração do Nginx..."
    if nginx -t 2>&1; then
        log_success "Configuração do Nginx está válida"
    else
        log_error "Configuração do Nginx inválida!"
        return 1
    fi
}

# Função para parar serviços conflitantes
stop_conflicting_services() {
    log_header "Parando serviços conflitantes..."
    
    # Parar Apache se estiver rodando
    if systemctl is-active --quiet apache2; then
        log_info "Parando Apache..."
        systemctl stop apache2
        systemctl disable apache2
        log_success "Apache parado"
    fi
    
    # Parar outros serviços que podem usar porta 80
    for service in httpd lighttpd; do
        if systemctl is-active --quiet $service; then
            log_info "Parando $service..."
            systemctl stop $service
            systemctl disable $service
            log_success "$service parado"
        fi
    done
}

# Função para limpar configurações problemáticas
clean_nginx_config() {
    log_header "Limpando configurações do Nginx..."
    
    # Parar Nginx
    log_info "Parando Nginx..."
    systemctl stop nginx 2>/dev/null || true
    
    # Backup das configurações existentes
    log_info "Fazendo backup das configurações..."
    mkdir -p /etc/nginx/backup
    cp -r /etc/nginx/sites-available/* /etc/nginx/backup/ 2>/dev/null || true
    cp -r /etc/nginx/sites-enabled/* /etc/nginx/backup/ 2>/dev/null || true
    
    # Remover configurações problemáticas
    log_info "Removendo configurações problemáticas..."
    rm -f /etc/nginx/sites-enabled/default
    rm -f /etc/nginx/sites-available/default
    
    # Limpar logs
    log_info "Limpando logs do Nginx..."
    rm -f /var/log/nginx/*.log
    touch /var/log/nginx/access.log
    touch /var/log/nginx/error.log
    chown www-data:www-data /var/log/nginx/*.log
}

# Função para criar configuração limpa do Nginx
create_clean_nginx_config() {
    log_header "Criando configuração limpa do Nginx..."
    
    # Criar configuração básica
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    
    server_name _;
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Página inicial temporária
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Habilitar site
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    
    # Remover site padrão se existir
    rm -f /etc/nginx/sites-enabled/default.bak
    
    log_success "Configuração básica do Nginx criada"
}

# Função para testar e iniciar Nginx
test_and_start_nginx() {
    log_header "Testando e iniciando Nginx..."
    
    # Testar configuração
    log_info "Testando configuração do Nginx..."
    if nginx -t; then
        log_success "Configuração do Nginx está válida!"
    else
        log_error "Configuração do Nginx ainda inválida!"
        return 1
    fi
    
    # Iniciar Nginx
    log_info "Iniciando Nginx..."
    systemctl start nginx
    
    # Aguardar inicialização
    sleep 3
    
    # Verificar se está rodando
    if systemctl is-active --quiet nginx; then
        log_success "Nginx está rodando!"
    else
        log_error "Nginx não conseguiu iniciar!"
        log_info "Logs do Nginx:"
        journalctl -u nginx --no-pager -n 10
        return 1
    fi
    
    # Habilitar para iniciar automaticamente
    systemctl enable nginx
    log_success "Nginx configurado para iniciar automaticamente"
}

# Função para testar conectividade
test_connectivity() {
    log_header "Testando conectividade..."
    
    # Testar localmente
    log_info "Testando Nginx localmente..."
    if curl -f -s http://localhost/health; then
        log_success "Nginx responde localmente!"
    else
        log_error "Nginx não responde localmente!"
        return 1
    fi
    
    # Verificar porta 80
    log_info "Verificando porta 80..."
    if netstat -tlnp | grep -q ":80.*nginx"; then
        log_success "Nginx está escutando na porta 80"
    else
        log_error "Nginx não está escutando na porta 80"
        return 1
    fi
}

# Função para configurar Nginx para SISPAT
configure_nginx_for_sispat() {
    log_header "Configurando Nginx para SISPAT..."
    
    # Verificar se o diretório do SISPAT existe
    if [ ! -d "/var/www/sispat" ]; then
        log_warning "Diretório /var/www/sispat não existe, criando configuração básica"
        return 0
    fi
    
    # Backup da configuração atual
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    
    # Criar configuração para SISPAT
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
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
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
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
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Arquivos estáticos do SISPAT
    location / {
        root /var/www/sispat/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Testar configuração
    if nginx -t; then
        log_success "Configuração do SISPAT criada com sucesso!"
        systemctl reload nginx
    else
        log_error "Configuração do SISPAT inválida!"
        # Restaurar configuração básica
        cp /etc/nginx/sites-available/default.backup.* /etc/nginx/sites-available/default
        nginx -t && systemctl reload nginx
    fi
}

# Função para mostrar status final
show_final_status() {
    log_header "Status Final do Nginx"
    
    echo -e "\n${GREEN}📊 STATUS DO NGINX:${NC}"
    
    if systemctl is-active --quiet nginx; then
        echo -e "✅ Nginx: ${GREEN}Rodando${NC}"
    else
        echo -e "❌ Nginx: ${RED}Não está rodando${NC}"
    fi
    
    if systemctl is-enabled --quiet nginx; then
        echo -e "✅ Auto-start: ${GREEN}Habilitado${NC}"
    else
        echo -e "❌ Auto-start: ${RED}Desabilitado${NC}"
    fi
    
    # Teste de conectividade
    echo -e "\n${GREEN}🌐 TESTES DE CONECTIVIDADE:${NC}"
    
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        echo -e "✅ Health check: ${GREEN}OK${NC}"
    else
        echo -e "❌ Health check: ${RED}Falhou${NC}"
    fi
    
    if netstat -tlnp | grep -q ":80.*nginx"; then
        echo -e "✅ Porta 80: ${GREEN}Nginx escutando${NC}"
    else
        echo -e "❌ Porta 80: ${RED}Nginx não está escutando${NC}"
    fi
    
    echo -e "\n${BLUE}📋 COMANDOS ÚTEIS:${NC}"
    echo -e "📊 Status: ${YELLOW}systemctl status nginx${NC}"
    echo -e "📝 Logs: ${YELLOW}journalctl -u nginx -f${NC}"
    echo -e "🔄 Reiniciar: ${YELLOW}systemctl restart nginx${NC}"
    echo -e "🌐 Teste: ${YELLOW}curl http://localhost/health${NC}"
}

# Função principal
main() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🔧 CORREÇÃO DE ERRO DO NGINX                       ║"
    echo "║                                                              ║"
    echo "║              Corrige problemas de inicialização              ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Verificações iniciais
    check_root
    
    # Executar diagnóstico
    diagnose_nginx
    
    echo -e "\n${YELLOW}⚠️  Pressione Enter para continuar com as correções...${NC}"
    read -r
    
    # Aplicar correções
    stop_conflicting_services
    clean_nginx_config
    create_clean_nginx_config
    test_and_start_nginx
    test_connectivity
    
    # Configurar para SISPAT se o diretório existir
    if [ -d "/var/www/sispat" ]; then
        echo -e "\n${YELLOW}⚠️  Diretório SISPAT encontrado. Configurar para SISPAT? (y/n)${NC}"
        read -r CONFIGURE_SISPAT
        if [[ "$CONFIGURE_SISPAT" =~ ^[Yy]$ ]]; then
            configure_nginx_for_sispat
        fi
    fi
    
    # Mostrar status final
    show_final_status
    
    echo -e "\n${GREEN}🎉 Nginx corrigido com sucesso!${NC}"
    echo -e "${YELLOW}Você pode continuar com a instalação do SISPAT.${NC}"
}

# Executar função principal
main "$@"
