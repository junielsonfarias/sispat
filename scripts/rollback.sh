#!/bin/bash
# =================================
# SCRIPT DE ROLLBACK AUTOMATIZADO
# SISPAT - Sistema de Patrimônio
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV=${1:-production}
ROLLBACK_TYPE=${2:-immediate}  # immediate, graceful, version
TARGET_VERSION=${3:-}
DRY_RUN=${DRY_RUN:-false}

# Função de log
log() {
    echo -e "${GREEN}[ROLLBACK]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Banner
show_banner() {
    echo -e "${RED}"
    echo "========================================"
    echo "      SISPAT - Rollback de Emergência   "
    echo "========================================"
    echo -e "${NC}"
    echo "Ambiente: $DEPLOY_ENV"
    echo "Tipo: $ROLLBACK_TYPE"
    echo "Versão Alvo: ${TARGET_VERSION:-'anterior'}"
    echo "Dry Run: $DRY_RUN"
    echo "----------------------------------------"
}

# Validar parâmetros
validate_parameters() {
    step "Validando parâmetros..."
    
    case $DEPLOY_ENV in
        "staging"|"production")
            log "✅ Ambiente válido: $DEPLOY_ENV"
            ;;
        *)
            error "❌ Ambiente inválido: $DEPLOY_ENV (use: staging ou production)"
            ;;
    esac
    
    case $ROLLBACK_TYPE in
        "immediate"|"graceful"|"version")
            log "✅ Tipo de rollback válido: $ROLLBACK_TYPE"
            ;;
        *)
            error "❌ Tipo de rollback inválido: $ROLLBACK_TYPE (use: immediate, graceful, version)"
            ;;
    esac
    
    if [ "$ROLLBACK_TYPE" = "version" ] && [ -z "$TARGET_VERSION" ]; then
        error "❌ Versão alvo obrigatória para rollback por versão"
    fi
    
    log "✅ Parâmetros validados"
}

# Verificar estado atual
check_current_state() {
    step "Verificando estado atual do sistema..."
    
    # Verificar se Docker está rodando
    if ! docker info >/dev/null 2>&1; then
        error "❌ Docker não está rodando"
    fi
    
    # Verificar containers em execução
    local running_containers=$(docker ps --filter "name=sispat" --format "table {{.Names}}\t{{.Status}}" | grep -v NAMES || true)
    
    if [ -z "$running_containers" ]; then
        error "❌ Nenhum container SISPAT em execução"
    fi
    
    info "Containers em execução:"
    echo "$running_containers"
    
    # Identificar ambiente ativo
    local active_env=$(get_active_environment)
    info "Ambiente ativo atual: $active_env"
    
    export CURRENT_ACTIVE_ENV=$active_env
    
    log "✅ Estado atual verificado"
}

# Obter ambiente ativo
get_active_environment() {
    # Verificar qual ambiente está recebendo tráfego via Traefik
    if docker inspect sispat-blue 2>/dev/null | grep -q '"traefik.enable": "true"'; then
        echo "blue"
    elif docker inspect sispat-green 2>/dev/null | grep -q '"traefik.enable": "true"'; then
        echo "green"
    else
        # Fallback: verificar qual está rodando
        if docker ps --filter "name=sispat-blue" --filter "status=running" | grep -q sispat-blue; then
            echo "blue"
        elif docker ps --filter "name=sispat-green" --filter "status=running" | grep -q sispat-green; then
            echo "green"
        else
            error "❌ Não foi possível determinar o ambiente ativo"
        fi
    fi
}

# Obter versões disponíveis
get_available_versions() {
    step "Obtendo versões disponíveis..."
    
    # Listar imagens Docker disponíveis
    local images=$(docker images sispat --format "table {{.Tag}}\t{{.CreatedAt}}" | grep -v TAG | head -10)
    
    if [ -z "$images" ]; then
        error "❌ Nenhuma imagem SISPAT encontrada"
    fi
    
    info "Versões disponíveis:"
    echo "$images"
    
    log "✅ Versões disponíveis listadas"
}

# Fazer backup do estado atual
backup_current_state() {
    step "Fazendo backup do estado atual..."
    
    local backup_dir="$PROJECT_ROOT/backups/rollback-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup da configuração atual
    info "Salvando configuração atual..."
    if [ "$DRY_RUN" = "false" ]; then
        docker-compose -f docker-compose.$DEPLOY_ENV.yml config > "$backup_dir/docker-compose.yml"
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" > "$backup_dir/containers.txt"
    fi
    
    # Backup do banco de dados (se necessário)
    if [ "$BACKUP_DATABASE" = "true" ]; then
        info "Fazendo backup do banco de dados..."
        if [ "$DRY_RUN" = "false" ]; then
            docker exec sispat-postgres-$DEPLOY_ENV pg_dump -U sispat_user sispat_$DEPLOY_ENV > "$backup_dir/database.sql"
        fi
    fi
    
    export BACKUP_DIR=$backup_dir
    log "✅ Backup salvo em: $backup_dir"
}

# Rollback imediato
immediate_rollback() {
    step "Executando rollback imediato..."
    
    warn "⚠️  ATENÇÃO: Rollback imediato pode causar downtime!"
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        # Blue-Green rollback
        local target_env=$([ "$CURRENT_ACTIVE_ENV" = "blue" ] && echo "green" || echo "blue")
        
        info "Verificando se ambiente $target_env está disponível..."
        if ! docker ps --filter "name=sispat-$target_env" --filter "status=running" | grep -q sispat-$target_env; then
            warn "Ambiente $target_env não está rodando, iniciando..."
            if [ "$DRY_RUN" = "false" ]; then
                docker-compose -f docker-compose.production.yml up -d sispat-$target_env
                sleep 20
            fi
        fi
        
        # Verificar saúde do ambiente alvo
        info "Verificando saúde do ambiente $target_env..."
        if [ "$DRY_RUN" = "false" ]; then
            if ! health_check_environment $target_env; then
                error "❌ Ambiente $target_env não está saudável"
            fi
        fi
        
        # Switch de tráfego
        info "Redirecionando tráfego para $target_env..."
        if [ "$DRY_RUN" = "false" ]; then
            switch_traffic $target_env
        fi
        
    else
        # Staging rollback - restart com imagem anterior
        info "Reiniciando com versão anterior..."
        if [ "$DRY_RUN" = "false" ]; then
            docker-compose -f docker-compose.staging.yml down
            docker-compose -f docker-compose.staging.yml up -d
        fi
    fi
    
    log "✅ Rollback imediato concluído"
}

# Rollback gracioso
graceful_rollback() {
    step "Executando rollback gracioso..."
    
    info "Rollback gracioso minimiza downtime e permite drenagem de conexões"
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        # Blue-Green graceful rollback
        local target_env=$([ "$CURRENT_ACTIVE_ENV" = "blue" ] && echo "green" || echo "blue")
        
        info "Preparando ambiente $target_env..."
        if [ "$DRY_RUN" = "false" ]; then
            # Garantir que ambiente alvo está rodando
            docker-compose -f docker-compose.production.yml up -d sispat-$target_env
            sleep 30
            
            # Health check
            if ! health_check_environment $target_env; then
                error "❌ Ambiente $target_env não passou no health check"
            fi
        fi
        
        # Drenagem gradual de conexões
        info "Iniciando drenagem gradual de conexões..."
        if [ "$DRY_RUN" = "false" ]; then
            # Implementar drenagem gradual via load balancer
            # Por enquanto, aguardar um período
            sleep 30
        fi
        
        # Switch de tráfego
        info "Redirecionando tráfego para $target_env..."
        if [ "$DRY_RUN" = "false" ]; then
            switch_traffic $target_env
        fi
        
        # Aguardar estabilização
        info "Aguardando estabilização..."
        if [ "$DRY_RUN" = "false" ]; then
            sleep 60
        fi
        
    else
        # Staging graceful rollback
        info "Executando rollback gracioso para staging..."
        if [ "$DRY_RUN" = "false" ]; then
            # Rolling restart
            docker-compose -f docker-compose.staging.yml restart
        fi
    fi
    
    log "✅ Rollback gracioso concluído"
}

# Rollback para versão específica
version_rollback() {
    step "Executando rollback para versão $TARGET_VERSION..."
    
    # Verificar se a versão existe
    if ! docker images sispat:$TARGET_VERSION | grep -q $TARGET_VERSION; then
        error "❌ Versão $TARGET_VERSION não encontrada"
    fi
    
    info "Versão $TARGET_VERSION encontrada, procedendo com rollback..."
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        # Blue-Green rollback com versão específica
        local target_env=$([ "$CURRENT_ACTIVE_ENV" = "blue" ] && echo "green" || echo "blue")
        
        info "Atualizando ambiente $target_env para versão $TARGET_VERSION..."
        if [ "$DRY_RUN" = "false" ]; then
            # Parar ambiente alvo
            docker stop sispat-$target_env || true
            
            # Atualizar para versão específica
            docker run -d \
                --name sispat-$target_env \
                --network sispat-production \
                --env-file .env.production \
                -e VERSION=$target_env \
                sispat:$TARGET_VERSION
            
            sleep 30
            
            # Health check
            if ! health_check_environment $target_env; then
                error "❌ Versão $TARGET_VERSION não passou no health check"
            fi
            
            # Switch de tráfego
            switch_traffic $target_env
        fi
        
    else
        # Staging rollback com versão específica
        info "Atualizando staging para versão $TARGET_VERSION..."
        if [ "$DRY_RUN" = "false" ]; then
            docker-compose -f docker-compose.staging.yml down
            
            # Atualizar imagem no compose
            sed -i "s/image: sispat:.*/image: sispat:$TARGET_VERSION/" docker-compose.staging.yml
            
            docker-compose -f docker-compose.staging.yml up -d
        fi
    fi
    
    log "✅ Rollback para versão $TARGET_VERSION concluído"
}

# Health check de ambiente
health_check_environment() {
    local env=$1
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec sispat-$env ./health-check.sh >/dev/null 2>&1; then
            log "✅ Health check passou para ambiente $env"
            return 0
        fi
        
        attempt=$((attempt + 1))
        info "Tentativa $attempt/$max_attempts..."
        sleep 10
    done
    
    return 1
}

# Switch de tráfego
switch_traffic() {
    local target_env=$1
    
    info "Redirecionando tráfego para $target_env..."
    
    # Habilitar novo ambiente
    docker update --label traefik.enable=true sispat-$target_env
    
    # Aguardar propagação
    sleep 10
    
    # Desabilitar ambiente anterior
    local old_env=$([ "$target_env" = "blue" ] && echo "green" || echo "blue")
    docker update --label traefik.enable=false sispat-$old_env
    
    log "✅ Tráfego redirecionado para $target_env"
}

# Verificar sucesso do rollback
verify_rollback() {
    step "Verificando sucesso do rollback..."
    
    # Health check da aplicação
    info "Verificando saúde da aplicação..."
    local max_attempts=5
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost/api/health >/dev/null 2>&1; then
            log "✅ Aplicação respondendo corretamente"
            break
        fi
        
        attempt=$((attempt + 1))
        info "Tentativa $attempt/$max_attempts..."
        sleep 10
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "❌ Aplicação não está respondendo após rollback"
    fi
    
    # Verificar métricas básicas
    info "Verificando métricas básicas..."
    # Implementar verificações de métricas conforme necessário
    
    log "✅ Rollback verificado com sucesso"
}

# Limpeza pós-rollback
cleanup_after_rollback() {
    step "Executando limpeza pós-rollback..."
    
    # Remover containers temporários
    info "Removendo containers temporários..."
    if [ "$DRY_RUN" = "false" ]; then
        docker container prune -f
    fi
    
    # Limpeza de imagens não utilizadas (opcional)
    if [ "$CLEANUP_IMAGES" = "true" ]; then
        info "Limpando imagens não utilizadas..."
        if [ "$DRY_RUN" = "false" ]; then
            docker image prune -f
        fi
    fi
    
    log "✅ Limpeza concluída"
}

# Notificações
send_notification() {
    local status=$1
    local message=$2
    
    info "Enviando notificação: $message"
    
    # Implementar integração com Slack, Discord, etc.
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$message\"}" \
    #   "$SLACK_WEBHOOK_URL"
}

# Função principal
main() {
    show_banner
    
    # Confirmar operação (exceto se DRY_RUN)
    if [ "$DRY_RUN" = "false" ] && [ -t 0 ]; then
        read -p "⚠️  Tem certeza que deseja executar o rollback? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            warn "Operação cancelada pelo usuário"
            exit 0
        fi
    fi
    
    validate_parameters
    check_current_state
    
    if [ "$ROLLBACK_TYPE" = "version" ]; then
        get_available_versions
    fi
    
    backup_current_state
    
    # Executar rollback baseado no tipo
    case $ROLLBACK_TYPE in
        "immediate")
            immediate_rollback
            ;;
        "graceful")
            graceful_rollback
            ;;
        "version")
            version_rollback
            ;;
    esac
    
    verify_rollback
    cleanup_after_rollback
    
    # Notificar sucesso
    send_notification "success" "🔄 Rollback do SISPAT executado com sucesso! Ambiente: $DEPLOY_ENV, Tipo: $ROLLBACK_TYPE"
    
    log "🎉 Rollback concluído com sucesso!"
    log "📊 Backup salvo em: $BACKUP_DIR"
    log "🌐 Acesse: https://sispat$([ "$DEPLOY_ENV" = "staging" ] && echo "-staging").exemplo.com"
}

# Executar função principal
main "$@"
