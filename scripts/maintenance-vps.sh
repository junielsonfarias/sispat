#!/bin/bash

# Script de manutenção e monitoramento do SISPAT em VPS
# Executa tarefas de manutenção, limpeza e monitoramento

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
}

# Configurações
APP_DIR="/opt/sispat"
LOG_DIR="/var/log/sispat"
BACKUP_DIR="/opt/sispat/backups"

# Verificar saúde do sistema
check_system_health() {
    log "Verificando saúde do sistema..."
    
    # Verificar uso de memória
    local memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    if (( $(echo "$memory_usage > 80" | bc -l) )); then
        warn "Uso de memória alto: ${memory_usage}%"
    else
        log "Uso de memória: ${memory_usage}%"
    fi
    
    # Verificar uso de disco
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $disk_usage -gt 80 ]; then
        warn "Uso de disco alto: ${disk_usage}%"
    else
        log "Uso de disco: ${disk_usage}%"
    fi
    
    # Verificar uso de CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        warn "Uso de CPU alto: ${cpu_usage}%"
    else
        log "Uso de CPU: ${cpu_usage}%"
    fi
    
    # Verificar espaço em /tmp
    local tmp_usage=$(df /tmp | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $tmp_usage -gt 90 ]; then
        warn "Espaço em /tmp baixo: ${tmp_usage}%"
    fi
}

# Verificar saúde da aplicação
check_app_health() {
    log "Verificando saúde da aplicação..."
    
    # Verificar se PM2 está rodando
    if ! pm2 list | grep -q "sispat-backend"; then
        error "Aplicação SISPAT não está rodando"
        return 1
    fi
    
    # Verificar se a API responde
    if ! curl -f -s http://localhost:3001/api/health > /dev/null; then
        error "API não está respondendo"
        return 1
    fi
    
    # Verificar se o frontend responde
    if ! curl -f -s http://localhost:8080 > /dev/null; then
        error "Frontend não está respondendo"
        return 1
    fi
    
    log "Aplicação está funcionando corretamente"
    return 0
}

# Limpar logs antigos
cleanup_logs() {
    log "Limpando logs antigos..."
    
    # Limpar logs do sistema
    sudo journalctl --vacuum-time=7d
    
    # Limpar logs da aplicação
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete
    
    # Limpar logs do PM2
    pm2 flush
    
    log "Logs antigos removidos"
}

# Limpar cache
cleanup_cache() {
    log "Limpando cache..."
    
    # Limpar cache do npm
    npm cache clean --force
    
    # Limpar cache do sistema
    sudo sync
    echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
    
    # Limpar cache do Redis
    if command -v redis-cli &> /dev/null; then
        redis-cli FLUSHDB
    fi
    
    log "Cache limpo"
}

# Limpar arquivos temporários
cleanup_temp_files() {
    log "Limpando arquivos temporários..."
    
    # Limpar /tmp
    sudo find /tmp -type f -mtime +7 -delete
    
    # Limpar arquivos temporários da aplicação
    find "$APP_DIR" -name "*.tmp" -delete
    find "$APP_DIR" -name "*.temp" -delete
    
    log "Arquivos temporários removidos"
}

# Otimizar banco de dados
optimize_database() {
    log "Otimizando banco de dados..."
    
    # Executar VACUUM no PostgreSQL
    sudo -u postgres psql -d sispat -c "VACUUM ANALYZE;"
    
    # Verificar tamanho do banco
    local db_size=$(sudo -u postgres psql -d sispat -t -c "SELECT pg_size_pretty(pg_database_size('sispat'));" | xargs)
    log "Tamanho do banco de dados: $db_size"
    
    log "Banco de dados otimizado"
}

# Verificar atualizações de segurança
check_security_updates() {
    log "Verificando atualizações de segurança..."
    
    # Verificar atualizações do sistema
    if command -v apt &> /dev/null; then
        local updates=$(apt list --upgradable 2>/dev/null | wc -l)
        if [ $updates -gt 1 ]; then
            warn "Há $((updates-1)) atualizações disponíveis"
        else
            log "Sistema atualizado"
        fi
    fi
    
    # Verificar vulnerabilidades do npm
    if [ -f "$APP_DIR/package.json" ]; then
        cd "$APP_DIR"
        if npm audit --audit-level=moderate; then
            log "Nenhuma vulnerabilidade encontrada"
        else
            warn "Vulnerabilidades encontradas no npm"
        fi
    fi
}

# Fazer backup
create_backup() {
    log "Criando backup..."
    
    local backup_name="maintenance_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup do banco de dados
    pg_dump -h localhost -U sispat -d sispat > "$backup_path/database.sql"
    
    # Backup dos arquivos
    tar -czf "$backup_path/files.tar.gz" \
        --exclude=node_modules \
        --exclude=logs \
        --exclude=backups \
        --exclude=.git \
        -C "$APP_DIR" .
    
    log "Backup criado: $backup_path"
}

# Limpar backups antigos
cleanup_old_backups() {
    log "Limpando backups antigos..."
    
    # Manter apenas backups dos últimos 30 dias
    find "$BACKUP_DIR" -name "maintenance_*" -mtime +30 -exec rm -rf {} \;
    
    log "Backups antigos removidos"
}

# Reiniciar serviços se necessário
restart_services_if_needed() {
    log "Verificando se é necessário reiniciar serviços..."
    
    local need_restart=false
    
    # Verificar se a aplicação está respondendo
    if ! check_app_health; then
        warn "Aplicação não está funcionando. Reiniciando..."
        need_restart=true
    fi
    
    # Verificar uso de memória
    local memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        warn "Uso de memória muito alto. Reiniciando aplicação..."
        need_restart=true
    fi
    
    if [ "$need_restart" = true ]; then
        cd "$APP_DIR"
        pm2 restart ecosystem.config.js
        log "Serviços reiniciados"
    else
        log "Serviços não precisam ser reiniciados"
    fi
}

# Gerar relatório
generate_report() {
    log "Gerando relatório de manutenção..."
    
    local report_file="$LOG_DIR/maintenance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== Relatório de Manutenção SISPAT ==="
        echo "Data: $(date)"
        echo
        
        echo "=== Status do Sistema ==="
        echo "Uso de memória: $(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')%"
        echo "Uso de disco: $(df / | tail -1 | awk '{print $5}')"
        echo "Uso de CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%"
        echo
        
        echo "=== Status da Aplicação ==="
        pm2 list
        echo
        
        echo "=== Tamanho do Banco de Dados ==="
        sudo -u postgres psql -d sispat -t -c "SELECT pg_size_pretty(pg_database_size('sispat'));" | xargs
        echo
        
        echo "=== Espaço em Disco ==="
        df -h
        echo
        
        echo "=== Processos Node.js ==="
        ps aux | grep node | grep -v grep
        echo
        
    } > "$report_file"
    
    log "Relatório gerado: $report_file"
}

# Função principal
main() {
    log "Iniciando manutenção do SISPAT..."
    
    check_system_health
    check_app_health
    cleanup_logs
    cleanup_cache
    cleanup_temp_files
    optimize_database
    check_security_updates
    create_backup
    cleanup_old_backups
    restart_services_if_needed
    generate_report
    
    log "Manutenção concluída com sucesso!"
}

# Função de limpeza rápida
quick_cleanup() {
    log "Executando limpeza rápida..."
    
    cleanup_logs
    cleanup_cache
    cleanup_temp_files
    
    log "Limpeza rápida concluída"
}

# Função de verificação de saúde
health_check() {
    log "Executando verificação de saúde..."
    
    check_system_health
    check_app_health
    
    log "Verificação de saúde concluída"
}

# Verificar argumentos
case "${1:-}" in
    "cleanup")
        quick_cleanup
        ;;
    "health")
        health_check
        ;;
    "backup")
        create_backup
        ;;
    *)
        main
        ;;
esac
