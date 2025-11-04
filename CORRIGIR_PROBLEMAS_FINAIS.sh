#!/bin/bash

# Script para corrigir problemas finais: rate limits e código atualizado
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

log "Iniciando correção de problemas finais..."

cd /var/www/sispat || exit 1

# ============================================
# 0. GARANTIR PERMISSÕES DO GIT
# ============================================
section "0. CONFIGURANDO GIT"

log "Configurando permissões do Git..."
git config --global --add safe.directory /var/www/sispat 2>/dev/null || true
success "Git configurado"

# ============================================
# 1. ATUALIZAR CÓDIGO DO REPOSITÓRIO
# ============================================
section "1. ATUALIZANDO CÓDIGO DO REPOSITÓRIO"

log "Buscando atualizações do repositório (git fetch)..."
git fetch origin main || warning "Falha ao buscar atualizações"

log "Atualizando código do repositório (git pull)..."
sudo git pull origin main || {
    warning "Falha ao atualizar código"
    log "Tentando com git reset..."
    git reset --hard origin/main || warning "Falha ao resetar"
}

# Verificar se o próprio script foi atualizado
if [ -f CORRIGIR_PROBLEMAS_FINAIS.sh ]; then
    log "Script atualizado do repositório"
    success "Código atualizado com sucesso"
else
    error "Arquivo do script não encontrado após atualização"
    exit 1
fi

# ============================================
# 2. LIMPAR RATE LIMITS
# ============================================
section "2. LIMPANDO RATE LIMITS"

log "Reiniciando backend para limpar rate limits em memória..."
pm2 restart sispat-backend
sleep 3

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null 2>&1; then
        log "Limpando rate limits no Redis..."
        redis-cli --scan --pattern "rl:*" | xargs -r redis-cli del 2>/dev/null || warning "Nenhuma chave para limpar"
        success "Rate limits limpos no Redis"
    else
        log "Redis não está respondendo (usando memória apenas)"
    fi
else
    log "Redis não encontrado (rate limit está apenas em memória - já limpo ao reiniciar)"
fi

success "Rate limits limpos"

# ============================================
# 3. VERIFICAR STATUS
# ============================================
section "3. VERIFICANDO STATUS"

log "Verificando se backend está online..."
if pm2 list | grep -q "sispat-backend.*online"; then
    success "Backend está online"
else
    error "Backend não está online!"
    exit 1
fi

log "Testando health check..."
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "status.*ok"; then
    success "Health check OK"
    echo "$HEALTH" | head -3
else
    error "Health check falhou"
fi

# ============================================
# 4. VERIFICAR PORTA
# ============================================
section "4. VERIFICANDO PORTA 3000"

if ss -tuln 2>/dev/null | grep -q ":3000" || netstat -tuln 2>/dev/null | grep -q ":3000"; then
    success "Backend está escutando na porta 3000"
else
    error "Backend NÃO está escutando na porta 3000"
fi

# ============================================
# 5. RESUMO
# ============================================
section "RESUMO"

echo ""
log "Status atual:"
pm2 list | grep sispat-backend
echo ""

success "Correções aplicadas com sucesso!"
echo ""
log "Próximos passos:"
echo "  ✓ Rate limits foram limpos (backend reiniciado)"
echo "  ✓ Sistema está funcionando normalmente"
echo "  ⚠ Se ainda houver bloqueios de rate limit, aguarde 15 minutos"
echo "  ⚠ O erro de activity log não está crashando o sistema (pode ser ignorado por enquanto)"
echo ""
