#!/bin/bash

# =============================================================================
# SCRIPT DE TESTE RÁPIDO DO BACKEND
# Testa rapidamente se o backend está funcionando
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
║           ⚡ TESTE RÁPIDO DO BACKEND                         ║
║                                                              ║
║              Verifica rapidamente se o backend está OK      ║
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

# 1. Verificar PM2
log_header "Verificando PM2..."
pm2 status

# 2. Verificar se o processo está rodando
log_header "Verificando processo Node.js..."
if pgrep -f "node.*server/index.js" > /dev/null; then
    log_success "Processo Node.js encontrado"
    ps aux | grep "node.*server/index.js" | grep -v grep
else
    log_error "Processo Node.js não encontrado"
fi

# 3. Verificar porta 3001
log_header "Verificando porta 3001..."
if netstat -tlnp | grep -q ":3001"; then
    log_success "Porta 3001 está em uso"
    netstat -tlnp | grep ":3001"
else
    log_error "Porta 3001 não está em uso"
fi

# 4. Testar API
log_header "Testando API..."

# Testar health
log_info "Testando /api/health..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "✅ /api/health OK"
else
    log_error "❌ /api/health falhou"
fi

# Testar ensure-superuser
log_info "Testando /api/auth/ensure-superuser..."
if curl -f -s -X POST http://localhost:3001/api/auth/ensure-superuser > /dev/null 2>&1; then
    log_success "✅ /api/auth/ensure-superuser OK"
else
    log_error "❌ /api/auth/ensure-superuser falhou"
fi

# Testar login
log_info "Testando /api/auth/login..."
if curl -f -s -X POST http://localhost:3001/api/auth/login > /dev/null 2>&1; then
    log_success "✅ /api/auth/login OK"
else
    log_error "❌ /api/auth/login falhou"
fi

# 5. Verificar logs
log_header "Verificando logs do PM2..."
log_info "Últimas 10 linhas dos logs:"
pm2 logs --lines 10

# 6. Verificar PostgreSQL
log_header "Verificando PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL está ativo"
else
    log_error "PostgreSQL não está ativo"
fi

# Testar conexão com banco
log_info "Testando conexão com banco..."
if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT version();" > /dev/null 2>&1; then
    log_success "Conexão com banco OK"
else
    log_error "Falha na conexão com banco"
fi

# 7. Verificar superusuário
log_header "Verificando superusuário..."
if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT email FROM users WHERE email = 'junielsonfarias@gmail.com';" 2>/dev/null | grep -q "junielsonfarias@gmail.com"; then
    log_success "Superusuário encontrado"
else
    log_error "Superusuário não encontrado"
fi

# 8. Verificar Nginx
log_header "Verificando Nginx..."
if systemctl is-active --quiet nginx; then
    log_success "Nginx está ativo"
else
    log_error "Nginx não está ativo"
fi

# Testar API via Nginx
log_info "Testando API via Nginx..."
if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    log_success "✅ API via Nginx OK"
else
    log_error "❌ API via Nginx falhou"
fi

# 9. Resumo
log_header "Resumo do teste:"

echo -e "\n${BLUE}📊 Status:${NC}"
echo -e "• PM2: $(pm2 list | grep sispat-backend | awk '{print $10}' || echo 'Não encontrado')"
echo -e "• Processo Node.js: $(pgrep -f 'node.*server/index.js' > /dev/null && echo 'Rodando' || echo 'Não encontrado')"
echo -e "• Porta 3001: $(netstat -tlnp | grep ':3001' > /dev/null && echo 'Em uso' || echo 'Livre')"
echo -e "• PostgreSQL: $(systemctl is-active postgresql)"
echo -e "• Nginx: $(systemctl is-active nginx)"

echo -e "\n${BLUE}🌐 URLs:${NC}"
echo -e "• API local: http://localhost:3001/api/health"
echo -e "• API via Nginx: http://localhost/api/health"
echo -e "• Frontend: http://localhost"

echo -e "\n${BLUE}🔑 Superusuário:${NC}"
echo -e "• Email: junielsonfarias@gmail.com"
echo -e "• Senha: Tiko6273@"

log_success "Teste concluído!"
