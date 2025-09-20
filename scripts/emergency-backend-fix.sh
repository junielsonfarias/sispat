#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE EMERGÊNCIA DO BACKEND
# Resolve problemas críticos de conectividade do backend
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

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           🚨 CORREÇÃO DE EMERGÊNCIA DO BACKEND               ║
║                                                              ║
║              Resolve problemas críticos de conectividade     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root!"
    log_info "Execute: sudo su -"
    exit 1
fi

APP_DIR="/var/www/sispat"
cd $APP_DIR || { log_error "Diretório da aplicação não encontrado: $APP_DIR"; exit 1; }

# 1. PARAR TUDO E LIMPAR
log_header "Parando todos os serviços e limpando..."

log_info "Parando PM2..."
pm2 kill 2>/dev/null || true

log_info "Parando Nginx..."
systemctl stop nginx 2>/dev/null || true

log_info "Parando PostgreSQL..."
systemctl stop postgresql 2>/dev/null || true

# Aguardar
sleep 5

# 2. INICIAR SERVIÇOS EM ORDEM
log_header "Iniciando serviços em ordem..."

log_info "Iniciando PostgreSQL..."
systemctl start postgresql
sleep 5

# Verificar PostgreSQL
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL iniciado"
else
    log_error "Falha ao iniciar PostgreSQL"
    exit 1
fi

log_info "Iniciando Nginx..."
systemctl start nginx
sleep 3

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    log_success "Nginx iniciado"
else
    log_error "Falha ao iniciar Nginx"
    exit 1
fi

# 3. VERIFICAR E CORRIGIR BANCO DE DADOS
log_header "Verificando banco de dados..."

# Testar conexão
if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT version();" > /dev/null 2>&1; then
    log_success "Conexão com banco OK"
else
    log_error "Falha na conexão com banco"
    
    # Tentar recriar banco
    log_info "Tentando recriar banco..."
    sudo -u postgres -H psql -c "DROP DATABASE IF EXISTS sispat_db;" 2>/dev/null || true
    sudo -u postgres -H psql -c "CREATE DATABASE sispat_db OWNER postgres;" 2>/dev/null || true
    
    # Executar script de inicialização
    if [ -f "scripts/init-database.sh" ]; then
        log_info "Executando script de inicialização do banco..."
        chmod +x scripts/init-database.sh
        ./scripts/init-database.sh
    fi
fi

# 4. VERIFICAR E CORRIGIR SUPERUSUÁRIO
log_header "Verificando superusuário..."

# Verificar se existe
if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT email FROM users WHERE email = 'junielsonfarias@gmail.com';" 2>/dev/null | grep -q "junielsonfarias@gmail.com"; then
    log_success "Superusuário encontrado"
else
    log_warning "Superusuário não encontrado, criando..."
    
    # Criar via SQL direto
    PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "
        INSERT INTO users (name, email, password, role, municipality_id, is_active, created_at, updated_at)
        VALUES ('Junielson Farias', 'junielsonfarias@gmail.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2O', 'superuser', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP;
    " 2>/dev/null || log_warning "Falha ao criar superusuário via SQL"
fi

# 5. VERIFICAR ARQUIVOS DE CONFIGURAÇÃO
log_header "Verificando configurações..."

# Verificar .env
if [ -f ".env" ]; then
    log_success "Arquivo .env encontrado"
    
    # Verificar configurações importantes
    if ! grep -q "NODE_ENV=production" .env; then
        log_warning "NODE_ENV não configurado, corrigindo..."
        sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env || echo "NODE_ENV=production" >> .env
    fi
    
    if ! grep -q "PORT=3001" .env; then
        log_warning "PORT não configurado, corrigindo..."
        sed -i 's/PORT=.*/PORT=3001/' .env || echo "PORT=3001" >> .env
    fi
    
    if ! grep -q "DB_HOST=localhost" .env; then
        log_warning "DB_HOST não configurado, corrigindo..."
        sed -i 's/DB_HOST=.*/DB_HOST=localhost/' .env || echo "DB_HOST=localhost" >> .env
    fi
else
    log_error "Arquivo .env não encontrado, criando..."
    
    # Criar .env básico
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sispat_db

JWT_SECRET=emergency-jwt-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=emergency-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=*
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=*

DISABLE_DATABASE=false
BCRYPT_ROUNDS=12
LOG_LEVEL=info
EOF
fi

# 6. VERIFICAR ARQUIVOS DE BUILD
log_header "Verificando arquivos de build..."

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    log_success "Arquivos de build encontrados"
else
    log_warning "Arquivos de build não encontrados, fazendo build..."
    
    # Limpar cache
    npm cache clean --force
    rm -rf node_modules/.vite
    
    # Fazer build
    npm run build:prod || npm run build
    
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        log_error "Build falhou"
        exit 1
    fi
fi

# 7. VERIFICAR CONFIGURAÇÃO DO PM2
log_header "Verificando configuração do PM2..."

if [ -f "ecosystem.production.config.cjs" ]; then
    log_success "Configuração PM2 encontrada"
else
    log_warning "Configuração PM2 não encontrada, criando..."
    
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
    log_file: '/var/www/sispat/logs/pm2.log',
    out_file: '/var/www/sispat/logs/pm2-out.log',
    error_file: '/var/www/sispat/logs/pm2-error.log',
    merge_logs: true,
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
fi

# 8. INICIAR BACKEND
log_header "Iniciando backend..."

# Criar diretório de logs se não existir
mkdir -p logs

# Iniciar PM2
log_info "Iniciando PM2..."
pm2 start ecosystem.production.config.cjs --env production
pm2 save

# Aguardar backend inicializar
sleep 10

# 9. VERIFICAR SE BACKEND ESTÁ FUNCIONANDO
log_header "Verificando backend..."

# Verificar se o processo está rodando
if pgrep -f "node.*server/index.js" > /dev/null; then
    log_success "Processo Node.js encontrado"
else
    log_error "Processo Node.js não encontrado"
    log_info "Verificando logs do PM2..."
    pm2 logs --lines 20
    exit 1
fi

# Verificar se a porta está sendo usada
if netstat -tlnp | grep -q ":3001"; then
    log_success "Porta 3001 está em uso"
else
    log_error "Porta 3001 não está em uso"
    log_info "Verificando logs do PM2..."
    pm2 logs --lines 20
    exit 1
fi

# Testar API
log_info "Testando API..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "✅ API respondendo!"
else
    log_error "❌ API não responde"
    log_info "Verificando logs detalhados..."
    pm2 logs --lines 50
    
    # Tentar reiniciar
    log_info "Tentando reiniciar PM2..."
    pm2 restart all
    sleep 10
    
    # Testar novamente
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "✅ API respondendo após reinício!"
    else
        log_error "❌ API ainda não responde"
        exit 1
    fi
fi

# 10. VERIFICAR NGINX
log_header "Verificando Nginx..."

# Testar configuração
if nginx -t; then
    log_success "Configuração do Nginx OK"
else
    log_error "Erro na configuração do Nginx"
    log_info "Verificando logs do Nginx..."
    journalctl -u nginx --no-pager -l | tail -20
fi

# Testar API via Nginx
log_info "Testando API via Nginx..."
if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    log_success "✅ API funcionando via Nginx!"
else
    log_warning "⚠️ API não funciona via Nginx"
    log_info "Verificando configuração do proxy..."
    grep -A 10 "location /api/" /etc/nginx/sites-available/default || log_warning "Configuração de proxy não encontrada"
fi

# 11. TESTE FINAL
log_header "Teste final de conectividade..."

# Testar endpoints específicos
log_info "Testando endpoint ensure-superuser..."
if curl -f -s -X POST http://localhost:3001/api/auth/ensure-superuser > /dev/null 2>&1; then
    log_success "✅ ensure-superuser funcionando!"
else
    log_warning "⚠️ ensure-superuser não responde"
fi

log_info "Testando endpoint login..."
if curl -f -s -X POST http://localhost:3001/api/auth/login > /dev/null 2>&1; then
    log_success "✅ login funcionando!"
else
    log_warning "⚠️ login não responde"
fi

# 12. INFORMAÇÕES FINAIS
log_header "Resumo da correção de emergência:"

echo -e "\n${GREEN}🎯 Status dos serviços:${NC}"
echo -e "• PM2: $(pm2 list | grep sispat-backend | awk '{print $10}' || echo 'Não encontrado')"
echo -e "• PostgreSQL: $(systemctl is-active postgresql)"
echo -e "• Nginx: $(systemctl is-active nginx)"
echo -e "• Porta 3001: $(netstat -tlnp | grep ':3001' | wc -l) processo(s)"

echo -e "\n${GREEN}🌐 URLs para teste:${NC}"
echo -e "• API local: http://localhost:3001/api/health"
echo -e "• API via Nginx: http://localhost/api/health"
echo -e "• Frontend: http://localhost"

echo -e "\n${GREEN}🔑 Credenciais do superusuário:${NC}"
echo -e "• Email: junielsonfarias@gmail.com"
echo -e "• Senha: Tiko6273@"

echo -e "\n${GREEN}📋 Comandos úteis:${NC}"
echo -e "• Ver logs: pm2 logs"
echo -e "• Reiniciar: pm2 restart all"
echo -e "• Status: pm2 status"
echo -e "• Testar API: curl http://localhost:3001/api/health"

log_success "Correção de emergência concluída!"
