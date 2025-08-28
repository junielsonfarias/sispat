#!/bin/bash
# =================================
# HEALTH CHECK SCRIPT
# Verifica se a aplicação está saudável
# =================================

set -e

# Configurações
HOST=${HOST:-localhost}
PORT=${PORT:-3000}
TIMEOUT=${HEALTH_TIMEOUT:-3}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${GREEN}[HEALTH]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Health check básico da aplicação
check_app() {
    log "Verificando aplicação em http://${HOST}:${PORT}/api/health..."
    
    if curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/api/health" > /dev/null 2>&1; then
        log "✅ Aplicação respondendo"
        return 0
    else
        error "❌ Aplicação não está respondendo"
        return 1
    fi
}

# Health check do banco de dados
check_database() {
    log "Verificando conexão com banco de dados..."
    
    if curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/api/health/db" > /dev/null 2>&1; then
        log "✅ Banco de dados conectado"
        return 0
    else
        warn "⚠️  Banco de dados com problemas"
        return 1
    fi
}

# Health check do Redis
check_redis() {
    log "Verificando conexão com Redis..."
    
    if curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/api/health/redis" > /dev/null 2>&1; then
        log "✅ Redis conectado"
        return 0
    else
        warn "⚠️  Redis com problemas"
        return 1
    fi
}

# Health check das dependências críticas
check_dependencies() {
    local db_ok=0
    local redis_ok=0
    
    check_database || db_ok=1
    check_redis || redis_ok=1
    
    if [ $db_ok -eq 1 ]; then
        error "❌ Banco de dados crítico indisponível"
        return 1
    fi
    
    if [ $redis_ok -eq 1 ]; then
        warn "⚠️  Redis indisponível (não crítico)"
    fi
    
    return 0
}

# Função principal
main() {
    log "Iniciando health check..."
    
    # Verificar aplicação (crítico)
    if ! check_app; then
        error "Health check falhou: aplicação não responde"
        exit 1
    fi
    
    # Verificar dependências
    if ! check_dependencies; then
        error "Health check falhou: dependências críticas indisponíveis"
        exit 1
    fi
    
    log "✅ Health check passou - aplicação saudável!"
    exit 0
}

# Executar health check
main "$@"
