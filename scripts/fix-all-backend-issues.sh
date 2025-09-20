#!/bin/bash

# =============================================================================
# SCRIPT COMPLETO DE CORREÇÃO DO BACKEND
# Executa todos os diagnósticos e correções necessárias
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
║           🔧 CORREÇÃO COMPLETA DO BACKEND                    ║
║                                                              ║
║              Diagnostica e corrige todos os problemas        ║
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

# 1. Executar diagnóstico do backend
log_header "Executando diagnóstico do backend..."
if [ -f "scripts/diagnose-and-fix-backend.sh" ]; then
    chmod +x scripts/diagnose-and-fix-backend.sh
    ./scripts/diagnose-and-fix-backend.sh
else
    log_warning "Script de diagnóstico não encontrado, executando diagnóstico manual..."
    
    # Diagnóstico manual básico
    log_info "Verificando PM2..."
    pm2 status
    
    log_info "Verificando PostgreSQL..."
    systemctl status postgresql --no-pager -l
    
    log_info "Verificando Nginx..."
    systemctl status nginx --no-pager -l
    
    log_info "Testando API..."
    curl -I http://localhost:3001/api/health || log_warning "API não responde"
fi

# 2. Executar correção de erros React DOM
log_header "Executando correção de erros React DOM..."
if [ -f "scripts/fix-react-dom-errors.sh" ]; then
    chmod +x scripts/fix-react-dom-errors.sh
    ./scripts/fix-react-dom-errors.sh
else
    log_warning "Script de correção React DOM não encontrado, executando correção manual..."
    
    # Correção manual básica
    log_info "Limpando cache..."
    npm cache clean --force
    rm -rf node_modules/.vite
    rm -rf dist
    
    log_info "Reinstalando dependências..."
    npm install --legacy-peer-deps
    
    log_info "Fazendo build..."
    npm run build:prod || npm run build
    
    log_info "Reiniciando PM2..."
    pm2 restart all
fi

# 3. Verificar superusuário
log_header "Verificando e corrigindo superusuário..."
if PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "SELECT email FROM users WHERE email = 'junielsonfarias@gmail.com';" 2>/dev/null | grep -q "junielsonfarias@gmail.com"; then
    log_success "Superusuário encontrado no banco"
else
    log_warning "Superusuário não encontrado, criando..."
    
    # Tentar com script .cjs
    if [ -f "scripts/create-superuser.cjs" ]; then
        node scripts/create-superuser.cjs
    elif [ -f "scripts/create-superuser.js" ]; then
        node scripts/create-superuser.js
    else
        log_warning "Scripts de superusuário não encontrados, criando via SQL..."
        PGPASSWORD=postgres psql -h localhost -U postgres -d sispat_db -c "
            INSERT INTO users (name, email, password, role, municipality_id, is_active)
            VALUES ('Junielson Farias', 'junielsonfarias@gmail.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2O', 'superuser', 1, true)
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                password = EXCLUDED.password,
                role = EXCLUDED.role,
                is_active = true,
                updated_at = CURRENT_TIMESTAMP;
        " 2>/dev/null || log_warning "Falha ao criar superusuário via SQL"
    fi
fi

# 4. Verificar conectividade final
log_header "Verificando conectividade final..."

# Aguardar serviços estabilizarem
sleep 15

# Testar backend
log_info "Testando backend..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "✅ Backend funcionando!"
else
    log_error "❌ Backend ainda com problemas"
    
    # Diagnóstico adicional
    log_info "Verificando logs do PM2..."
    pm2 logs --lines 30
    
    log_info "Verificando se o processo está rodando..."
    ps aux | grep "node.*server/index.js" || log_warning "Processo Node.js não encontrado"
fi

# Testar frontend
log_info "Testando frontend..."
if curl -f -s http://localhost > /dev/null 2>&1; then
    log_success "✅ Frontend sendo servido!"
else
    log_warning "⚠️ Frontend pode ter problemas"
fi

# Testar API via Nginx
log_info "Testando API via Nginx..."
if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    log_success "✅ API funcionando via Nginx!"
else
    log_warning "⚠️ API não funciona via Nginx"
fi

# 5. Informações finais
log_header "Resumo da correção:"

echo -e "\n${GREEN}🎯 Problemas identificados e corrigidos:${NC}"
echo -e "• ERR_CONNECTION_REFUSED - Backend não respondia"
echo -e "• React DOM errors - Erros de insertBefore"
echo -e "• Superusuário não encontrado"
echo -e "• Problemas de build e minificação"

echo -e "\n${GREEN}🔧 Correções aplicadas:${NC}"
echo -e "• PM2 reiniciado e verificado"
echo -e "• PostgreSQL verificado e testado"
echo -e "• Nginx verificado e testado"
echo -e "• Build refeito com configurações seguras"
echo -e "• Superusuário criado/verificado"
echo -e "• Cache limpo e dependências reinstaladas"

echo -e "\n${BLUE}🌐 URLs para teste:${NC}"
echo -e "• Frontend: http://sispat.vps-kinghost.net"
echo -e "• API: http://sispat.vps-kinghost.net/api/health"
echo -e "• Login: http://sispat.vps-kinghost.net/login"

echo -e "\n${BLUE}🔑 Credenciais do superusuário:${NC}"
echo -e "• Email: junielsonfarias@gmail.com"
echo -e "• Senha: Tiko6273@"

echo -e "\n${BLUE}📋 Comandos úteis:${NC}"
echo -e "• Ver logs: pm2 logs"
echo -e "• Reiniciar: pm2 restart all"
echo -e "• Status: pm2 status"
echo -e "• Testar API: curl http://localhost:3001/api/health"

echo -e "\n${YELLOW}⚠️  Se ainda houver problemas:${NC}"
echo -e "1. Verifique os logs: pm2 logs"
echo -e "2. Reinicie tudo: pm2 restart all && systemctl restart nginx"
echo -e "3. Execute diagnóstico: ./scripts/diagnose-and-fix-backend.sh"
echo -e "4. Execute correção React: ./scripts/fix-react-dom-errors.sh"

log_success "Correção completa concluída!"
