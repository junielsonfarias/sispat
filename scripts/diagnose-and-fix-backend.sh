#!/bin/bash

# =============================================================================
# SCRIPT DE DIAGNÓSTICO E CORREÇÃO DO BACKEND
# Diagnostica e corrige problemas de conectividade do backend
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
║           🔧 DIAGNÓSTICO E CORREÇÃO DO BACKEND               ║
║                                                              ║
║              Identifica e corrige problemas de conectividade ║
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

# 1. Verificar status do PM2
log_header "Verificando status do PM2..."
pm2 status

# Verificar se há processos rodando
if pm2 list | grep -q "sispat-backend"; then
    log_success "Processo sispat-backend encontrado no PM2"
    
    # Verificar se está online
    if pm2 list | grep "sispat-backend" | grep -q "online"; then
        log_success "Backend está online no PM2"
    else
        log_warning "Backend não está online no PM2"
        log_info "Tentando reiniciar..."
        pm2 restart sispat-backend
        sleep 5
    fi
else
    log_error "Processo sispat-backend não encontrado no PM2"
    log_info "Tentando iniciar..."
    pm2 start ecosystem.production.config.cjs --env production
    sleep 5
fi

# 2. Verificar logs do PM2
log_header "Verificando logs do PM2..."
log_info "Últimas 20 linhas dos logs:"
pm2 logs --lines 20

# 3. Verificar se a porta 3001 está sendo usada
log_header "Verificando porta 3001..."
if netstat -tlnp | grep -q ":3001"; then
    log_success "Porta 3001 está em uso"
    netstat -tlnp | grep ":3001"
else
    log_error "Porta 3001 não está em uso - backend não está rodando"
fi

# 4. Verificar PostgreSQL
log_header "Verificando PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL está ativo"
else
    log_error "PostgreSQL não está ativo"
    log_info "Tentando iniciar PostgreSQL..."
    systemctl start postgresql
    sleep 3
fi

# Testar conexão com o banco
log_info "Testando conexão com o banco..."
if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT version();" > /dev/null 2>&1; then
    log_success "Conexão com PostgreSQL OK"
else
    log_error "Falha na conexão com PostgreSQL"
    log_info "Verificando credenciais..."
    cat /root/sispat-db-credentials.txt 2>/dev/null || log_warning "Arquivo de credenciais não encontrado"
fi

# 5. Verificar se o superusuário existe
log_header "Verificando superusuário..."
if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT email FROM users WHERE email = 'junielsonfarias@gmail.com';" 2>/dev/null | grep -q "junielsonfarias@gmail.com"; then
    log_success "Superusuário encontrado no banco"
else
    log_warning "Superusuário não encontrado no banco"
    log_info "Tentando criar superusuário..."
    
    # Tentar com script .cjs
    if [ -f "scripts/create-superuser.cjs" ]; then
        node scripts/create-superuser.cjs
    elif [ -f "scripts/create-superuser.js" ]; then
        node scripts/create-superuser.js
    else
        log_warning "Scripts de superusuário não encontrados"
    fi
fi

# 6. Verificar Nginx
log_header "Verificando Nginx..."
if systemctl is-active --quiet nginx; then
    log_success "Nginx está ativo"
else
    log_error "Nginx não está ativo"
    log_info "Tentando iniciar Nginx..."
    systemctl start nginx
    sleep 3
fi

# Testar configuração do Nginx
if nginx -t; then
    log_success "Configuração do Nginx OK"
else
    log_error "Erro na configuração do Nginx"
    log_info "Verificando logs do Nginx..."
    journalctl -u nginx --no-pager -l | tail -20
fi

# 7. Testar conectividade da API
log_header "Testando conectividade da API..."

# Testar localmente
log_info "Testando API localmente..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "API responde localmente"
else
    log_error "API não responde localmente"
    
    # Verificar se o processo está realmente rodando
    if pgrep -f "node.*server/index.js" > /dev/null; then
        log_info "Processo Node.js encontrado, mas API não responde"
        log_info "Verificando logs detalhados..."
        pm2 logs --lines 50
    else
        log_error "Processo Node.js não encontrado"
        log_info "Tentando iniciar manualmente..."
        cd $APP_DIR
        pm2 start ecosystem.production.config.cjs --env production
        sleep 10
    fi
fi

# Testar via Nginx
log_info "Testando API via Nginx..."
if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    log_success "API responde via Nginx"
else
    log_warning "API não responde via Nginx"
    log_info "Verificando configuração do proxy..."
    grep -A 10 "location /api/" /etc/nginx/sites-available/default || log_warning "Configuração de proxy não encontrada"
fi

# 8. Verificar variáveis de ambiente
log_header "Verificando variáveis de ambiente..."
if [ -f ".env" ]; then
    log_success "Arquivo .env encontrado"
    log_info "Verificando configurações importantes..."
    
    if grep -q "NODE_ENV=production" .env; then
        log_success "NODE_ENV configurado para produção"
    else
        log_warning "NODE_ENV não configurado para produção"
    fi
    
    if grep -q "PORT=3001" .env; then
        log_success "PORT configurado para 3001"
    else
        log_warning "PORT não configurado para 3001"
    fi
    
    if grep -q "DB_HOST=localhost" .env; then
        log_success "DB_HOST configurado para localhost"
    else
        log_warning "DB_HOST não configurado corretamente"
    fi
else
    log_error "Arquivo .env não encontrado"
fi

# 9. Verificar arquivos de build
log_header "Verificando arquivos de build..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    log_success "Arquivos de build encontrados"
else
    log_error "Arquivos de build não encontrados"
    log_info "Tentando fazer build..."
    npm run build:prod || npm run build
fi

# 10. Aplicar correções
log_header "Aplicando correções..."

# Reiniciar todos os serviços
log_info "Reiniciando serviços..."
pm2 restart all
systemctl restart nginx
systemctl restart postgresql

# Aguardar serviços iniciarem
sleep 10

# Testar novamente
log_info "Testando conectividade após correções..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "✅ Backend funcionando após correções!"
else
    log_error "❌ Backend ainda com problemas"
    
    # Diagnóstico adicional
    log_info "Executando diagnóstico adicional..."
    
    # Verificar se há erros no código
    log_info "Verificando sintaxe do código..."
    node -c server/index.js && log_success "Sintaxe do servidor OK" || log_error "Erro de sintaxe no servidor"
    
    # Verificar dependências
    log_info "Verificando dependências..."
    npm ls --depth=0 | head -20
    
    # Verificar permissões
    log_info "Verificando permissões..."
    ls -la server/index.js
    ls -la ecosystem.production.config.cjs
fi

# 11. Informações finais
log_header "Informações de diagnóstico:"

echo -e "\n${BLUE}📊 Status dos serviços:${NC}"
echo -e "• PM2: $(pm2 list | grep sispat-backend | awk '{print $10}' || echo 'Não encontrado')"
echo -e "• PostgreSQL: $(systemctl is-active postgresql)"
echo -e "• Nginx: $(systemctl is-active nginx)"

echo -e "\n${BLUE}🌐 URLs de teste:${NC}"
echo -e "• API local: http://localhost:3001/api/health"
echo -e "• API via Nginx: http://localhost/api/health"
echo -e "• Frontend: http://localhost"

echo -e "\n${BLUE}🔑 Credenciais do superusuário:${NC}"
echo -e "• Email: junielsonfarias@gmail.com"
echo -e "• Senha: Tiko6273@"

echo -e "\n${BLUE}📋 Comandos úteis:${NC}"
echo -e "• Ver logs: pm2 logs"
echo -e "• Reiniciar: pm2 restart all"
echo -e "• Status: pm2 status"
echo -e "• Testar API: curl http://localhost:3001/api/health"

log_success "Diagnóstico concluído!"
