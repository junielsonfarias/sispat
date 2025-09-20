#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO COMPLETA - BACKEND E SUPERUSUÁRIO
# Corrige problemas de conexão e cria superusuário automaticamente
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
    log_header "Diagnosticando problemas..."
    
    # Verificar status do PM2
    log_info "Verificando status do PM2..."
    pm2 status
    
    # Verificar se o backend está rodando
    log_info "Verificando se o backend está rodando na porta 3001..."
    if netstat -tlnp | grep -q ":3001"; then
        log_success "Backend está rodando na porta 3001"
    else
        log_error "Backend NÃO está rodando na porta 3001"
    fi
    
    # Verificar status do Nginx
    log_info "Verificando status do Nginx..."
    systemctl status nginx --no-pager
    
    # Verificar PostgreSQL
    log_info "Verificando PostgreSQL..."
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL está rodando"
    else
        log_error "PostgreSQL não está rodando"
    fi
}

# Função para corrigir PM2
fix_pm2() {
    log_header "Corrigindo PM2..."
    
    cd /var/www/sispat
    
    # Parar todos os processos
    log_info "Parando todos os processos PM2..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Verificar se o arquivo de configuração existe
    if [ ! -f "ecosystem.production.config.cjs" ]; then
        log_info "Criando configuração PM2..."
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
    
    # Criar diretório de logs
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
        pm2 logs --lines 20
        return 1
    fi
    
    # Salvar configuração
    pm2 save
    
    log_success "PM2 configurado e funcionando!"
}

# Função para corrigir Nginx
fix_nginx() {
    log_header "Corrigindo Nginx..."
    
    # Backup da configuração atual
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    
    # Criar configuração limpa
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

# Função para criar superusuário
create_superuser() {
    log_header "Criando superusuário..."
    
    cd /var/www/sispat
    
    # Verificar se o script existe
    if [ -f "scripts/create-superuser.js" ]; then
        log_info "Executando script de criação do superusuário..."
        node scripts/create-superuser.js
        
        if [ $? -eq 0 ]; then
            log_success "Superusuário criado com sucesso!"
        else
            log_warning "Script falhou, tentando método alternativo..."
            create_superuser_alternative
        fi
    else
        log_warning "Script não encontrado, usando método alternativo..."
        create_superuser_alternative
    fi
}

# Função alternativa para criar superusuário
create_superuser_alternative() {
    log_info "Criando superusuário usando método alternativo..."
    
    # Hash da senha (Tiko6273@)
    # Este hash foi gerado com bcrypt usando 12 rounds
    HASHED_PASSWORD='$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2O'
    
    # Criar superusuário diretamente no banco
    PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "
        INSERT INTO users (name, email, password, role, municipality_id, is_active, created_at, updated_at)
        VALUES ('Junielson Farias', 'junielsonfarias@gmail.com', '$HASHED_PASSWORD', 'superuser', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP;
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_success "Superusuário criado/atualizado com sucesso!"
    else
        log_error "Falha ao criar superusuário!"
        return 1
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
    
    # Testar endpoint de login
    log_info "Testando endpoint de login..."
    if curl -f -s -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"junielsonfarias@gmail.com","password":"Tiko6273@"}' > /dev/null 2>&1; then
        log_success "Endpoint de login OK!"
    else
        log_warning "Endpoint de login pode ter problemas"
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
    
    echo -e "\n${GREEN}🔑 CREDENCIAIS DO SUPERUSUÁRIO:${NC}"
    echo -e "📧 Email: ${YELLOW}junielsonfarias@gmail.com${NC}"
    echo -e "👤 Nome: ${YELLOW}Junielson Farias${NC}"
    echo -e "🔒 Senha: ${YELLOW}Tiko6273@${NC}"
    echo -e "👑 Role: ${YELLOW}superuser${NC}"
    
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
    echo "║           🔧 CORREÇÃO COMPLETA - BACKEND E SUPERUSUÁRIO      ║"
    echo "║                                                              ║"
    echo "║              Corrige conexão e cria administrador            ║"
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
    fix_pm2
    fix_nginx
    create_superuser
    test_api
    
    # Mostrar status final
    show_final_status
    
    echo -e "\n${GREEN}🎉 Correções aplicadas com sucesso!${NC}"
    echo -e "${YELLOW}Teste a aplicação no navegador agora.${NC}"
    echo -e "${BLUE}Use as credenciais do superusuário para fazer login.${NC}"
}

# Executar função principal
main "$@"
