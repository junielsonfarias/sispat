#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO - PROBLEMAS DE CONEXÃO BACKEND
# Corrige problemas de 502 Bad Gateway e ERR_CONNECTION_REFUSED
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

# Função para diagnosticar problemas
diagnose_issues() {
    log_header "Diagnosticando problemas de conexão..."
    
    # Verificar status do PM2
    log_info "Verificando status do PM2..."
    pm2 status
    
    # Verificar se o backend está rodando
    log_info "Verificando se o backend está rodando na porta 3001..."
    if netstat -tlnp | grep -q ":3001"; then
        log_success "Backend está rodando na porta 3001"
        netstat -tlnp | grep ":3001"
    else
        log_error "Backend NÃO está rodando na porta 3001"
    fi
    
    # Verificar logs do PM2
    log_info "Verificando logs do PM2..."
    pm2 logs --lines 20
    
    # Verificar status do Nginx
    log_info "Verificando status do Nginx..."
    systemctl status nginx --no-pager
    
    # Verificar configuração do Nginx
    log_info "Verificando configuração do Nginx..."
    nginx -t
    
    # Verificar se o Nginx está escutando na porta 80
    log_info "Verificando se o Nginx está escutando na porta 80..."
    if netstat -tlnp | grep -q ":80"; then
        log_success "Nginx está escutando na porta 80"
        netstat -tlnp | grep ":80"
    else
        log_error "Nginx NÃO está escutando na porta 80"
    fi
    
    # Testar conectividade local
    log_info "Testando conectividade local..."
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "Backend responde localmente"
    else
        log_error "Backend NÃO responde localmente"
    fi
    
    if curl -f -s http://localhost > /dev/null 2>&1; then
        log_success "Nginx responde localmente"
    else
        log_error "Nginx NÃO responde localmente"
    fi
}

# Função para corrigir problemas do PM2
fix_pm2_issues() {
    log_header "Corrigindo problemas do PM2..."
    
    cd /var/www/sispat
    
    # Parar todos os processos
    log_info "Parando todos os processos PM2..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Verificar se o arquivo de configuração existe
    if [ ! -f "ecosystem.production.config.cjs" ]; then
        log_error "Arquivo ecosystem.production.config.cjs não encontrado!"
        log_info "Criando configuração básica do PM2..."
        
        cat > ecosystem.production.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'sispat-backend',
    script: 'server/index.js',
    cwd: '/var/www/sispat',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
  }]
};
EOF
    fi
    
    # Criar diretório de logs se não existir
    mkdir -p logs
    
    # Iniciar aplicação
    log_info "Iniciando aplicação com PM2..."
    pm2 start ecosystem.production.config.cjs --env production
    
    # Aguardar inicialização
    log_info "Aguardando inicialização do backend..."
    sleep 10
    
    # Verificar se está rodando
    if pm2 list | grep -q "sispat-backend.*online"; then
        log_success "Backend iniciado com sucesso!"
    else
        log_error "Falha ao iniciar backend!"
        log_info "Logs do PM2:"
        pm2 logs --lines 20
        return 1
    fi
    
    # Salvar configuração
    pm2 save
    
    log_success "PM2 configurado e funcionando!"
}

# Função para corrigir problemas do Nginx
fix_nginx_issues() {
    log_header "Corrigindo problemas do Nginx..."
    
    # Backup da configuração atual
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    
    # Criar configuração limpa do Nginx
    log_info "Criando configuração limpa do Nginx..."
    
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
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
    
    # Arquivos estáticos
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
    log_info "Testando configuração do Nginx..."
    if nginx -t; then
        log_success "Configuração do Nginx está válida!"
    else
        log_error "Configuração do Nginx inválida!"
        return 1
    fi
    
    # Recarregar Nginx
    log_info "Recarregando Nginx..."
    systemctl reload nginx
    
    # Verificar status
    if systemctl is-active --quiet nginx; then
        log_success "Nginx está rodando!"
    else
        log_error "Nginx não está rodando!"
        systemctl start nginx
    fi
    
    log_success "Nginx configurado e funcionando!"
}

# Função para verificar banco de dados
check_database() {
    log_header "Verificando banco de dados..."
    
    # Verificar se PostgreSQL está rodando
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL está rodando!"
    else
        log_error "PostgreSQL não está rodando!"
        log_info "Iniciando PostgreSQL..."
        systemctl start postgresql
    fi
    
    # Testar conexão com banco
    log_info "Testando conexão com banco de dados..."
    if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Conexão com banco de dados OK!"
    else
        log_error "Problema na conexão com banco de dados!"
        log_info "Verificando logs do PostgreSQL..."
        tail -20 /var/log/postgresql/postgresql-*.log
    fi
}

# Função para testar API
test_api() {
    log_header "Testando API..."
    
    # Aguardar backend inicializar
    log_info "Aguardando backend inicializar..."
    sleep 5
    
    # Testar health check
    log_info "Testando health check..."
    if curl -f -s http://localhost:3001/api/health; then
        log_success "Health check OK!"
    else
        log_error "Health check falhou!"
    fi
    
    # Testar endpoint público
    log_info "Testando endpoint público..."
    if curl -f -s http://localhost:3001/api/municipalities/public; then
        log_success "Endpoint público OK!"
    else
        log_warning "Endpoint público pode ter problemas"
    fi
    
    # Testar através do Nginx
    log_info "Testando através do Nginx..."
    if curl -f -s http://localhost/api/health; then
        log_success "API através do Nginx OK!"
    else
        log_error "API através do Nginx falhou!"
    fi
}

# Função para mostrar status final
show_final_status() {
    log_header "Status Final"
    
    echo -e "\n${GREEN}📊 STATUS DOS SERVIÇOS:${NC}"
    
    # PM2
    if pm2 list | grep -q "sispat-backend.*online"; then
        echo -e "✅ PM2: ${GREEN}Backend rodando${NC}"
    else
        echo -e "❌ PM2: ${RED}Backend não está rodando${NC}"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        echo -e "✅ Nginx: ${GREEN}Rodando${NC}"
    else
        echo -e "❌ Nginx: ${RED}Não está rodando${NC}"
    fi
    
    # PostgreSQL
    if systemctl is-active --quiet postgresql; then
        echo -e "✅ PostgreSQL: ${GREEN}Rodando${NC}"
    else
        echo -e "❌ PostgreSQL: ${RED}Não está rodando${NC}"
    fi
    
    # Teste de conectividade
    echo -e "\n${GREEN}🌐 TESTES DE CONECTIVIDADE:${NC}"
    
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "✅ Backend local: ${GREEN}OK${NC}"
    else
        echo -e "❌ Backend local: ${RED}Falhou${NC}"
    fi
    
    if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
        echo -e "✅ API via Nginx: ${GREEN}OK${NC}"
    else
        echo -e "❌ API via Nginx: ${RED}Falhou${NC}"
    fi
    
    echo -e "\n${BLUE}📋 COMANDOS ÚTEIS:${NC}"
    echo -e "📊 Status PM2: ${YELLOW}pm2 status${NC}"
    echo -e "📝 Logs PM2: ${YELLOW}pm2 logs${NC}"
    echo -e "🔄 Reiniciar: ${YELLOW}pm2 restart all${NC}"
    echo -e "🌐 Teste API: ${YELLOW}curl http://localhost/api/health${NC}"
}

# Função principal
main() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🔧 CORREÇÃO DE PROBLEMAS DE CONEXÃO                ║"
    echo "║                                                              ║"
    echo "║              Backend 502 Bad Gateway / Connection Refused    ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Verificações iniciais
    check_root
    
    # Executar diagnóstico
    diagnose_issues
    
    echo -e "\n${YELLOW}⚠️  Pressione Enter para continuar com as correções...${NC}"
    read -r
    
    # Aplicar correções
    fix_pm2_issues
    fix_nginx_issues
    check_database
    test_api
    
    # Mostrar status final
    show_final_status
    
    echo -e "\n${GREEN}🎉 Correções aplicadas!${NC}"
    echo -e "${YELLOW}Teste a aplicação no navegador agora.${NC}"
}

# Executar função principal
main "$@"
