#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - ERRO DE LIMIT_REQ_ZONE NO NGINX
# Corrige erro: "limit_req_zone" directive is not allowed here
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

# Função para diagnosticar o problema
diagnose_problem() {
    log_header "Diagnosticando problema do limit_req_zone..."
    
    log_info "Verificando configuração atual do Nginx..."
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        log_info "Conteúdo da configuração atual:"
        cat /etc/nginx/sites-enabled/default
    else
        log_warning "Arquivo de configuração não encontrado"
    fi
    
    log_info "Testando configuração atual..."
    if nginx -t 2>&1; then
        log_success "Configuração atual está válida"
        return 0
    else
        log_error "Configuração atual inválida (esperado)"
        return 1
    fi
}

# Função para corrigir a configuração do Nginx
fix_nginx_config() {
    log_header "Corrigindo configuração do Nginx..."
    
    # Parar Nginx
    log_info "Parando Nginx..."
    systemctl stop nginx 2>/dev/null || true
    
    # Backup da configuração atual
    log_info "Fazendo backup da configuração atual..."
    mkdir -p /etc/nginx/backup
    cp /etc/nginx/sites-available/default /etc/nginx/backup/default.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    cp /etc/nginx/sites-enabled/default /etc/nginx/backup/sites-enabled.default.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Remover configurações problemáticas
    log_info "Removendo configurações problemáticas..."
    rm -f /etc/nginx/sites-enabled/default
    rm -f /etc/nginx/sites-available/default
    
    # Verificar se o diretório SISPAT existe
    if [ -d "/var/www/sispat" ]; then
        log_info "Diretório SISPAT encontrado, criando configuração para SISPAT..."
        create_sispat_nginx_config
    else
        log_info "Criando configuração básica do Nginx..."
        create_basic_nginx_config
    fi
}

# Função para criar configuração básica do Nginx
create_basic_nginx_config() {
    log_info "Criando configuração básica do Nginx..."
    
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
    
    # Página inicial
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
    
    log_success "Configuração básica criada"
}

# Função para criar configuração do SISPAT
create_sispat_nginx_config() {
    log_info "Criando configuração do SISPAT..."
    
    # Primeiro, verificar se precisamos adicionar limit_req_zone no nginx.conf principal
    if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
        log_info "Adicionando limit_req_zone ao nginx.conf principal..."
        
        # Backup do nginx.conf
        cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        
        # Adicionar limit_req_zone no contexto http
        sed -i '/http {/a\    # Rate limiting zones\n    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
        
        log_success "limit_req_zone adicionado ao nginx.conf"
    else
        log_info "limit_req_zone já existe no nginx.conf"
    fi
    
    # Criar configuração do site
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting (usando a zona definida no nginx.conf)
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

    # Habilitar site
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    
    log_success "Configuração do SISPAT criada"
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
        log_info "Logs de erro:"
        nginx -t 2>&1 || true
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
    
    # Testar se é SISPAT
    if [ -d "/var/www/sispat" ]; then
        log_info "Testando se SISPAT está sendo servido..."
        if curl -f -s http://localhost/ | grep -q "SISPAT\|sispat"; then
            log_success "SISPAT está sendo servido!"
        else
            log_warning "SISPAT pode não estar sendo servido corretamente"
        fi
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
    
    # Verificar configuração
    echo -e "\n${GREEN}🔧 CONFIGURAÇÃO:${NC}"
    if nginx -t > /dev/null 2>&1; then
        echo -e "✅ Configuração: ${GREEN}Válida${NC}"
    else
        echo -e "❌ Configuração: ${RED}Inválida${NC}"
    fi
    
    echo -e "\n${BLUE}📋 COMANDOS ÚTEIS:${NC}"
    echo -e "📊 Status: ${YELLOW}systemctl status nginx${NC}"
    echo -e "📝 Logs: ${YELLOW}journalctl -u nginx -f${NC}"
    echo -e "🔄 Reiniciar: ${YELLOW}systemctl restart nginx${NC}"
    echo -e "🌐 Teste: ${YELLOW}curl http://localhost/health${NC}"
    echo -e "🔧 Teste config: ${YELLOW}nginx -t${NC}"
}

# Função principal
main() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🔧 CORREÇÃO DE LIMIT_REQ_ZONE - NGINX              ║"
    echo "║                                                              ║"
    echo "║              Corrige erro de configuração do Nginx            ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Verificações iniciais
    check_root
    
    # Executar diagnóstico
    diagnose_problem
    
    echo -e "\n${YELLOW}⚠️  Pressione Enter para continuar com as correções...${NC}"
    read -r
    
    # Aplicar correções
    fix_nginx_config
    test_and_start_nginx
    test_connectivity
    
    # Mostrar status final
    show_final_status
    
    echo -e "\n${GREEN}🎉 Nginx corrigido com sucesso!${NC}"
    echo -e "${YELLOW}Você pode continuar com a instalação do SISPAT.${NC}"
}

# Executar função principal
main "$@"
