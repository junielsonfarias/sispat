#!/bin/bash

# Script de deploy automático do SISPAT em VPS
# Atualiza código, reconstrói e reinicia serviços

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
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

# Configurações
APP_DIR="/opt/sispat"
BACKUP_DIR="/opt/sispat/backups"
LOG_DIR="/var/log/sispat"
REPO_URL="https://github.com/seu-usuario/sispat.git"  # Atualize com sua URL
BRANCH="main"

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário com sudo."
fi

# Verificar se o diretório da aplicação existe
if [ ! -d "$APP_DIR" ]; then
    error "Diretório da aplicação não encontrado: $APP_DIR"
fi

# Fazer backup antes do deploy
create_backup() {
    log "Criando backup antes do deploy..."
    
    local backup_name="pre_deploy_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup do banco de dados
    if command -v pg_dump &> /dev/null; then
        pg_dump -h localhost -U sispat -d sispat > "$backup_path/database.sql"
        log "Backup do banco de dados criado"
    fi
    
    # Backup dos arquivos
    tar -czf "$backup_path/files.tar.gz" \
        --exclude=node_modules \
        --exclude=logs \
        --exclude=backups \
        --exclude=.git \
        -C "$APP_DIR" .
    
    log "Backup criado: $backup_path"
}

# Atualizar código do repositório
update_code() {
    log "Atualizando código do repositório..."
    
    cd "$APP_DIR"
    
    # Verificar se é um repositório git
    if [ ! -d ".git" ]; then
        warn "Diretório não é um repositório git. Clonando repositório..."
        cd /opt
        sudo rm -rf sispat
        sudo git clone "$REPO_URL" sispat
        sudo chown -R sispat:sispat sispat
        cd "$APP_DIR"
    fi
    
    # Fazer backup da configuração atual
    if [ -f ".env" ]; then
        cp .env .env.backup
    fi
    
    # Atualizar código
    git fetch origin
    git reset --hard origin/$BRANCH
    
    log "Código atualizado com sucesso"
}

# Instalar dependências
install_dependencies() {
    log "Instalando dependências..."
    
    cd "$APP_DIR"
    
    # Limpar cache do npm
    npm cache clean --force
    
    # Instalar dependências
    npm ci --production
    
    log "Dependências instaladas com sucesso"
}

# Construir aplicação
build_application() {
    log "Construindo aplicação..."
    
    cd "$APP_DIR"
    
    # Construir frontend
    npm run build
    
    log "Aplicação construída com sucesso"
}

# Executar migrações do banco
run_migrations() {
    log "Executando migrações do banco de dados..."
    
    cd "$APP_DIR"
    
    # Verificar se há script de migração
    if [ -f "scripts/migrate.js" ]; then
        node scripts/migrate.js
        log "Migrações executadas com sucesso"
    else
        warn "Script de migração não encontrado"
    fi
}

# Reiniciar serviços
restart_services() {
    log "Reiniciando serviços..."
    
    cd "$APP_DIR"
    
    # Parar aplicação
    pm2 stop ecosystem.config.js || true
    
    # Aguardar um pouco
    sleep 5
    
    # Iniciar aplicação
    pm2 start ecosystem.config.js
    
    # Salvar configuração do PM2
    pm2 save
    
    log "Serviços reiniciados com sucesso"
}

# Verificar saúde da aplicação
health_check() {
    log "Verificando saúde da aplicação..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3001/api/health > /dev/null; then
            log "Aplicação está funcionando corretamente"
            return 0
        fi
        
        log "Tentativa $attempt/$max_attempts - Aguardando aplicação..."
        sleep 10
        ((attempt++))
    done
    
    error "Aplicação não respondeu após $max_attempts tentativas"
}

# Limpar backups antigos
cleanup_old_backups() {
    log "Limpando backups antigos..."
    
    # Manter apenas backups dos últimos 7 dias
    find "$BACKUP_DIR" -name "pre_deploy_*" -mtime +7 -exec rm -rf {} \;
    
    log "Backups antigos removidos"
}

# Enviar notificação
send_notification() {
    local status=$1
    local message=$2
    
    # Aqui você pode adicionar integração com Slack, Discord, email, etc.
    log "Notificação: $status - $message"
    
    # Exemplo com curl para webhook
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"SISPAT Deploy: $status - $message\"}" \
    #     YOUR_WEBHOOK_URL
}

# Rollback em caso de erro
rollback() {
    log "Executando rollback..."
    
    cd "$APP_DIR"
    
    # Parar aplicação
    pm2 stop ecosystem.config.js || true
    
    # Restaurar backup mais recente
    local latest_backup=$(ls -t "$BACKUP_DIR"/pre_deploy_* | head -1)
    
    if [ -n "$latest_backup" ]; then
        log "Restaurando backup: $latest_backup"
        
        # Restaurar arquivos
        tar -xzf "$latest_backup/files.tar.gz" -C "$APP_DIR"
        
        # Restaurar banco de dados
        if [ -f "$latest_backup/database.sql" ]; then
            psql -h localhost -U sispat -d sispat < "$latest_backup/database.sql"
        fi
        
        # Reiniciar aplicação
        pm2 start ecosystem.config.js
        
        log "Rollback concluído com sucesso"
    else
        error "Nenhum backup encontrado para rollback"
    fi
}

# Função principal
main() {
    log "Iniciando deploy do SISPAT..."
    
    # Verificar se PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        error "PM2 não está instalado"
    fi
    
    # Verificar se Node.js está instalado
    if ! command -v node &> /dev/null; then
        error "Node.js não está instalado"
    fi
    
    # Verificar se npm está instalado
    if ! command -v npm &> /dev/null; then
        error "NPM não está instalado"
    fi
    
    # Executar deploy
    if create_backup && \
       update_code && \
       install_dependencies && \
       build_application && \
       run_migrations && \
       restart_services && \
       health_check; then
        
        cleanup_old_backups
        send_notification "SUCCESS" "Deploy concluído com sucesso"
        log "Deploy concluído com sucesso!"
        
    else
        error "Deploy falhou. Executando rollback..."
        rollback
        send_notification "FAILED" "Deploy falhou. Rollback executado"
        error "Deploy falhou e rollback foi executado"
    fi
}

# Função de rollback manual
rollback_manual() {
    log "Executando rollback manual..."
    rollback
    log "Rollback manual concluído"
}

# Verificar argumentos
case "${1:-}" in
    "rollback")
        rollback_manual
        ;;
    *)
        main
        ;;
esac
