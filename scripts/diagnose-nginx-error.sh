#!/bin/bash

# =============================================================================
# SCRIPT DE DIAGNÓSTICO - ERRO DO NGINX
# Identifica rapidamente o problema específico do Nginx
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

log_header "DIAGNÓSTICO DE ERRO DO NGINX"

# 1. Verificar status do Nginx
log_info "1. Status do Nginx:"
systemctl status nginx --no-pager -l || true

# 2. Verificar logs de erro
log_info "2. Logs de erro do Nginx:"
if [ -f "/var/log/nginx/error.log" ]; then
    echo "--- Últimas 20 linhas do error.log ---"
    tail -20 /var/log/nginx/error.log
else
    log_warning "Arquivo de log de erro não encontrado"
fi

# 3. Verificar logs do systemd
log_info "3. Logs do systemd para Nginx:"
journalctl -u nginx --no-pager -l | tail -20

# 4. Testar configuração
log_info "4. Teste de configuração do Nginx:"
nginx -t 2>&1 || true

# 5. Verificar conflitos de porta
log_info "5. Verificando conflitos de porta 80:"
if command -v netstat &> /dev/null; then
    netstat -tlnp | grep :80 || log_info "Nenhum processo usando porta 80"
else
    log_info "netstat não disponível, usando ss:"
    ss -tlnp | grep :80 || log_info "Nenhum processo usando porta 80"
fi

# 6. Verificar serviços conflitantes
log_info "6. Verificando serviços conflitantes:"
for service in apache2 lighttpd httpd; do
    if systemctl is-active --quiet $service 2>/dev/null; then
        log_warning "$service está rodando (pode causar conflito)"
    else
        log_info "$service não está rodando"
    fi
done

# 7. Verificar configurações do Nginx
log_info "7. Verificando configurações do Nginx:"
echo "--- Sites habilitados ---"
ls -la /etc/nginx/sites-enabled/ || log_warning "Nenhum site habilitado"

echo "--- Sites disponíveis ---"
ls -la /etc/nginx/sites-available/ || log_warning "Nenhum site disponível"

# 8. Verificar permissões
log_info "8. Verificando permissões:"
ls -la /var/www/ || log_warning "Diretório /var/www não encontrado"

# 9. Verificar se limit_req_zone está configurado
log_info "9. Verificando configuração de rate limiting:"
if grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
    log_success "limit_req_zone está configurado"
else
    log_warning "limit_req_zone não está configurado"
fi

# 10. Verificar se há erros de sintaxe
log_info "10. Verificando erros de sintaxe:"
if nginx -t 2>&1 | grep -q "syntax is ok"; then
    log_success "Sintaxe do Nginx está OK"
else
    log_error "Problemas de sintaxe detectados:"
    nginx -t 2>&1 | grep -v "syntax is ok" || true
fi

# 11. Verificar espaço em disco
log_info "11. Verificando espaço em disco:"
df -h /var/log/ | tail -1

# 12. Verificar memória
log_info "12. Verificando memória disponível:"
free -h

log_header "DIAGNÓSTICO CONCLUÍDO"

echo -e "\n${YELLOW}💡 PRÓXIMOS PASSOS:${NC}"
echo -e "1. Se há conflitos de porta, pare o serviço conflitante"
echo -e "2. Se há erros de sintaxe, corrija a configuração"
echo -e "3. Se há problemas de permissão, corrija as permissões"
echo -e "4. Execute o script de correção: ${GREEN}fix-nginx-startup-error.sh${NC}"

echo -e "\n${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
echo -e "• Parar Apache: ${YELLOW}systemctl stop apache2${NC}"
echo -e "• Testar Nginx: ${YELLOW}nginx -t${NC}"
echo -e "• Iniciar Nginx: ${YELLOW}systemctl start nginx${NC}"
echo -e "• Ver logs: ${YELLOW}journalctl -u nginx -f${NC}"
