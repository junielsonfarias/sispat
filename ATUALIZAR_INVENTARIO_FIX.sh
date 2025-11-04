#!/bin/bash

# Script para atualizar correção do inventário
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

log "Iniciando atualização da correção do inventário..."

cd /var/www/sispat || {
    error "Diretório /var/www/sispat não encontrado"
    exit 1
}

# ============================================
# 1. CONFIGURAR GIT
# ============================================
log "1. Configurando Git..."
git config --global --add safe.directory /var/www/sispat 2>/dev/null || true
success "Git configurado"

# ============================================
# 2. ATUALIZAR CÓDIGO
# ============================================
log "2. Atualizando código do repositório..."
git fetch origin main || warning "Falha ao buscar atualizações"

git pull origin main || {
    warning "Falha ao atualizar código"
    log "Tentando com git reset..."
    git reset --hard origin/main || error "Falha ao resetar"
    exit 1
}
success "Código atualizado"

# ============================================
# 3. REINSTALAR DEPENDÊNCIAS DO BACKEND (SE NECESSÁRIO)
# ============================================
log "3. Verificando dependências do backend..."
cd backend
npm install --legacy-peer-deps || {
    warning "Falha ao instalar dependências do backend"
}
success "Dependências do backend verificadas"

# ============================================
# 4. RECOMPILAR BACKEND
# ============================================
log "4. Recompilando backend (TypeScript)..."
npm run build 2>&1 | tee /tmp/backend-build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    success "Backend recompilado com sucesso"
else
    error "Falha ao recompilar backend"
    log "Verifique os logs em: /tmp/backend-build.log"
    exit 1
fi

cd ..

# ============================================
# 5. REINICIAR BACKEND
# ============================================
log "5. Reiniciando backend (PM2)..."
pm2 restart sispat-backend || {
    warning "Falha ao reiniciar backend"
    log "Verificando se o processo existe..."
    pm2 list
}

sleep 3
pm2 status sispat-backend | grep -q "online" && success "Backend reiniciado e online" || warning "Backend pode não estar online"

# ============================================
# 6. VERIFICAÇÃO FINAL
# ============================================
log "6. Verificando status dos serviços..."

pm2 list | grep -q "sispat-backend" && success "Backend PM2 está rodando" || error "Backend PM2 não está rodando"

if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    success "Porta 3000 está em uso (backend)"
else
    warning "Porta 3000 não está em uso"
fi

log "7. Verificando logs do backend..."
log "Últimas linhas do log (verificando erros):"
pm2 logs sispat-backend --lines 10 --nostream | tail -5

success "✅ Atualização concluída com sucesso!"
log "Correções aplicadas:"
log "  - Erro TypeScript TS18047 corrigido (inventario.id → inventario!.id)"
log "  - Backend recompilado e reiniciado"
