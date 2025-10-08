#!/bin/bash

# ===========================================
# SISPAT 2.0 - SCRIPT DE DEPLOY AUTOMATIZADO
# ===========================================

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_NAME="sispat"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para verificar se o comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para backup
backup_database() {
    log "Criando backup do banco de dados..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
    
    BACKUP_FILE="$BACKUP_DIR/sispat_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if command_exists docker; then
        docker exec sispat-postgres pg_dump -U sispat_user -d sispat_prod > "$BACKUP_FILE"
    else
        pg_dump -U sispat_user -d sispat_prod > "$BACKUP_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        success "Backup criado: $BACKUP_FILE"
    else
        error "Falha ao criar backup"
    fi
}

# Função para verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Dependências faltando: ${missing_deps[*]}"
    fi
    
    success "Todas as dependências estão instaladas"
}

# Função para build
build_application() {
    log "Fazendo build da aplicação..."
    
    # Build do frontend
    log "Build do frontend..."
    pnpm install --frozen-lockfile
    pnpm run build:prod
    
    # Build do backend
    log "Build do backend..."
    cd backend
    npm install --production
    npm run build:prod
    cd ..
    
    success "Build concluído com sucesso"
}

# Função para deploy com Docker
deploy_docker() {
    log "Iniciando deploy com Docker..."
    
    # Parar containers existentes
    log "Parando containers existentes..."
    docker-compose -f docker-compose.prod.yml down
    
    # Build da imagem
    log "Fazendo build da imagem Docker..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Iniciar serviços
    log "Iniciando serviços..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Aguardar serviços ficarem prontos
    log "Aguardando serviços ficarem prontos..."
    sleep 30
    
    # Verificar saúde dos serviços
    check_services_health
    
    success "Deploy com Docker concluído"
}

# Função para deploy sem Docker
deploy_native() {
    log "Iniciando deploy nativo..."
    
    # Verificar se o banco está rodando
    if ! pg_isready -h localhost -p 5432 -U sispat_user; then
        error "Banco de dados não está acessível"
    fi
    
    # Executar migrações
    log "Executando migrações do banco..."
    cd backend
    npm run prisma:migrate:prod
    cd ..
    
    # Build da aplicação
    build_application
    
    # Parar processo existente
    log "Parando processo existente..."
    pkill -f "node.*backend/dist/index.js" || true
    
    # Iniciar aplicação
    log "Iniciando aplicação..."
    cd backend
    nohup npm run start:prod > ../logs/app.log 2>&1 &
    cd ..
    
    # Aguardar inicialização
    sleep 10
    
    # Verificar se está rodando
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        success "Deploy nativo concluído"
    else
        error "Falha ao iniciar aplicação"
    fi
}

# Função para verificar saúde dos serviços
check_services_health() {
    log "Verificando saúde dos serviços..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health >/dev/null 2>&1; then
            success "Serviços estão saudáveis"
            return 0
        fi
        
        log "Tentativa $attempt/$max_attempts - Aguardando serviços..."
        sleep 10
        ((attempt++))
    done
    
    error "Serviços não ficaram saudáveis após $max_attempts tentativas"
}

# Função para rollback
rollback() {
    log "Iniciando rollback..."
    
    # Parar containers
    docker-compose -f docker-compose.prod.yml down
    
    # Restaurar backup mais recente
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/sispat_backup_*.sql 2>/dev/null | head -n1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restaurando backup: $LATEST_BACKUP"
        docker exec -i sispat-postgres psql -U sispat_user -d sispat_prod < "$LATEST_BACKUP"
        success "Rollback concluído"
    else
        error "Nenhum backup encontrado para rollback"
    fi
}

# Função para limpeza
cleanup() {
    log "Limpando recursos..."
    
    # Remover imagens não utilizadas
    docker image prune -f
    
    # Remover volumes não utilizados
    docker volume prune -f
    
    # Limpar logs antigos
    find ./logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    success "Limpeza concluída"
}

# Função principal
main() {
    log "=== SISPAT 2.0 DEPLOY SCRIPT ==="
    
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            backup_database
            deploy_docker
            cleanup
            ;;
        "deploy-native")
            check_dependencies
            backup_database
            deploy_native
            ;;
        "rollback")
            rollback
            ;;
        "backup")
            backup_database
            ;;
        "health")
            check_services_health
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Uso: $0 {deploy|deploy-native|rollback|backup|health|cleanup}"
            echo ""
            echo "Comandos:"
            echo "  deploy        - Deploy completo com Docker (padrão)"
            echo "  deploy-native - Deploy nativo sem Docker"
            echo "  rollback      - Rollback para versão anterior"
            echo "  backup        - Criar backup do banco"
            echo "  health        - Verificar saúde dos serviços"
            echo "  cleanup       - Limpar recursos não utilizados"
            exit 1
            ;;
    esac
    
    success "Script executado com sucesso!"
}

# Executar função principal
main "$@"
