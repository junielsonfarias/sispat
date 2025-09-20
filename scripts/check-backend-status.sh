#!/bin/bash

# =============================================================================
# SCRIPT DE VERIFICAÇÃO - STATUS DO BACKEND
# Verifica se o backend está funcionando e identifica problemas
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

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🔍 VERIFICAÇÃO DE STATUS DO BACKEND                  ║
║                                                              ║
║              Verifica se o backend está funcionando         ║
║              e identifica problemas de conectividade        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Função para verificar status do PM2
check_pm2_status() {
    log_header "Verificando status do PM2..."
    
    if command -v pm2 &> /dev/null; then
        log_info "PM2 está instalado"
        
        # Verificar status dos processos
        local pm2_status=$(pm2 status 2>/dev/null || echo "PM2 não está rodando")
        echo "$pm2_status"
        
        # Verificar se há processos rodando
        local process_count=$(pm2 list 2>/dev/null | grep -c "online" || echo "0")
        if [ "$process_count" -gt 0 ]; then
            log_success "✅ PM2 tem $process_count processo(s) online"
        else
            log_error "❌ PM2 não tem processos online"
        fi
        
        # Verificar logs de erro
        log_info "Verificando logs de erro do PM2..."
        local error_logs=$(pm2 logs --err --lines 10 2>/dev/null || echo "Nenhum log de erro encontrado")
        if [ "$error_logs" != "Nenhum log de erro encontrado" ]; then
            log_warning "⚠️  Logs de erro encontrados:"
            echo "$error_logs"
        else
            log_success "✅ Nenhum erro nos logs do PM2"
        fi
    else
        log_error "❌ PM2 não está instalado"
    fi
}

# Função para verificar status do PostgreSQL
check_postgresql_status() {
    log_header "Verificando status do PostgreSQL..."
    
    if systemctl is-active --quiet postgresql; then
        log_success "✅ PostgreSQL está rodando"
        
        # Verificar conexão com o banco
        log_info "Testando conexão com o banco de dados..."
        if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT version();" > /dev/null 2>&1; then
            log_success "✅ Conexão com o banco de dados OK"
        else
            log_error "❌ Erro ao conectar com o banco de dados"
        fi
        
        # Verificar se as tabelas existem
        log_info "Verificando se as tabelas existem..."
        local table_count=$(PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
        if [ "$table_count" -gt 0 ]; then
            log_success "✅ $table_count tabela(s) encontrada(s) no banco"
        else
            log_error "❌ Nenhuma tabela encontrada no banco"
        fi
        
        # Verificar se o superusuário existe
        log_info "Verificando se o superusuário existe..."
        local superuser_count=$(PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -t -c "SELECT COUNT(*) FROM users WHERE role = 'superuser';" 2>/dev/null | tr -d ' ' || echo "0")
        if [ "$superuser_count" -gt 0 ]; then
            log_success "✅ Superusuário encontrado no banco"
        else
            log_error "❌ Superusuário não encontrado no banco"
        fi
    else
        log_error "❌ PostgreSQL não está rodando"
    fi
}

# Função para verificar status do Nginx
check_nginx_status() {
    log_header "Verificando status do Nginx..."
    
    if systemctl is-active --quiet nginx; then
        log_success "✅ Nginx está rodando"
        
        # Verificar configuração
        log_info "Testando configuração do Nginx..."
        if nginx -t > /dev/null 2>&1; then
            log_success "✅ Configuração do Nginx OK"
        else
            log_error "❌ Erro na configuração do Nginx"
            nginx -t
        fi
        
        # Verificar se está ouvindo na porta 80
        log_info "Verificando se Nginx está ouvindo na porta 80..."
        if netstat -tlnp | grep -q ":80.*nginx"; then
            log_success "✅ Nginx está ouvindo na porta 80"
        else
            log_error "❌ Nginx não está ouvindo na porta 80"
        fi
        
        # Verificar logs de erro
        log_info "Verificando logs de erro do Nginx..."
        local error_logs=$(tail -10 /var/log/nginx/error.log 2>/dev/null || echo "Nenhum log de erro encontrado")
        if [ "$error_logs" != "Nenhum log de erro encontrado" ]; then
            log_warning "⚠️  Logs de erro encontrados:"
            echo "$error_logs"
        else
            log_success "✅ Nenhum erro nos logs do Nginx"
        fi
    else
        log_error "❌ Nginx não está rodando"
    fi
}

# Função para verificar conectividade da API
check_api_connectivity() {
    log_header "Verificando conectividade da API..."
    
    # Testar localhost:3001
    log_info "Testando API em localhost:3001..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null | grep -q "200\|404"; then
        log_success "✅ API respondendo em localhost:3001"
    else
        log_error "❌ API não está respondendo em localhost:3001"
    fi
    
    # Testar endpoint específico
    log_info "Testando endpoint /api/auth/ensure-superuser..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/ensure-superuser 2>/dev/null | grep -q "200\|404\|500"; then
        log_success "✅ Endpoint /api/auth/ensure-superuser respondendo"
    else
        log_error "❌ Endpoint /api/auth/ensure-superuser não está respondendo"
    fi
    
    # Testar endpoint de login
    log_info "Testando endpoint /api/auth/login..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/login 2>/dev/null | grep -q "200\|404\|500"; then
        log_success "✅ Endpoint /api/auth/login respondendo"
    else
        log_error "❌ Endpoint /api/auth/login não está respondendo"
    fi
}

# Função para verificar URLs nos arquivos de build
check_build_urls() {
    log_header "Verificando URLs nos arquivos de build..."
    
    cd /var/www/sispat
    
    if [ ! -d "dist" ]; then
        log_error "❌ Diretório dist não encontrado!"
        return 1
    fi
    
    # Verificar se há URLs HTTPS
    local https_count=$(find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -exec grep -l "https://" {} \; | wc -l)
    if [ "$https_count" -gt 0 ]; then
        log_warning "⚠️  $https_count arquivo(s) com URLs HTTPS encontrado(s)"
        log_info "Arquivos com HTTPS:"
        find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -exec grep -l "https://" {} \;
    else
        log_success "✅ Nenhum arquivo com URLs HTTPS encontrado"
    fi
    
    # Verificar se há URLs localhost
    local localhost_count=$(find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -exec grep -l "localhost:" {} \; | wc -l)
    if [ "$localhost_count" -gt 0 ]; then
        log_warning "⚠️  $localhost_count arquivo(s) com URLs localhost encontrado(s)"
        log_info "Arquivos com localhost:"
        find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -exec grep -l "localhost:" {} \;
    else
        log_success "✅ Nenhum arquivo com URLs localhost encontrado"
    fi
}

# Função para mostrar resumo
show_summary() {
    log_header "Resumo da Verificação"
    
    echo -e "\n${BLUE}📊 STATUS DOS SERVIÇOS:${NC}"
    
    # PM2
    if pm2 list 2>/dev/null | grep -q "online"; then
        echo -e "• ${GREEN}PM2: ✅ Online${NC}"
    else
        echo -e "• ${RED}PM2: ❌ Offline${NC}"
    fi
    
    # PostgreSQL
    if systemctl is-active --quiet postgresql; then
        echo -e "• ${GREEN}PostgreSQL: ✅ Online${NC}"
    else
        echo -e "• ${RED}PostgreSQL: ❌ Offline${NC}"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        echo -e "• ${GREEN}Nginx: ✅ Online${NC}"
    else
        echo -e "• ${RED}Nginx: ❌ Offline${NC}"
    fi
    
    # API
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null | grep -q "200\|404"; then
        echo -e "• ${GREEN}API: ✅ Online${NC}"
    else
        echo -e "• ${RED}API: ❌ Offline${NC}"
    fi
    
    echo -e "\n${BLUE}🔧 PRÓXIMOS PASSOS:${NC}"
    echo -e "• ${YELLOW}Se PM2 estiver offline: pm2 start ecosystem.production.config.cjs${NC}"
    echo -e "• ${YELLOW}Se PostgreSQL estiver offline: systemctl start postgresql${NC}"
    echo -e "• ${YELLOW}Se Nginx estiver offline: systemctl start nginx${NC}"
    echo -e "• ${YELLOW}Se API estiver offline: pm2 restart all${NC}"
    echo -e "• ${YELLOW}Se houver URLs HTTPS: execute fix-urls-aggressive.sh${NC}"
}

# Função principal
main() {
    log_header "Iniciando verificação de status do backend..."
    
    # Executar verificações
    check_pm2_status
    check_postgresql_status
    check_nginx_status
    check_api_connectivity
    check_build_urls
    
    # Mostrar resumo
    show_summary
}

# Executar função principal
main "$@"
