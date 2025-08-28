#!/bin/bash
# =================================
# SCRIPT DE INICIALIZAÇÃO
# Prepara e inicia a aplicação SISPAT
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${GREEN}[START]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Banner de inicialização
show_banner() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "      SISPAT - Sistema de Patrimônio    "
    echo "========================================"
    echo -e "${NC}"
    echo "Versão: ${BUILD_VERSION:-dev}"
    echo "Ambiente: ${NODE_ENV:-development}"
    echo "Build: ${VCS_REF:-unknown}"
    echo "Data: ${BUILD_DATE:-$(date)}"
    echo "----------------------------------------"
}

# Verificar variáveis de ambiente obrigatórias
check_required_env() {
    log "Verificando variáveis de ambiente..."
    
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        error "Variáveis de ambiente obrigatórias não definidas:"
        for var in "${missing_vars[@]}"; do
            error "  - $var"
        done
        exit 1
    fi
    
    log "✅ Variáveis de ambiente verificadas"
}

# Aguardar dependências estarem disponíveis
wait_for_dependencies() {
    log "Aguardando dependências..."
    
    # Aguardar banco de dados
    if [ -n "$DATABASE_URL" ]; then
        info "Aguardando banco de dados..."
        
        # Extrair host e porta do DATABASE_URL
        # Exemplo: postgresql://user:pass@host:port/db
        local db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        local db_port=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if [ -n "$db_host" ] && [ -n "$db_port" ]; then
            local max_attempts=30
            local attempt=0
            
            while [ $attempt -lt $max_attempts ]; do
                if nc -z "$db_host" "$db_port" 2>/dev/null; then
                    log "✅ Banco de dados disponível"
                    break
                fi
                
                attempt=$((attempt + 1))
                info "Tentativa $attempt/$max_attempts - aguardando banco de dados..."
                sleep 2
            done
            
            if [ $attempt -eq $max_attempts ]; then
                error "❌ Timeout aguardando banco de dados"
                exit 1
            fi
        fi
    fi
    
    # Aguardar Redis (se configurado)
    if [ -n "$REDIS_URL" ]; then
        info "Aguardando Redis..."
        
        local redis_host=$(echo $REDIS_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        local redis_port=$(echo $REDIS_URL | sed -n 's/.*:\([0-9]*\)/\1/p')
        
        if [ -n "$redis_host" ] && [ -n "$redis_port" ]; then
            local max_attempts=15
            local attempt=0
            
            while [ $attempt -lt $max_attempts ]; do
                if nc -z "$redis_host" "$redis_port" 2>/dev/null; then
                    log "✅ Redis disponível"
                    break
                fi
                
                attempt=$((attempt + 1))
                info "Tentativa $attempt/$max_attempts - aguardando Redis..."
                sleep 1
            done
            
            if [ $attempt -eq $max_attempts ]; then
                warn "⚠️  Timeout aguardando Redis (não crítico)"
            fi
        fi
    fi
}

# Executar migrações do banco de dados
run_migrations() {
    log "Executando migrações do banco de dados..."
    
    # Verificar se deve executar migrações
    if [ "$RUN_MIGRATIONS" = "true" ] || [ "$NODE_ENV" = "production" ]; then
        info "Executando migrações..."
        
        # Executar migrações do Prisma (se disponível)
        if command -v prisma &> /dev/null; then
            npx prisma migrate deploy
            log "✅ Migrações executadas"
        else
            warn "⚠️  Prisma não encontrado, pulando migrações"
        fi
    else
        info "Migrações puladas (RUN_MIGRATIONS != true)"
    fi
}

# Inicializar sistema de cache
init_cache() {
    log "Inicializando sistema de cache..."
    
    if [ -n "$REDIS_URL" ]; then
        info "Cache Redis configurado"
    else
        info "Usando cache em memória"
    fi
    
    log "✅ Sistema de cache inicializado"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando monitoramento..."
    
    # Configurar métricas (se habilitado)
    if [ "$ENABLE_METRICS" = "true" ]; then
        info "Métricas habilitadas"
    fi
    
    # Configurar logs estruturados
    export LOG_LEVEL=${LOG_LEVEL:-info}
    export LOG_FORMAT=${LOG_FORMAT:-json}
    
    log "✅ Monitoramento configurado"
}

# Função de limpeza para shutdown graceful
cleanup() {
    log "Recebido sinal de shutdown, finalizando aplicação..."
    
    # Finalizar processos filhos
    if [ -n "$APP_PID" ]; then
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi
    
    log "✅ Aplicação finalizada graciosamente"
    exit 0
}

# Configurar handlers de sinal
trap cleanup SIGTERM SIGINT

# Função principal
main() {
    show_banner
    
    check_required_env
    wait_for_dependencies
    run_migrations
    init_cache
    setup_monitoring
    
    log "🚀 Iniciando aplicação SISPAT..."
    
    # Iniciar aplicação
    exec node server.js &
    APP_PID=$!
    
    log "✅ Aplicação iniciada (PID: $APP_PID)"
    log "🌐 Disponível em http://localhost:${PORT:-3000}"
    
    # Aguardar processo da aplicação
    wait "$APP_PID"
}

# Executar função principal
main "$@"
