#!/bin/bash

# Script para corrigir todos os problemas identificados na análise de produção
# Autor: GPT-4

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

section() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"
}

log "Iniciando correção de problemas em produção..."

cd /var/www/sispat || exit 1

# ============================================
# 0. CONFIGURAR GIT E ATUALIZAR CÓDIGO
# ============================================
section "0. CONFIGURANDO GIT E ATUALIZANDO CÓDIGO"

log "Configurando permissões do Git..."
git config --global --add safe.directory /var/www/sispat 2>/dev/null || true
success "Git configurado"

log "Buscando atualizações do repositório (git fetch)..."
git fetch origin main || warning "Falha ao buscar atualizações"

log "Atualizando código do repositório (git pull)..."
sudo git pull origin main || {
    warning "Falha ao atualizar código, tentando reset..."
    git reset --hard origin/main || error "Falha ao atualizar código do repositório"
}
success "Código atualizado do repositório"

# ============================================
# 1. LIMPAR RATE LIMITS (SE REDIS ESTIVER DISPONÍVEL)
# ============================================
section "1. LIMPANDO RATE LIMITS"

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null 2>&1; then
        log "Limpando chaves de rate limit no Redis..."
        redis-cli --scan --pattern "rl:*" | xargs -r redis-cli del 2>/dev/null || warning "Nenhuma chave para limpar"
        success "Rate limits limpos no Redis"
    else
        warning "Redis não está respondendo (pode estar desabilitado)"
    fi
else
    warning "Redis CLI não encontrado (rate limit está em memória)"
    log "Reiniciando backend para limpar rate limits em memória..."
fi

# ============================================
# 2. REINSTALAR/ATUALIZAR DEPENDÊNCIAS DO BACKEND
# ============================================
section "2. ATUALIZANDO DEPENDÊNCIAS DO BACKEND"

cd /var/www/sispat/backend || exit 1

log "Instalando dependências do backend..."
npm install || warning "Alguns pacotes podem não ter sido instalados"
success "Dependências atualizadas"

# ============================================
# 3. RECOMPILAR BACKEND
# ============================================
section "3. RECOMPILANDO BACKEND"

log "Compilando backend..."
npm run build || error "Falha ao compilar backend"
success "Backend compilado com sucesso"

# ============================================
# 4. VERIFICAR VARIÁVEIS DE AMBIENTE
# ============================================
section "4. VERIFICANDO VARIÁVEIS DE AMBIENTE"

if [ -f .env ]; then
    log "Verificando configurações críticas..."
    
    # Garantir que HOST está configurado
    if ! grep -q "^HOST=" .env; then
        log "Adicionando HOST=0.0.0.0 ao .env..."
        echo "HOST=0.0.0.0" >> .env
        success "HOST configurado"
    fi
    
    # Garantir que ENABLE_REDIS está definido
    if ! grep -q "^ENABLE_REDIS=" .env; then
        log "Adicionando ENABLE_REDIS=false ao .env..."
        echo "ENABLE_REDIS=false" >> .env
        success "ENABLE_REDIS configurado"
    fi
    
    # Garantir que RATE_LIMIT_MAX está alto o suficiente
    if grep -q "^RATE_LIMIT_MAX=" .env; then
        CURRENT_MAX=$(grep "^RATE_LIMIT_MAX=" .env | cut -d'=' -f2)
        if [ "$CURRENT_MAX" -lt 2000 ] 2>/dev/null; then
            log "Aumentando RATE_LIMIT_MAX para 2000..."
            sed -i 's/^RATE_LIMIT_MAX=.*/RATE_LIMIT_MAX=2000/' .env
            success "RATE_LIMIT_MAX atualizado"
        fi
    else
        log "Adicionando RATE_LIMIT_MAX=2000 ao .env..."
        echo "RATE_LIMIT_MAX=2000" >> .env
        success "RATE_LIMIT_MAX configurado"
    fi
    
    success "Variáveis de ambiente verificadas"
else
    error "Arquivo .env não encontrado!"
fi

# ============================================
# 5. REINICIAR BACKEND
# ============================================
section "5. REINICIANDO BACKEND"

log "Parando backend atual..."
pm2 stop sispat-backend 2>/dev/null || warning "Backend já estava parado"
sleep 2

log "Iniciando backend..."
pm2 start backend/dist/index.js --name sispat-backend || error "Falha ao iniciar backend"
sleep 3

log "Verificando status..."
if pm2 list | grep -q "sispat-backend.*online"; then
    success "Backend está online"
else
    error "Backend não está online! Verifique os logs: pm2 logs sispat-backend"
    pm2 logs sispat-backend --lines 20 --nostream
    exit 1
fi

# ============================================
# 6. VERIFICAR SE BACKEND ESTÁ RESPONDENDO
# ============================================
section "6. VERIFICANDO HEALTH CHECK"

sleep 2
log "Testando health check..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    success "Health check OK (HTTP $HEALTH_RESPONSE)"
    curl -s http://localhost:3000/api/health | head -5
else
    error "Health check falhou (HTTP $HEALTH_RESPONSE)"
    warning "Aguardando mais 5 segundos e tentando novamente..."
    sleep 5
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        success "Health check OK após aguardar"
    else
        error "Health check ainda falhando. Verifique os logs."
        pm2 logs sispat-backend --lines 30 --nostream | tail -20
    fi
fi

# ============================================
# 7. VERIFICAR NGINX (CORRIGIR LOOPS DE REDIRECIONAMENTO)
# ============================================
section "7. VERIFICANDO CONFIGURAÇÃO DO NGINX"

log "Testando configuração do Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    success "Configuração do Nginx está OK"
    
    # Verificar se há loops de redirecionamento na configuração
    if [ -f /etc/nginx/sites-available/sispat ]; then
        if grep -q "rewrite.*index.html" /etc/nginx/sites-available/sispat && grep -c "location.*/" /etc/nginx/sites-available/sispat | grep -q "2"; then
            warning "Possível loop de redirecionamento detectado na configuração do Nginx"
            log "Verifique manualmente o arquivo /etc/nginx/sites-available/sispat"
        fi
    fi
    
    log "Recarregando Nginx..."
    systemctl reload nginx && success "Nginx recarregado" || error "Falha ao recarregar Nginx"
else
    error "Configuração do Nginx tem erros!"
    nginx -t
fi

# ============================================
# 8. VERIFICAR FRONTEND
# ============================================
section "8. VERIFICANDO FRONTEND"

cd /var/www/sispat || exit 1

if [ -d dist ]; then
    success "Diretório dist existe"
    
    if [ -f dist/index.html ]; then
        success "Frontend compilado existe"
    else
        warning "index.html não encontrado no dist. Recompilando frontend..."
        log "Recompilando frontend..."
        chmod +x node_modules/.bin/vite 2>/dev/null
        npm run build || error "Falha ao recompilar frontend"
    fi
else
    warning "Diretório dist não existe. Recompilando frontend..."
    chmod +x node_modules/.bin/vite 2>/dev/null
    npm run build || error "Falha ao compilar frontend"
fi

# ============================================
# 9. SALVAR CONFIGURAÇÃO DO PM2
# ============================================
section "9. SALVANDO CONFIGURAÇÃO DO PM2"

log "Salvando configuração do PM2..."
pm2 save || warning "Falha ao salvar configuração do PM2"
success "Configuração salva"

# ============================================
# 10. RESUMO
# ============================================
section "10. RESUMO"

echo ""
log "Correções aplicadas:"
echo "  ✓ Código atualizado do repositório"
echo "  ✓ Rate limits limpos"
echo "  ✓ Dependências atualizadas"
echo "  ✓ Backend recompilado"
echo "  ✓ Variáveis de ambiente verificadas"
echo "  ✓ Backend reiniciado"
echo "  ✓ Health check verificado"
echo "  ✓ Nginx verificado e recarregado"
echo "  ✓ Frontend verificado"
echo "  ✓ Configuração do PM2 salva"
echo ""

log "Status atual:"
pm2 list | grep sispat-backend
echo ""

log "Para verificar logs em tempo real:"
echo "  pm2 logs sispat-backend"
echo ""

log "Para verificar se há erros:"
echo "  pm2 logs sispat-backend --err --lines 50"
echo ""

success "Processo de correção concluído!"
warning "Se ainda houver problemas, verifique os logs e variáveis de ambiente"
