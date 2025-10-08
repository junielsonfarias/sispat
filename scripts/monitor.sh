#!/bin/bash

# ===========================================
# SISPAT 2.0 - SCRIPT DE MONITORAMENTO
# ===========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
LOG_FILE="/var/log/sispat-monitor.log"
ALERT_EMAIL="admin@sispat.seudominio.com"
MAX_MEMORY_PERCENT=85
MAX_CPU_PERCENT=80
MAX_ERROR_RATE=10
MAX_RESPONSE_TIME=5000

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para verificar saúde da aplicação
check_application_health() {
    log "Verificando saúde da aplicação..."
    
    # Verificar se a aplicação está respondendo
    if ! curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
        error "Aplicação não está respondendo"
        send_alert "CRITICAL" "Aplicação SISPAT não está respondendo"
        return 1
    fi
    
    # Obter métricas da aplicação
    local metrics=$(curl -s http://localhost:3000/api/metrics 2>/dev/null)
    if [ $? -ne 0 ]; then
        warning "Não foi possível obter métricas da aplicação"
        return 1
    fi
    
    # Extrair valores das métricas
    local memory_used=$(echo "$metrics" | jq -r '.current.memoryUsage.heapUsed // 0')
    local memory_total=$(echo "$metrics" | jq -r '.current.memoryUsage.heapTotal // 1')
    local error_rate=$(echo "$metrics" | jq -r '.statistics.errorRate // 0')
    local response_time=$(echo "$metrics" | jq -r '.statistics.averageResponseTime // 0')
    
    # Calcular percentual de memória
    local memory_percent=0
    if [ "$memory_total" -gt 0 ]; then
        memory_percent=$((memory_used * 100 / memory_total))
    fi
    
    log "Métricas: Memória: ${memory_percent}%, Taxa de erro: ${error_rate}%, Tempo de resposta: ${response_time}ms"
    
    # Verificar alertas
    if [ "$memory_percent" -gt "$MAX_MEMORY_PERCENT" ]; then
        error "Uso de memória alto: ${memory_percent}%"
        send_alert "WARNING" "Uso de memória alto: ${memory_percent}%"
    fi
    
    if (( $(echo "$error_rate > $MAX_ERROR_RATE" | bc -l) )); then
        error "Taxa de erro alta: ${error_rate}%"
        send_alert "WARNING" "Taxa de erro alta: ${error_rate}%"
    fi
    
    if (( $(echo "$response_time > $MAX_RESPONSE_TIME" | bc -l) )); then
        error "Tempo de resposta alto: ${response_time}ms"
        send_alert "WARNING" "Tempo de resposta alto: ${response_time}ms"
    fi
    
    success "Verificação de saúde concluída"
    return 0
}

# Função para verificar serviços do sistema
check_system_services() {
    log "Verificando serviços do sistema..."
    
    local services=("nginx" "postgresql" "sispat-backend")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "$service"; then
            error "Serviço $service não está ativo"
            failed_services+=("$service")
        else
            success "Serviço $service está ativo"
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        error "Serviços com falha: ${failed_services[*]}"
        send_alert "CRITICAL" "Serviços com falha: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Função para verificar recursos do sistema
check_system_resources() {
    log "Verificando recursos do sistema..."
    
    # Verificar uso de CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > $MAX_CPU_PERCENT" | bc -l) )); then
        warning "Uso de CPU alto: ${cpu_usage}%"
        send_alert "WARNING" "Uso de CPU alto: ${cpu_usage}%"
    fi
    
    # Verificar uso de memória
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$memory_usage" -gt "$MAX_MEMORY_PERCENT" ]; then
        warning "Uso de memória do sistema alto: ${memory_usage}%"
        send_alert "WARNING" "Uso de memória do sistema alto: ${memory_usage}%"
    fi
    
    # Verificar espaço em disco
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        error "Espaço em disco baixo: ${disk_usage}%"
        send_alert "CRITICAL" "Espaço em disco baixo: ${disk_usage}%"
    fi
    
    # Verificar inodes
    local inode_usage=$(df -i / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$inode_usage" -gt 90 ]; then
        error "Inodes baixos: ${inode_usage}%"
        send_alert "CRITICAL" "Inodes baixos: ${inode_usage}%"
    fi
    
    log "Recursos: CPU: ${cpu_usage}%, Memória: ${memory_usage}%, Disco: ${disk_usage}%, Inodes: ${inode_usage}%"
    return 0
}

# Função para verificar conectividade
check_connectivity() {
    log "Verificando conectividade..."
    
    # Verificar conectividade com banco de dados
    if ! pg_isready -h localhost -p 5432 -U sispat_user >/dev/null 2>&1; then
        error "Banco de dados não está acessível"
        send_alert "CRITICAL" "Banco de dados não está acessível"
        return 1
    fi
    
    # Verificar conectividade externa
    if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        warning "Conectividade externa com problemas"
        send_alert "WARNING" "Conectividade externa com problemas"
    fi
    
    success "Conectividade verificada"
    return 0
}

# Função para verificar logs de erro
check_error_logs() {
    log "Verificando logs de erro..."
    
    local error_count=0
    
    # Verificar logs do Nginx
    if [ -f "/var/log/nginx/error.log" ]; then
        local nginx_errors=$(tail -n 100 /var/log/nginx/error.log | grep -c "$(date +'%Y/%m/%d')" || true)
        if [ "$nginx_errors" -gt 10 ]; then
            warning "Muitos erros no Nginx: $nginx_errors"
            error_count=$((error_count + nginx_errors))
        fi
    fi
    
    # Verificar logs da aplicação
    if [ -f "/var/log/sispat/app.log" ]; then
        local app_errors=$(tail -n 100 /var/log/sispat/app.log | grep -c "ERROR" || true)
        if [ "$app_errors" -gt 5 ]; then
            warning "Muitos erros na aplicação: $app_errors"
            error_count=$((error_count + app_errors))
        fi
    fi
    
    if [ "$error_count" -gt 20 ]; then
        error "Muitos erros nos logs: $error_count"
        send_alert "WARNING" "Muitos erros nos logs: $error_count"
    fi
    
    return 0
}

# Função para enviar alertas
send_alert() {
    local severity="$1"
    local message="$2"
    
    log "ALERTA [$severity]: $message"
    
    # Enviar email (se configurado)
    if command -v mail >/dev/null 2>&1; then
        echo "Alerta SISPAT - $severity: $message" | mail -s "SISPAT Alert - $severity" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # Log para arquivo de alertas
    echo "$(date +'%Y-%m-%d %H:%M:%S') - [$severity] $message" >> "/var/log/sispat-alerts.log"
}

# Função para gerar relatório
generate_report() {
    log "Gerando relatório de monitoramento..."
    
    local report_file="/var/log/sispat-report-$(date +%Y%m%d).log"
    
    {
        echo "=== RELATÓRIO DE MONITORAMENTO SISPAT - $(date) ==="
        echo ""
        
        echo "=== SAÚDE DA APLICAÇÃO ==="
        curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "Não foi possível obter métricas"
        echo ""
        
        echo "=== RECURSOS DO SISTEMA ==="
        echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
        echo "Memória: $(free -h | grep Mem | awk '{print $3"/"$2}')"
        echo "Disco: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5")"}')"
        echo ""
        
        echo "=== SERVIÇOS ==="
        systemctl status nginx --no-pager -l
        systemctl status postgresql --no-pager -l
        systemctl status sispat-backend --no-pager -l
        echo ""
        
        echo "=== CONECTIVIDADE ==="
        pg_isready -h localhost -p 5432 -U sispat_user
        echo ""
        
        echo "=== LOGS RECENTES ==="
        echo "Nginx errors (últimas 10):"
        tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "Nenhum erro encontrado"
        echo ""
        echo "Aplicação errors (últimas 10):"
        tail -n 10 /var/log/sispat/app.log 2>/dev/null | grep "ERROR" || echo "Nenhum erro encontrado"
        
    } > "$report_file"
    
    log "Relatório gerado: $report_file"
}

# Função para limpeza de logs
cleanup_logs() {
    log "Limpando logs antigos..."
    
    # Limpar logs do Nginx (manter 30 dias)
    find /var/log/nginx -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Limpar logs da aplicação (manter 30 dias)
    find /var/log/sispat -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Limpar relatórios antigos (manter 7 dias)
    find /var/log -name "sispat-report-*.log" -mtime +7 -delete 2>/dev/null || true
    
    success "Limpeza de logs concluída"
}

# Função principal
main() {
    log "=== SISPAT 2.0 MONITORING SCRIPT ==="
    
    local exit_code=0
    
    # Verificações principais
    check_application_health || exit_code=1
    check_system_services || exit_code=1
    check_system_resources || exit_code=1
    check_connectivity || exit_code=1
    check_error_logs || exit_code=1
    
    # Ações de manutenção
    if [ "$1" = "--report" ]; then
        generate_report
    fi
    
    if [ "$1" = "--cleanup" ]; then
        cleanup_logs
    fi
    
    if [ $exit_code -eq 0 ]; then
        success "Todas as verificações passaram"
    else
        error "Algumas verificações falharam"
    fi
    
    exit $exit_code
}

# Executar função principal
main "$@"
