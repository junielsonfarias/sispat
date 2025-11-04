#!/bin/bash

# Script para diagnosticar por que o backend não está iniciando
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

cd /var/www/sispat || exit 1

# ============================================
# 1. VERIFICAR LOGS DO PM2
# ============================================
section "1. LOGS DE ERRO DO BACKEND (ÚLTIMAS 50 LINHAS)"

log "Verificando erros recentes..."
pm2 logs sispat-backend --err --lines 50 --nostream

echo ""
log "Logs completos (últimas 30 linhas)..."
pm2 logs sispat-backend --lines 30 --nostream

# ============================================
# 2. VERIFICAR STATUS DO PM2
# ============================================
section "2. STATUS DETALHADO DO PM2"

pm2 describe sispat-backend

# ============================================
# 3. VERIFICAR SE O BACKEND ESTÁ ESCUTANDO
# ============================================
section "3. VERIFICAR PORTA 3000"

log "Verificando se algo está escutando na porta 3000..."
if ss -tuln 2>/dev/null | grep -q ":3000" || netstat -tuln 2>/dev/null | grep -q ":3000"; then
    success "Algo está escutando na porta 3000"
    ss -tuln | grep ":3000" || netstat -tuln | grep ":3000"
else
    error "Nada está escutando na porta 3000"
fi

# ============================================
# 4. VERIFICAR ARQUIVO COMPILADO
# ============================================
section "4. VERIFICAR ARQUIVO COMPILADO"

cd /var/www/sispat/backend || exit 1

if [ -f dist/index.js ]; then
    success "Arquivo compilado existe: dist/index.js"
    log "Verificando tamanho do arquivo..."
    ls -lh dist/index.js
    
    log "Verificando primeiras linhas do arquivo..."
    head -20 dist/index.js
else
    error "Arquivo compilado NÃO existe: dist/index.js"
fi

# ============================================
# 5. VERIFICAR VARIÁVEIS DE AMBIENTE
# ============================================
section "5. VERIFICAR VARIÁVEIS DE AMBIENTE CRÍTICAS"

if [ -f .env ]; then
    log "Verificando variáveis críticas..."
    
    echo "PORT: $(grep '^PORT=' .env | cut -d'=' -f2)"
    echo "HOST: $(grep '^HOST=' .env | cut -d'=' -f2)"
    echo "NODE_ENV: $(grep '^NODE_ENV=' .env | cut -d'=' -f2)"
    echo "DATABASE_URL: $(grep '^DATABASE_URL=' .env | cut -d'=' -f2 | cut -c1-30)..."
    
    if grep -q "^JWT_SECRET=" .env; then
        success "JWT_SECRET está configurado"
    else
        error "JWT_SECRET NÃO está configurado!"
    fi
else
    error "Arquivo .env não encontrado!"
fi

# ============================================
# 6. TENTAR EXECUTAR MANUALMENTE
# ============================================
section "6. TENTAR EXECUTAR BACKEND MANUALMENTE (TESTE RÁPIDO)"

log "Parando o backend no PM2..."
pm2 stop sispat-backend 2>/dev/null

log "Aguardando 2 segundos..."
sleep 2

log "Tentando executar diretamente (apenas para ver o erro)..."
cd /var/www/sispat/backend || exit 1
timeout 5 node dist/index.js 2>&1 | head -30 || warning "Backend não iniciou (esperado - timeout de 5s)"

log "Reiniciando no PM2..."
pm2 start backend/dist/index.js --name sispat-backend || error "Falha ao iniciar no PM2"

# ============================================
# 7. VERIFICAR PROCESSOS NODE
# ============================================
section "7. PROCESSOS NODE EM EXECUÇÃO"

ps aux | grep -E "node|pm2" | grep -v grep

# ============================================
# RESUMO
# ============================================
section "RESUMO"

log "Verifique os erros acima. Os logs do PM2 geralmente mostram o problema."
log ""
log "Para ver logs em tempo real:"
log "  pm2 logs sispat-backend --err"
log ""
log "Para reiniciar o backend:"
log "  pm2 restart sispat-backend"
