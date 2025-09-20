#!/bin/bash

# =============================================================================
# SCRIPT DE CORREÇÃO DE PROBLEMAS DE CONECTIVIDADE - SISPAT VPS
# Para corrigir problemas comuns após instalação
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

log_header "Corrigindo problemas de conectividade do SISPAT..."

# 1. Reiniciar serviços
log_header "1. Reiniciando serviços..."

log_info "Reiniciando Nginx..."
systemctl restart nginx

log_info "Reiniciando PM2..."
pm2 restart all

log_info "Reiniciando PostgreSQL..."
systemctl restart postgresql

sleep 5

# 2. Verificar status
log_header "2. Verificando status dos serviços..."

log_info "Status do Nginx:"
systemctl is-active nginx && log_success "Nginx ativo" || log_error "Nginx inativo"

log_info "Status do PM2:"
pm2 status

log_info "Status do PostgreSQL:"
systemctl is-active postgresql && log_success "PostgreSQL ativo" || log_error "PostgreSQL inativo"

# 3. Verificar portas
log_header "3. Verificando portas..."

log_info "Porta 80 (Nginx):"
if netstat -tlnp | grep :80 > /dev/null; then
    log_success "Porta 80 está sendo usada"
    netstat -tlnp | grep :80
else
    log_error "Porta 80 não está sendo usada!"
fi

log_info "Porta 3001 (Backend):"
if netstat -tlnp | grep :3001 > /dev/null; then
    log_success "Porta 3001 está sendo usada"
    netstat -tlnp | grep :3001
else
    log_error "Porta 3001 não está sendo usada!"
fi

# 4. Verificar arquivos de build
log_header "4. Verificando arquivos de build..."
if [ -d "/var/www/sispat/dist" ] && [ "$(ls -A /var/www/sispat/dist)" ]; then
    log_success "Arquivos de build encontrados"
    ls -la /var/www/sispat/dist/ | head -5
else
    log_error "Arquivos de build não encontrados! Fazendo build..."
    cd /var/www/sispat
    npm run build
fi

# 5. Verificar configuração do Nginx
log_header "5. Verificando configuração do Nginx..."
if nginx -t; then
    log_success "Configuração do Nginx OK"
else
    log_error "Erro na configuração do Nginx!"
    nginx -t
fi

# 6. Testar conectividade local
log_header "6. Testando conectividade local..."

log_info "Testando localhost:80:"
if curl -I http://localhost:80 2>/dev/null | head -1; then
    log_success "Localhost:80 respondendo"
else
    log_error "Localhost:80 não está respondendo"
fi

log_info "Testando localhost:3001:"
if curl -I http://localhost:3001 2>/dev/null | head -1; then
    log_success "Localhost:3001 respondendo"
else
    log_error "Localhost:3001 não está respondendo"
fi

# 7. Verificar firewall
log_header "7. Verificando firewall..."
log_info "Configurando firewall..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

log_info "Status do firewall:"
ufw status

# 8. Verificar logs recentes
log_header "8. Verificando logs recentes..."

log_info "Logs do PM2 (últimas 10 linhas):"
pm2 logs --lines 10

log_info "Logs de erro do Nginx (últimas 5 linhas):"
tail -5 /var/log/nginx/error.log

# 9. Testar acesso externo
log_header "9. Testando acesso externo..."

log_info "Verificando IP público:"
curl -s ifconfig.me

log_info "Testando resolução DNS:"
nslookup sispat.vps-kinghost.net || log_warning "Falha na resolução DNS"

# 10. Sugestões finais
log_header "10. Sugestões finais..."
echo -e "${YELLOW}Se ainda não estiver funcionando:${NC}"
echo "1. Verifique se o domínio está apontando para o IP correto:"
echo "   nslookup sispat.vps-kinghost.net"
echo "2. Verifique se o IP está correto:"
echo "   curl -s ifconfig.me"
echo "3. Teste acesso direto por IP:"
echo "   curl -I http://$(curl -s ifconfig.me)"
echo "4. Verifique logs detalhados:"
echo "   pm2 logs --lines 50"
echo "   tail -50 /var/log/nginx/error.log"

log_success "Correção de conectividade concluída!"
