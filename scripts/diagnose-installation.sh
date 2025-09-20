#!/bin/bash

# =============================================================================
# SCRIPT DE DIAGNÓSTICO COMPLETO - SISPAT VPS
# Para diagnosticar problemas após instalação
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

log_header "Diagnosticando instalação do SISPAT..."

# 1. Verificar status dos serviços
log_header "1. Verificando status dos serviços..."

log_info "Status do PM2:"
pm2 status

log_info "Status do Nginx:"
systemctl status nginx --no-pager -l

log_info "Status do PostgreSQL:"
systemctl status postgresql --no-pager -l

# 2. Verificar portas em uso
log_header "2. Verificando portas em uso..."
log_info "Porta 80 (Nginx):"
netstat -tlnp | grep :80 || log_warning "Porta 80 não está sendo usada"

log_info "Porta 3001 (Backend):"
netstat -tlnp | grep :3001 || log_warning "Porta 3001 não está sendo usada"

# 3. Verificar arquivos da aplicação
log_header "3. Verificando arquivos da aplicação..."
log_info "Diretório da aplicação:"
ls -la /var/www/sispat/

log_info "Arquivos de build:"
ls -la /var/www/sispat/dist/ || log_error "Diretório dist não encontrado!"

# 4. Verificar configuração do Nginx
log_header "4. Verificando configuração do Nginx..."
log_info "Configuração do SISPAT:"
cat /etc/nginx/sites-available/sispat

log_info "Sites habilitados:"
ls -la /etc/nginx/sites-enabled/

# 5. Verificar logs do Nginx
log_header "5. Verificando logs do Nginx..."
log_info "Logs de erro do Nginx:"
tail -20 /var/log/nginx/error.log

log_info "Logs de acesso do SISPAT:"
tail -20 /var/log/nginx/sispat.access.log 2>/dev/null || log_warning "Log de acesso não encontrado"

log_info "Logs de erro do SISPAT:"
tail -20 /var/log/nginx/sispat.error.log 2>/dev/null || log_warning "Log de erro não encontrado"

# 6. Testar conectividade
log_header "6. Testando conectividade..."
log_info "Testando localhost:80:"
curl -I http://localhost:80 2>/dev/null || log_warning "Falha ao conectar em localhost:80"

log_info "Testando localhost:3001:"
curl -I http://localhost:3001 2>/dev/null || log_warning "Falha ao conectar em localhost:3001"

# 7. Verificar configuração do PM2
log_header "7. Verificando configuração do PM2..."
log_info "Configuração do PM2:"
cat /var/www/sispat/ecosystem.production.config.cjs

# 8. Verificar variáveis de ambiente
log_header "8. Verificando variáveis de ambiente..."
log_info "Arquivo .env:"
if [ -f "/var/www/sispat/.env" ]; then
    cat /var/www/sispat/.env | head -20
else
    log_error "Arquivo .env não encontrado!"
fi

# 9. Testar banco de dados
log_header "9. Testando banco de dados..."
log_info "Testando conexão com PostgreSQL:"
PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT version();" 2>/dev/null && log_success "Banco conectado" || log_error "Falha na conexão com o banco"

# 10. Verificar firewall
log_header "10. Verificando firewall..."
log_info "Status do UFW:"
ufw status

# 11. Sugestões de correção
log_header "11. Sugestões de correção..."
echo -e "${YELLOW}Se o site não estiver acessível, tente:${NC}"
echo "1. Verificar se o domínio está apontando para o IP correto"
echo "2. Executar: systemctl restart nginx"
echo "3. Executar: pm2 restart all"
echo "4. Verificar logs: pm2 logs --lines 50"
echo "5. Testar localmente: curl -I http://localhost"
echo "6. Verificar DNS: nslookup sispat.vps-kinghost.net"

log_success "Diagnóstico concluído!"
