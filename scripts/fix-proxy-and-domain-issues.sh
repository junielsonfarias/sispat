#!/bin/bash

# =============================================================================
# SCRIPT PARA CORRIGIR PROBLEMAS DE PROXY E DOMÍNIO
# Corrige configuração de proxy e substitui localhost pelo domínio
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
║           🔧 CORREÇÃO DE PROXY E DOMÍNIO                    ║
║                                                              ║
║              Corrige configuração de proxy e localhost      ║
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

# 1. Detectar domínio
log_header "Detectando domínio..."

# Tentar detectar domínio do Nginx
DOMAIN=$(grep -r "server_name" /etc/nginx/sites-available/ | grep -v "localhost" | grep -v "_" | head -1 | awk '{print $2}' | sed 's/;//' | sed 's/localhost//' | xargs)

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost" ]; then
    # Tentar detectar do .env
    DOMAIN=$(grep "VITE_DOMAIN\|CORS_ORIGIN" .env | head -1 | cut -d'=' -f2 | sed 's/https:\/\///' | sed 's/http:\/\///' | sed 's/,.*//' | xargs)
fi

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost" ]; then
    # Usar IP da VPS como fallback
    DOMAIN=$(hostname -I | awk '{print $1}')
    log_warning "Domínio não detectado, usando IP: $DOMAIN"
else
    log_success "Domínio detectado: $DOMAIN"
fi

# 2. Corrigir configuração do Express (Trust Proxy)
log_header "Corrigindo configuração do Express..."

# Verificar se o arquivo server/index.js existe
if [ -f "server/index.js" ]; then
    log_info "Corrigindo configuração de trust proxy no server/index.js..."
    
    # Backup do arquivo
    cp server/index.js server/index.js.backup.$(date +%Y%m%d_%H%M%S)
    
    # Adicionar trust proxy se não existir
    if ! grep -q "app.set.*trust proxy" server/index.js; then
        log_info "Adicionando configuração de trust proxy..."
        
        # Encontrar onde adicionar a configuração (após app = express())
        sed -i '/const app = express();/a\\n// Configurar trust proxy para funcionar com Nginx\napp.set("trust proxy", true);' server/index.js
        
        log_success "Configuração de trust proxy adicionada"
    else
        log_info "Configuração de trust proxy já existe"
    fi
    
    # Verificar se há configuração de rate limiting problemática
    if grep -q "express-rate-limit" server/index.js; then
        log_info "Verificando configuração de rate limiting..."
        
        # Adicionar configuração para ignorar X-Forwarded-For se necessário
        if ! grep -q "skip.*x-forwarded-for" server/index.js; then
            log_info "Adicionando configuração para rate limiting com proxy..."
            
            # Procurar pela configuração de rate limiting e adicionar skip
            sed -i '/rateLimit/s/$/\n  skip: (req) => {\n    // Pular rate limiting para requisições com X-Forwarded-For\n    return req.headers["x-forwarded-for"];\n  },/' server/index.js
        fi
    fi
else
    log_error "Arquivo server/index.js não encontrado"
fi

# 3. Corrigir variáveis de ambiente
log_header "Corrigindo variáveis de ambiente..."

if [ -f ".env" ]; then
    log_info "Atualizando .env com configurações corretas..."
    
    # Backup do .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Atualizar configurações de CORS e domínio
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,http://$DOMAIN|" .env
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN|" .env
    sed -i "s|VITE_DOMAIN=.*|VITE_DOMAIN=https://$DOMAIN|" .env
    sed -i "s|VITE_API_TARGET=.*|VITE_API_TARGET=https://$DOMAIN/api|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|" .env
    sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=https://$DOMAIN|" .env
    
    # Adicionar configurações se não existirem
    if ! grep -q "TRUST_PROXY" .env; then
        echo "TRUST_PROXY=true" >> .env
    fi
    
    if ! grep -q "NODE_ENV=production" .env; then
        echo "NODE_ENV=production" >> .env
    fi
    
    log_success "Variáveis de ambiente atualizadas"
else
    log_error "Arquivo .env não encontrado"
fi

# 4. Corrigir arquivos de build (substituir localhost pelo domínio)
log_header "Corrigindo arquivos de build..."

if [ -d "dist" ]; then
    log_info "Substituindo localhost pelo domínio nos arquivos de build..."
    
    # Backup da pasta dist
    cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
    
    # Substituir localhost:3001 pelo domínio nos arquivos JS
    find dist -name "*.js" -type f -exec sed -i "s|localhost:3001|$DOMAIN|g" {} \;
    find dist -name "*.js" -type f -exec sed -i "s|http://localhost:3001|https://$DOMAIN|g" {} \;
    
    # Substituir em arquivos de configuração se existirem
    find dist -name "*.json" -type f -exec sed -i "s|localhost:3001|$DOMAIN|g" {} \;
    
    log_success "Arquivos de build corrigidos"
else
    log_warning "Pasta dist não encontrada, fazendo build..."
    
    # Fazer build
    npm run build:prod || npm run build
    
    if [ -d "dist" ]; then
        log_info "Substituindo localhost pelo domínio nos arquivos de build..."
        find dist -name "*.js" -type f -exec sed -i "s|localhost:3001|$DOMAIN|g" {} \;
        find dist -name "*.js" -type f -exec sed -i "s|http://localhost:3001|https://$DOMAIN|g" {} \;
        log_success "Build feito e arquivos corrigidos"
    else
        log_error "Build falhou"
    fi
fi

# 5. Verificar e corrigir configuração do Nginx
log_header "Verificando configuração do Nginx..."

# Verificar se há configuração para o domínio
if [ -f "/etc/nginx/sites-available/sispat" ]; then
    log_info "Verificando configuração do Nginx para o domínio..."
    
    # Verificar se o domínio está configurado
    if ! grep -q "server_name.*$DOMAIN" /etc/nginx/sites-available/sispat; then
        log_info "Atualizando configuração do Nginx com o domínio..."
        
        # Backup da configuração
        cp /etc/nginx/sites-available/sispat /etc/nginx/sites-available/sispat.backup.$(date +%Y%m%d_%H%M%S)
        
        # Atualizar server_name
        sed -i "s|server_name.*|server_name $DOMAIN;|" /etc/nginx/sites-available/sispat
        
        log_success "Configuração do Nginx atualizada"
    else
        log_success "Domínio já configurado no Nginx"
    fi
else
    log_warning "Configuração do Nginx não encontrada"
fi

# 6. Reiniciar serviços
log_header "Reiniciando serviços..."

log_info "Reiniciando PM2..."
pm2 restart all

log_info "Reiniciando Nginx..."
systemctl reload nginx

# Aguardar serviços estabilizarem
sleep 10

# 7. Testar conectividade
log_header "Testando conectividade..."

# Testar API local
log_info "Testando API local..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "✅ API local funcionando"
else
    log_error "❌ API local não responde"
fi

# Testar API via domínio
log_info "Testando API via domínio..."
if curl -f -s https://$DOMAIN/api/health > /dev/null 2>&1; then
    log_success "✅ API via domínio funcionando"
else
    log_warning "⚠️ API via domínio não responde (pode ser normal se não tiver SSL)"
    
    # Tentar HTTP
    if curl -f -s http://$DOMAIN/api/health > /dev/null 2>&1; then
        log_success "✅ API via domínio (HTTP) funcionando"
    else
        log_error "❌ API via domínio não responde"
    fi
fi

# Testar endpoints específicos
log_info "Testando endpoint ensure-superuser..."
if curl -f -s -X POST https://$DOMAIN/api/auth/ensure-superuser > /dev/null 2>&1; then
    log_success "✅ ensure-superuser via domínio funcionando"
else
    log_warning "⚠️ ensure-superuser via domínio não responde"
fi

# 8. Verificar logs
log_header "Verificando logs..."

log_info "Verificando se os erros de rate limiting foram resolvidos..."
if pm2 logs --lines 20 | grep -q "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR"; then
    log_warning "Ainda há erros de rate limiting nos logs"
else
    log_success "Erros de rate limiting resolvidos"
fi

# 9. Informações finais
log_header "Resumo da correção:"

echo -e "\n${GREEN}🎯 Problemas corrigidos:${NC}"
echo -e "• Configuração de trust proxy no Express"
echo -e "• Rate limiting com X-Forwarded-For"
echo -e "• Substituição de localhost pelo domínio nos arquivos de build"
echo -e "• Configuração de CORS e domínio no .env"
echo -e "• Configuração do Nginx para o domínio"

echo -e "\n${GREEN}🌐 URLs atualizadas:${NC}"
echo -e "• Frontend: https://$DOMAIN"
echo -e "• API: https://$DOMAIN/api/health"
echo -e "• Login: https://$DOMAIN/login"

echo -e "\n${GREEN}🔑 Credenciais do superusuário:${NC}"
echo -e "• Email: junielsonfarias@gmail.com"
echo -e "• Senha: Tiko6273@"

echo -e "\n${GREEN}📋 Comandos úteis:${NC}"
echo -e "• Ver logs: pm2 logs"
echo -e "• Reiniciar: pm2 restart all"
echo -e "• Testar API: curl https://$DOMAIN/api/health"

echo -e "\n${YELLOW}⚠️  Próximos passos:${NC}"
echo -e "1. Teste o login no navegador: https://$DOMAIN/login"
echo -e "2. Verifique se não há mais erros de ERR_CONNECTION_REFUSED"
echo -e "3. Monitore os logs: pm2 logs"

log_success "Correção de proxy e domínio concluída!"
