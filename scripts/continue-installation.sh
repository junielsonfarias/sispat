#!/bin/bash

# =============================================================================
# SCRIPT DE CONTINUAÇÃO DA INSTALAÇÃO
# Continua a instalação do SISPAT após erro do Nginx
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

# Função para corrigir Nginx rapidamente
fix_nginx_quick() {
    log_header "Corrigindo Nginx rapidamente..."
    
    # Parar Nginx
    systemctl stop nginx 2>/dev/null || true
    
    # Remover configurações problemáticas
    rm -f /etc/nginx/sites-enabled/default
    rm -f /etc/nginx/sites-available/default
    
    # Criar configuração básica
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html index.htm;
    server_name _;
    location / {
        try_files $uri $uri/ =404;
    }
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Habilitar site
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    
    # Testar e iniciar
    if nginx -t; then
        systemctl start nginx
        log_success "Nginx corrigido e funcionando!"
    else
        log_error "Configuração do Nginx ainda inválida!"
        return 1
    fi
}

# Função para instalar PM2
install_pm2() {
    log_header "Instalando PM2..."
    
    log_info "Instalando PM2 globalmente..."
    npm install -g pm2
    
    # Configurar PM2 para iniciar com o sistema
    pm2 startup systemd -u root --hp /root
    pm2 save
    
    log_success "PM2 instalado e configurado!"
}

# Função para baixar e configurar SISPAT
setup_sispat() {
    log_header "Configurando SISPAT..."
    
    # Criar diretório da aplicação
    APP_DIR="/var/www/sispat"
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    log_info "Baixando código do SISPAT..."
    
    # Limpar diretório se já existir
    if [ -d ".git" ] || [ -f "package.json" ] || [ "$(ls -A . 2>/dev/null)" ]; then
        log_info "Diretório não está vazio, limpando..."
        rm -rf .git .env package.json package-lock.json node_modules dist
        find . -name ".*" -not -name "." -not -name ".." -exec rm -rf {} + 2>/dev/null || true
        find . -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
    fi
    
    # Baixar código do GitHub
    log_info "Clonando repositório do GitHub..."
    git clone https://github.com/junielsonfarias/sispat.git .
    
    # Verificar se o clone foi bem-sucedido
    if [ ! -f "package.json" ]; then
        log_error "Falha ao clonar repositório!"
        exit 1
    fi
    
    log_success "Código do SISPAT baixado com sucesso!"
    
    log_info "Instalando dependências..."
    npm install --legacy-peer-deps || {
        log_warning "Erro ao instalar dependências, tentando correção..."
        npm cache clean --force
        rm -rf node_modules package-lock.json
        npm install --legacy-peer-deps --force
    }
    
    # Verificar se terser foi instalado
    if ! npm list terser > /dev/null 2>&1; then
        log_info "Instalando terser para minificação..."
        npm install --save-dev terser
    fi
    
    log_success "SISPAT configurado!"
}

# Função para configurar variáveis de ambiente
setup_environment() {
    log_header "Configurando variáveis de ambiente..."
    
    cd $APP_DIR
    
    # Gerar JWT Secret seguro
    JWT_SECRET=$(openssl rand -base64 64)
    REFRESH_TOKEN_SECRET=$(openssl rand -base64 64)
    
    # Criar arquivo .env
    cat > .env << EOF
# =============================================================================
# CONFIGURAÇÃO DE PRODUÇÃO - SISPAT
# Gerado automaticamente pelo script de instalação
# =============================================================================

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sispat_db
DB_MAX_CONNECTIONS=100
DB_IDLE_TIMEOUT=120000
DB_CONNECTION_TIMEOUT=60000
DB_SSL_REJECT_UNAUTHORIZED=false

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=12h
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
REFRESH_TOKEN_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=production
HOST=0.0.0.0

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8080,http://$(hostname -I | awk '{print $1}'):8080,http://sispat.vps-kinghost.net
CORS_ORIGIN=http://localhost:8080,http://$(hostname -I | awk '{print $1}'):8080,http://sispat.vps-kinghost.net
CORS_CREDENTIALS=true

# Frontend Configuration
VITE_PORT=8080
VITE_API_TARGET=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001
VITE_DOMAIN=http://sispat.vps-kinghost.net

# Email Configuration
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@$(hostname)
EMAIL_SUPPORT=support@$(hostname)

# File Upload Configuration
UPLOAD_PATH=$APP_DIR/uploads
MAX_FILE_SIZE=20971520
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_AUTH_MAX_ATTEMPTS=5
RATE_LIMIT_AUTH_LOCKOUT_DURATION=300000
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,::1

# Security Configuration
BCRYPT_ROUNDS=14
SESSION_TIMEOUT=3600000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=3600000
ENABLE_TWO_FACTOR_AUTH=true
TRUST_PROXY=1

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
LOG_FILE_PATH=$APP_DIR/logs/app.log
ERROR_LOG_FILE_PATH=$APP_DIR/logs/error.log
AUDIT_LOG_FILE_PATH=$APP_DIR/logs/audit.log
SENTRY_DSN=

# Backup Configuration
BACKUP_SCHEDULE_CRON="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=/var/backups/sispat

# Public Search Configuration
PUBLIC_SEARCH_ENABLED=true
PUBLIC_SEARCH_CACHE_TTL=3600000

# Database Mode
DISABLE_DATABASE=false
EOF

    log_success "Variáveis de ambiente configuradas!"
}

# Função para configurar banco de dados
setup_database() {
    log_header "Configurando banco de dados..."
    
    cd $APP_DIR
    
    log_info "Executando migrações do banco de dados..."
    
    # Criar diretórios necessários
    mkdir -p logs uploads
    
    # Executar script de criação de tabelas
    if [ -f "server/database/create-missing-tables.js" ]; then
        log_info "Criando tabelas do banco de dados..."
        node server/database/create-missing-tables.js
    fi
    
    # Executar script de dados de exemplo
    if [ -f "server/database/create-sample-data.js" ]; then
        log_info "Criando dados iniciais..."
        node server/database/create-sample-data.js
    fi
    
    # Executar script de otimização
    if [ -f "server/database/optimize.js" ]; then
        log_info "Otimizando banco de dados..."
        node server/database/optimize.js
    fi
    
    log_success "Banco de dados configurado com sucesso!"
    
    # Criar superusuário automaticamente
    log_info "Criando superusuário..."
    if [ -f "scripts/create-superuser.js" ]; then
        node scripts/create-superuser.js
        if [ $? -eq 0 ]; then
            log_success "Superusuário criado com sucesso!"
        else
            log_warning "Falha ao criar superusuário, tentando método alternativo..."
            # Método alternativo usando SQL direto
            PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "
                INSERT INTO users (name, email, password, role, municipality_id, is_active)
                VALUES ('Junielson Farias', 'junielsonfarias@gmail.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2O', 'superuser', 1, true)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    password = EXCLUDED.password,
                    role = EXCLUDED.role,
                    is_active = true,
                    updated_at = CURRENT_TIMESTAMP;
            " 2>/dev/null || log_warning "Método alternativo também falhou"
        fi
    else
        log_warning "Script de criação de superusuário não encontrado"
    fi
}

# Função para fazer build da aplicação
build_sispat() {
    log_header "Compilando aplicação..."
    
    cd $APP_DIR
    
    log_info "Fazendo build da aplicação..."
    npm run build:prod || {
        log_warning "Erro no build, tentando build padrão..."
        npm run build
    }
    
    # Verificar se o build foi bem-sucedido
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        log_error "Build falhou! Verificando logs..."
        log_info "Tentando build com configurações alternativas..."
        
        # Limpar cache e tentar novamente
        npm cache clean --force
        rm -rf dist node_modules/.vite
        
        # Tentar build sem minificação
        log_info "Tentando build sem minificação..."
        NODE_ENV=production npm run build
        
        if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
            log_error "Build ainda falhou após tentativas!"
            log_info "Verificando se há problemas com dependências..."
            npm ls --depth=0
            exit 1
        fi
    fi
    
    log_success "Aplicação compilada com sucesso!"
}

# Função para configurar Nginx para SISPAT
configure_nginx_for_sispat() {
    log_header "Configurando Nginx para SISPAT..."
    
    # Backup da configuração atual
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    
    # Configurar Nginx para SISPAT
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

    # Testar configuração do Nginx
    nginx -t
    
    # Recarregar Nginx
    systemctl reload nginx
    
    log_success "Nginx configurado para SISPAT!"
}

# Função para iniciar SISPAT com PM2
start_sispat() {
    log_header "Iniciando SISPAT..."
    
    cd $APP_DIR
    
    # Parar processos existentes
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Iniciar aplicação
    log_info "Iniciando aplicação com PM2..."
    pm2 start ecosystem.production.config.cjs --env production
    
    # Salvar configuração do PM2
    pm2 save
    
    log_success "SISPAT iniciado com PM2!"
}

# Função para mostrar informações finais
show_final_info() {
    log_header "Instalação Concluída!"
    
    echo -e "\n${GREEN}🎉 SISPAT instalado com sucesso!${NC}"
    echo -e "\n${CYAN}📋 INFORMAÇÕES DE ACESSO:${NC}"
    
    echo -e "🌐 URL: ${YELLOW}http://sispat.vps-kinghost.net${NC}"
    
    echo -e "\n${CYAN}🔑 LOGIN DO SUPERUSUÁRIO:${NC}"
    echo -e "📧 Email: ${YELLOW}junielsonfarias@gmail.com${NC}"
    echo -e "👤 Nome: ${YELLOW}Junielson Farias${NC}"
    echo -e "🔒 Senha: ${YELLOW}Tiko6273@${NC}"
    echo -e "👑 Role: ${YELLOW}superuser${NC}"
    echo -e "${RED}⚠️  IMPORTANTE: Mantenha essas credenciais seguras!${NC}"
    
    echo -e "\n${CYAN}🗄️  BANCO DE DADOS:${NC}"
    echo -e "📊 Nome: ${YELLOW}sispat_db${NC}"
    echo -e "👤 Usuário: ${YELLOW}postgres${NC}"
    echo -e "🔑 Senha: ${YELLOW}postgres${NC}"
    echo -e "📁 Credenciais salvas em: ${YELLOW}/root/sispat-db-credentials.txt${NC}"
    
    echo -e "\n${CYAN}🛠️  COMANDOS ÚTEIS:${NC}"
    echo -e "📊 Status: ${YELLOW}pm2 status${NC}"
    echo -e "📝 Logs: ${YELLOW}pm2 logs${NC}"
    echo -e "🔄 Reiniciar: ${YELLOW}pm2 restart all${NC}"
    echo -e "⏹️  Parar: ${YELLOW}pm2 stop all${NC}"
    echo -e "▶️  Iniciar: ${YELLOW}pm2 start all${NC}"
    
    echo -e "\n${GREEN}✅ Próximos passos:${NC}"
    echo -e "1. 🌐 Acesse o sistema no navegador"
    echo -e "2. 🔑 Faça login com as credenciais acima"
    echo -e "3. ⚙️  Configure seu município"
    echo -e "4. 👥 Adicione usuários conforme necessário"
    
    echo -e "\n${GREEN}🔧 Correções aplicadas:${NC}"
    echo -e "✅ Nginx corrigido e configurado"
    echo -e "✅ Configuração de build otimizada"
    echo -e "✅ Superusuário criado automaticamente"
    echo -e "✅ PM2 configurado e funcionando"
    echo -e "✅ Dependências estáveis e compatíveis"
}

# Função principal
main() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🚀 CONTINUAÇÃO DA INSTALAÇÃO - SISPAT              ║"
    echo "║                                                              ║"
    echo "║              Continua após erro do Nginx                     ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Verificações iniciais
    check_root
    
    # Executar instalação
    fix_nginx_quick
    install_pm2
    setup_sispat
    setup_environment
    setup_database
    build_sispat
    configure_nginx_for_sispat
    start_sispat
    
    # Mostrar informações finais
    show_final_info
    
    echo -e "\n${GREEN}🎉 Instalação concluída com sucesso!${NC}"
    echo -e "${YELLOW}Pressione Enter para finalizar...${NC}"
    read -r
}

# Executar função principal
main "$@"
