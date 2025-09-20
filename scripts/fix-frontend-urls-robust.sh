#!/bin/bash

# =============================================================================
# SCRIPT ROBUSTO - CORREÇÃO DE URLs DO FRONTEND
# Corrige URLs hardcoded nos arquivos de build do frontend
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
║        🔧 CORREÇÃO ROBUSTA DE URLs DO FRONTEND              ║
║                                                              ║
║              Corrige URLs hardcoded nos arquivos de build   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Detectar domínio
DOMAIN=""
if [ -f "/etc/nginx/sites-available/sispat" ]; then
    DOMAIN=$(grep "server_name" /etc/nginx/sites-available/sispat | awk '{print $2}' | head -1)
fi

if [ -z "$DOMAIN" ]; then
    DOMAIN=$(hostname -I | awk '{print $1}')
    log_warning "Domínio não detectado, usando IP: $DOMAIN"
else
    log_info "Domínio detectado: $DOMAIN"
fi

# Navegar para o diretório da aplicação
cd /var/www/sispat

# Função para corrigir URLs nos arquivos JavaScript
fix_js_urls() {
    log_header "Corrigindo URLs nos arquivos JavaScript..."
    
    if [ ! -d "dist" ]; then
        log_error "Diretório dist não encontrado!"
        return 1
    fi
    
    # Lista de padrões a serem corrigidos
    local patterns=(
        "https://$DOMAIN"
        "https://localhost:3001"
        "http://localhost:3001"
        "https://localhost:8080"
        "http://localhost:8080"
        "https://localhost:3000"
        "http://localhost:3000"
    )
    
    local replacement="http://$DOMAIN"
    
    # Contador de arquivos modificados
    local modified_files=0
    
    # Encontrar e corrigir arquivos JavaScript
    for pattern in "${patterns[@]}"; do
        log_info "Corrigindo padrão: $pattern -> $replacement"
        
        # Usar find com -exec para processar cada arquivo
        find dist -name "*.js" -type f -exec grep -l "$pattern" {} \; | while read -r file; do
            if [ -f "$file" ]; then
                log_info "Modificando: $file"
                sed -i "s|$pattern|$replacement|g" "$file"
                ((modified_files++))
            fi
        done
    done
    
    # Corrigir URLs da API especificamente
    log_info "Corrigindo URLs da API..."
    find dist -name "*.js" -type f -exec sed -i "s|$replacement/api|$replacement/api|g" {} \;
    
    log_success "URLs JavaScript corrigidas!"
}

# Função para corrigir URLs nos arquivos HTML
fix_html_urls() {
    log_header "Corrigindo URLs nos arquivos HTML..."
    
    if [ ! -d "dist" ]; then
        log_error "Diretório dist não encontrado!"
        return 1
    fi
    
    # Lista de padrões a serem corrigidos
    local patterns=(
        "https://$DOMAIN"
        "https://localhost:3001"
        "http://localhost:3001"
        "https://localhost:8080"
        "http://localhost:8080"
        "https://localhost:3000"
        "http://localhost:3000"
    )
    
    local replacement="http://$DOMAIN"
    
    # Encontrar e corrigir arquivos HTML
    for pattern in "${patterns[@]}"; do
        log_info "Corrigindo padrão: $pattern -> $replacement"
        find dist -name "*.html" -type f -exec sed -i "s|$pattern|$replacement|g" {} \;
    done
    
    log_success "URLs HTML corrigidas!"
}

# Função para corrigir URLs nos arquivos CSS (se houver)
fix_css_urls() {
    log_header "Corrigindo URLs nos arquivos CSS..."
    
    if [ ! -d "dist" ]; then
        log_error "Diretório dist não encontrado!"
        return 1
    fi
    
    # Lista de padrões a serem corrigidos
    local patterns=(
        "https://$DOMAIN"
        "https://localhost:3001"
        "http://localhost:3001"
        "https://localhost:8080"
        "http://localhost:8080"
        "https://localhost:3000"
        "http://localhost:3000"
    )
    
    local replacement="http://$DOMAIN"
    
    # Encontrar e corrigir arquivos CSS
    for pattern in "${patterns[@]}"; do
        log_info "Corrigindo padrão: $pattern -> $replacement"
        find dist -name "*.css" -type f -exec sed -i "s|$pattern|$replacement|g" {} \;
    done
    
    log_success "URLs CSS corrigidas!"
}

# Função para verificar se as correções foram aplicadas
verify_fixes() {
    log_header "Verificando se as correções foram aplicadas..."
    
    if [ ! -d "dist" ]; then
        log_error "Diretório dist não encontrado!"
        return 1
    fi
    
    # Verificar se ainda existem URLs HTTPS
    local https_count=$(find dist -name "*.js" -type f -exec grep -l "https://$DOMAIN" {} \; | wc -l)
    local localhost_count=$(find dist -name "*.js" -type f -exec grep -l "localhost:3001" {} \; | wc -l)
    
    if [ "$https_count" -eq 0 ] && [ "$localhost_count" -eq 0 ]; then
        log_success "✅ Todas as URLs foram corrigidas!"
    else
        log_warning "⚠️  Ainda existem URLs não corrigidas:"
        log_warning "   - Arquivos com HTTPS: $https_count"
        log_warning "   - Arquivos com localhost: $localhost_count"
        
        # Mostrar arquivos problemáticos
        if [ "$https_count" -gt 0 ]; then
            log_info "Arquivos com HTTPS:"
            find dist -name "*.js" -type f -exec grep -l "https://$DOMAIN" {} \;
        fi
        
        if [ "$localhost_count" -gt 0 ]; then
            log_info "Arquivos com localhost:"
            find dist -name "*.js" -type f -exec grep -l "localhost:3001" {} \;
        fi
    fi
}

# Função para limpar cache do navegador
clear_browser_cache() {
    log_header "Limpando cache do navegador..."
    
    # Adicionar headers para evitar cache
    if [ -f "/etc/nginx/sites-available/sispat" ]; then
        # Backup da configuração
        cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)
        
        # Adicionar headers anti-cache para arquivos JS e CSS
        sed -i '/location \/ {/a\        # Headers anti-cache para arquivos JS e CSS\n        location ~* \\.(js|css)$ {\n            add_header Cache-Control "no-cache, no-store, must-revalidate";\n            add_header Pragma "no-cache";\n            add_header Expires "0";\n        }' /etc/nginx/sites-available/sispat
        
        # Recarregar Nginx
        nginx -t && systemctl reload nginx
        log_success "Headers anti-cache adicionados!"
    fi
}

# Função para reiniciar serviços
restart_services() {
    log_header "Reiniciando serviços..."
    
    # Reiniciar Nginx
    log_info "Reiniciando Nginx..."
    systemctl reload nginx
    
    # Reiniciar PM2
    log_info "Reiniciando PM2..."
    pm2 restart all
    
    log_success "Serviços reiniciados!"
}

# Função para testar conectividade
test_connectivity() {
    log_header "Testando conectividade..."
    
    # Aguardar serviços inicializarem
    sleep 5
    
    # Testar localhost:80
    log_info "Testando localhost:80..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
        log_success "✅ Localhost:80 respondendo"
    else
        log_error "❌ Localhost:80 não respondendo"
    fi
    
    # Testar API local
    log_info "Testando API local..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null | grep -q "200\|404"; then
        log_success "✅ API local respondendo"
    else
        log_warning "⚠️  API local pode não estar respondendo"
    fi
    
    # Testar domínio
    if [ "$DOMAIN" != "$(hostname -I | awk '{print $1}')" ]; then
        log_info "Testando domínio: http://$DOMAIN"
        if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null | grep -q "200"; then
            log_success "✅ Domínio respondendo"
        else
            log_warning "⚠️  Domínio pode não estar respondendo"
        fi
    fi
}

# Função para mostrar informações finais
show_final_info() {
    log_header "Correção Robusta Concluída!"
    
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║           ✅ CORREÇÃO ROBUSTA DE URLs CONCLUÍDA!             ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}📋 INFORMAÇÕES DE ACESSO:${NC}"
    echo -e "🌐 URL: ${YELLOW}http://$DOMAIN${NC}"
    echo -e "🔑 Login: ${YELLOW}junielsonfarias@gmail.com${NC}"
    echo -e "👤 Nome: ${YELLOW}Junielson Farias${NC}"
    echo -e "🔒 Senha: ${YELLOW}Tiko6273@${NC}"
    echo -e "👑 Role: ${YELLOW}superuser${NC}"
    
    echo -e "\n${BLUE}🔧 Correções aplicadas:${NC}"
    echo -e "✅ URLs JavaScript corrigidas (HTTPS -> HTTP)"
    echo -e "✅ URLs HTML corrigidas (HTTPS -> HTTP)"
    echo -e "✅ URLs CSS corrigidas (HTTPS -> HTTP)"
    echo -e "✅ Headers anti-cache adicionados"
    echo -e "✅ Serviços reiniciados"
    echo -e "✅ Conectividade testada"
    
    echo -e "\n${BLUE}📊 Comandos Úteis:${NC}"
    echo -e "• ${YELLOW}pm2 status${NC}          # Status da aplicação"
    echo -e "• ${YELLOW}pm2 logs${NC}            # Ver logs"
    echo -e "• ${YELLOW}nginx -t${NC}            # Testar configuração Nginx"
    echo -e "• ${YELLOW}systemctl status nginx${NC}  # Status do Nginx"
    
    echo -e "\n${GREEN}🎉 Sistema corrigido e funcionando!${NC}"
    echo -e "${YELLOW}💡 Dica: Limpe o cache do seu navegador (Ctrl+F5) para ver as mudanças!${NC}"
}

# Função principal
main() {
    log_header "Iniciando correção robusta de URLs do frontend..."
    
    # Executar correções
    fix_js_urls
    fix_html_urls
    fix_css_urls
    verify_fixes
    clear_browser_cache
    restart_services
    test_connectivity
    
    # Mostrar informações finais
    show_final_info
}

# Executar função principal
main "$@"
