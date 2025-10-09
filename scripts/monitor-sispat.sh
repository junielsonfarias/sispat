#!/bin/bash

# ============================================
# SISPAT 2.0 - SCRIPT DE MONITORAMENTO
# ============================================
# Descrição: Monitora saúde do sistema
# Autor: SISPAT Team
# Data: 09/10/2025
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
APP_DIR="${APP_DIR:-/var/www/sispat}"
API_URL="${API_URL:-http://localhost:3000}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
LOG_FILE="/var/log/sispat-monitor.log"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=85
RESPONSE_TIME_THRESHOLD=2000  # ms

# Função de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para enviar alerta
send_alert() {
    local title="$1"
    local message="$2"
    local severity="$3"  # info, warning, error
    
    # Email
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "SISPAT Alert: $title" "$ALERT_EMAIL"
    fi
    
    # Slack
    if [ -n "$SLACK_WEBHOOK" ] && command -v curl &> /dev/null; then
        local color="good"
        [ "$severity" = "warning" ] && color="warning"
        [ "$severity" = "error" ] && color="danger"
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$title\",
                    \"text\": \"$message\",
                    \"footer\": \"SISPAT Monitor\",
                    \"ts\": $(date +%s)
                }]
            }" &> /dev/null
    fi
}

# ============================================
# VERIFICAÇÕES
# ============================================

ERRORS=0
WARNINGS=0

log "========================================="
log "INICIANDO MONITORAMENTO DO SISPAT"
log "========================================="

# 1. Verificar Backend
log "[1/8] Verificando backend..."
START_TIME=$(date +%s%3N)

if HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" 2>/dev/null); then
    END_TIME=$(date +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))
    
    if [ "$HTTP_CODE" = "200" ]; then
        if [ "$RESPONSE_TIME" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
            warning "Backend respondendo LENTO (${RESPONSE_TIME}ms > ${RESPONSE_TIME_THRESHOLD}ms)"
            send_alert "Backend Lento" "Tempo de resposta: ${RESPONSE_TIME}ms" "warning"
            WARNINGS=$((WARNINGS + 1))
        else
            success "Backend OK (${RESPONSE_TIME}ms)"
        fi
    else
        error "Backend retornou código $HTTP_CODE"
        send_alert "Backend Error" "HTTP Code: $HTTP_CODE" "error"
        ERRORS=$((ERRORS + 1))
    fi
else
    error "Backend NÃO está respondendo"
    send_alert "Backend Down" "Não foi possível conectar ao backend" "error"
    ERRORS=$((ERRORS + 1))
fi

# 2. Verificar PM2
log "[2/8] Verificando PM2..."
if command -v pm2 &> /dev/null; then
    if pm2 jlist | jq -e '.[] | select(.name=="sispat-backend" and .pm2_env.status=="online")' &> /dev/null; then
        success "PM2 OK - Backend online"
    else
        error "PM2 - Backend não está online"
        send_alert "PM2 Error" "Backend não está rodando no PM2" "error"
        ERRORS=$((ERRORS + 1))
    fi
else
    warning "PM2 não instalado"
    WARNINGS=$((WARNINGS + 1))
fi

# 3. Verificar PostgreSQL
log "[3/8] Verificando PostgreSQL..."
if docker ps | grep -q "sispat-postgres"; then
    if docker exec sispat-postgres pg_isready -U postgres &> /dev/null; then
        success "PostgreSQL OK"
    else
        error "PostgreSQL não está aceitando conexões"
        send_alert "PostgreSQL Error" "Banco não está aceitando conexões" "error"
        ERRORS=$((ERRORS + 1))
    fi
else
    error "Container PostgreSQL não está rodando"
    send_alert "PostgreSQL Down" "Container não está rodando" "error"
    ERRORS=$((ERRORS + 1))
fi

# 4. Verificar Nginx
log "[4/8] Verificando Nginx..."
if systemctl is-active --quiet nginx; then
    success "Nginx OK"
else
    error "Nginx não está rodando"
    send_alert "Nginx Down" "Nginx não está ativo" "error"
    ERRORS=$((ERRORS + 1))
fi

# 5. Verificar CPU
log "[5/8] Verificando uso de CPU..."
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
CPU_USAGE=${CPU_USAGE%.*}

if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
    warning "CPU em ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
    send_alert "Alto uso de CPU" "CPU: ${CPU_USAGE}%" "warning"
    WARNINGS=$((WARNINGS + 1))
else
    success "CPU OK (${CPU_USAGE}%)"
fi

# 6. Verificar Memória
log "[6/8] Verificando uso de memória..."
MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')

if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
    warning "Memória em ${MEMORY_USAGE}% (threshold: ${MEMORY_THRESHOLD}%)"
    send_alert "Alto uso de Memória" "Memória: ${MEMORY_USAGE}%" "warning"
    WARNINGS=$((WARNINGS + 1))
else
    success "Memória OK (${MEMORY_USAGE}%)"
fi

# 7. Verificar Disco
log "[7/8] Verificando uso de disco..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print int($5)}')

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    warning "Disco em ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
    send_alert "Alto uso de Disco" "Disco: ${DISK_USAGE}%" "warning"
    WARNINGS=$((WARNINGS + 1))
else
    success "Disco OK (${DISK_USAGE}%)"
fi

# 8. Verificar Logs de Erro
log "[8/8] Verificando logs de erro..."
if [ -f "$APP_DIR/backend/logs/error.log" ]; then
    # Contar erros nas últimas 24 horas
    ERROR_COUNT=$(find "$APP_DIR/backend/logs" -name "error*.log" -mtime -1 -exec grep -c "ERROR" {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}')
    
    if [ -z "$ERROR_COUNT" ]; then
        ERROR_COUNT=0
    fi
    
    if [ "$ERROR_COUNT" -gt 100 ]; then
        warning "Muitos erros nos logs (${ERROR_COUNT} nas últimas 24h)"
        send_alert "Alto volume de erros" "Erros: ${ERROR_COUNT} nas últimas 24h" "warning"
        WARNINGS=$((WARNINGS + 1))
    else
        success "Logs OK (${ERROR_COUNT} erros nas últimas 24h)"
    fi
else
    log "Arquivo de log não encontrado"
fi

# ============================================
# RESUMO
# ============================================

log ""
log "========================================="
log "MONITORAMENTO CONCLUÍDO"
log "========================================="
log "Timestamp: $(date)"
log "Erros: $ERRORS"
log "Warnings: $WARNINGS"
log "========================================="

# Determinar código de saída
if [ "$ERRORS" -gt 0 ]; then
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    exit 2
else
    exit 0
fi

