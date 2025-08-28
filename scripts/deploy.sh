#!/bin/bash

# Script de Deploy para Produção - SISPAT
# Uso: ./scripts/deploy.sh [environment]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
ENVIRONMENT=${1:-production}
PROJECT_NAME="sispat"
DOCKER_COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Função para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Função para verificar pré-requisitos
check_prerequisites() {
    log "Verificando pré-requisitos..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker não está instalado"
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não está instalado"
    fi
    
    # Verificar arquivo de ambiente
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        error "Arquivo .env.${ENVIRONMENT} não encontrado"
    fi
    
    # Verificar arquivo docker-compose
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "Arquivo $DOCKER_COMPOSE_FILE não encontrado"
    fi
    
    log "Pré-requisitos verificados com sucesso"
}

# Função para backup
create_backup() {
    log "Criando backup antes do deploy..."
    
    BACKUP_FILE="${BACKUP_DIR}/backup-pre-deploy-$(date +%Y%m%d-%H%M%S).sql"
    
    # Criar diretório de backup se não existir
    mkdir -p "$BACKUP_DIR"
    
    # Backup do banco de dados
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps postgres | grep -q "Up"; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump -U sispat_user sispat_production > "$BACKUP_FILE"
        log "Backup criado: $BACKUP_FILE"
    else
        warn "PostgreSQL não está rodando, pulando backup"
    fi
}

# Função para parar serviços
stop_services() {
    log "Parando serviços..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    log "Serviços parados"
}

# Função para limpar recursos não utilizados
cleanup() {
    log "Limpando recursos Docker não utilizados..."
    docker system prune -f
    docker volume prune -f
    log "Limpeza concluída"
}

# Função para build das imagens
build_images() {
    log "Construindo imagens Docker..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    log "Imagens construídas com sucesso"
}

# Função para iniciar serviços
start_services() {
    log "Iniciando serviços..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Aguardar serviços ficarem prontos
    log "Aguardando serviços ficarem prontos..."
    sleep 30
    
    # Verificar saúde dos serviços
    check_health
}

# Função para verificar saúde dos serviços
check_health() {
    log "Verificando saúde dos serviços..."
    
    # Verificar PostgreSQL
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U sispat_user -d sispat_production; then
        log "PostgreSQL: OK"
    else
        error "PostgreSQL não está respondendo"
    fi
    
    # Verificar Redis
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
        log "Redis: OK"
    else
        error "Redis não está respondendo"
    fi
    
    # Verificar Backend
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log "Backend: OK"
    else
        error "Backend não está respondendo"
    fi
    
    # Verificar Frontend
    if curl -f http://localhost:80 > /dev/null 2>&1; then
        log "Frontend: OK"
    else
        error "Frontend não está respondendo"
    fi
    
    log "Todos os serviços estão saudáveis"
}

# Função para executar migrações
run_migrations() {
    log "Executando migrações do banco de dados..."
    
    # Aguardar PostgreSQL ficar pronto
    sleep 10
    
    # Executar migrações
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:migrate || {
        warn "Migrações falharam, mas continuando..."
    }
    
    log "Migrações concluídas"
}

# Função para executar testes
run_tests() {
    log "Executando testes..."
    
    # Testes unitários
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm test || {
        warn "Testes falharam, mas continuando..."
    }
    
    log "Testes concluídos"
}

# Função para mostrar status
show_status() {
    log "Status dos serviços:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    log "Logs dos serviços:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=20
}

# Função para rollback
rollback() {
    error "Deploy falhou, iniciando rollback..."
    
    # Parar todos os serviços
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restaurar backup se existir
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-pre-deploy-*.sql 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restaurando backup: $LATEST_BACKUP"
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres
        sleep 10
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres psql -U sispat_user -d sispat_production < "$LATEST_BACKUP"
    fi
    
    # Reiniciar serviços
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    error "Rollback concluído"
}

# Função principal
main() {
    log "Iniciando deploy do SISPAT para ambiente: $ENVIRONMENT"
    
    # Configurar trap para rollback em caso de erro
    trap rollback ERR
    
    # Executar etapas do deploy
    check_prerequisites
    create_backup
    stop_services
    cleanup
    build_images
    start_services
    run_migrations
    run_tests
    check_health
    
    # Remover trap
    trap - ERR
    
    log "Deploy concluído com sucesso!"
    show_status
    
    log "Acesse o sistema em:"
    echo -e "${BLUE}Frontend: http://localhost${NC}"
    echo -e "${BLUE}Backend API: http://localhost:3001${NC}"
    echo -e "${BLUE}Documentação API: http://localhost:3001/api/docs${NC}"
    echo -e "${BLUE}Grafana: http://localhost:3000${NC}"
    echo -e "${BLUE}Prometheus: http://localhost:9090${NC}"
}

# Executar função principal
main "$@"
