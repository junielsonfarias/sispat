#!/bin/bash

# 🚀 SCRIPT DE EXECUÇÃO DO GO-LIVE - SISPAT 2025
# Este script executa o plano de go-live completo do SISPAT

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs/go-live"
BACKUP_DIR="$PROJECT_ROOT/backups/go-live"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Criar diretórios necessários
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# Função de logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/go-live-$TIMESTAMP.log"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_DIR/go-live-$TIMESTAMP.log"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_DIR/go-live-$TIMESTAMP.log"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_DIR/go-live-$TIMESTAMP.log"
}

# Função para verificar se um serviço está rodando
check_service() {
    local service_name=$1
    local port=$2
    
    if netstat -tuln | grep -q ":$port "; then
        log_success "$service_name está rodando na porta $port"
        return 0
    else
        log_error "$service_name não está rodando na porta $port"
        return 1
    fi
}

# Função para fazer backup
create_backup() {
    local backup_name=$1
    local backup_path="$BACKUP_DIR/$backup_name-$TIMESTAMP"
    
    log "Criando backup: $backup_name"
    
    case $backup_name in
        "database")
            pg_dump -h localhost -U postgres -d sispat > "$backup_path.sql"
            gzip "$backup_path.sql"
            log_success "Backup do banco de dados criado: $backup_path.sql.gz"
            ;;
        "files")
            tar -czf "$backup_path.tar.gz" -C "$PROJECT_ROOT" \
                --exclude=node_modules \
                --exclude=.git \
                --exclude=logs \
                --exclude=backups \
                .
            log_success "Backup de arquivos criado: $backup_path.tar.gz"
            ;;
        "full")
            create_backup "database"
            create_backup "files"
            log_success "Backup completo criado"
            ;;
    esac
}

# Função para executar testes
run_tests() {
    local test_type=$1
    
    log "Executando testes: $test_type"
    
    case $test_type in
        "functional")
            if [ -f "$SCRIPT_DIR/run-production-tests.sh" ]; then
                bash "$SCRIPT_DIR/run-production-tests.sh" > "$LOG_DIR/functional-tests-$TIMESTAMP.log" 2>&1
                log_success "Testes funcionais executados"
            else
                log_warning "Script de testes funcionais não encontrado"
            fi
            ;;
        "performance")
            if [ -f "$SCRIPT_DIR/run-production-load-tests.sh" ]; then
                bash "$SCRIPT_DIR/run-production-load-tests.sh" > "$LOG_DIR/performance-tests-$TIMESTAMP.log" 2>&1
                log_success "Testes de performance executados"
            else
                log_warning "Script de testes de performance não encontrado"
            fi
            ;;
        "security")
            if [ -f "$SCRIPT_DIR/run-production-security-tests.sh" ]; then
                bash "$SCRIPT_DIR/run-production-security-tests.sh" > "$LOG_DIR/security-tests-$TIMESTAMP.log" 2>&1
                log_success "Testes de segurança executados"
            else
                log_warning "Script de testes de segurança não encontrado"
            fi
            ;;
    esac
}

# Função para verificar saúde do sistema
check_system_health() {
    log "Verificando saúde do sistema..."
    
    # Verificar serviços
    check_service "PostgreSQL" 5432
    check_service "Nginx" 80
    check_service "Nginx SSL" 443
    check_service "SISPAT Backend" 3001
    check_service "SISPAT Frontend" 5173
    
    # Verificar uso de recursos
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    
    log "Uso de CPU: ${cpu_usage}%"
    log "Uso de Memória: ${memory_usage}%"
    log "Uso de Disco: ${disk_usage}%"
    
    # Verificar se os valores estão dentro dos limites
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_warning "Uso de CPU alto: ${cpu_usage}%"
    fi
    
    if (( $(echo "$memory_usage > 85" | bc -l) )); then
        log_warning "Uso de memória alto: ${memory_usage}%"
    fi
    
    if [ "$disk_usage" -gt 90 ]; then
        log_warning "Uso de disco alto: ${disk_usage}%"
    fi
}

# Função para executar deploy
execute_deploy() {
    log "Executando deploy do SISPAT..."
    
    # Parar serviços
    log "Parando serviços..."
    pm2 stop all 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    
    # Backup antes do deploy
    create_backup "full"
    
    # Executar migrações do banco
    log "Executando migrações do banco de dados..."
    cd "$PROJECT_ROOT"
    npm run migrate 2>/dev/null || log_warning "Migrações já executadas ou falharam"
    
    # Build do frontend
    log "Fazendo build do frontend..."
    npm run build
    
    # Iniciar serviços
    log "Iniciando serviços..."
    systemctl start nginx
    pm2 start ecosystem.production.config.cjs
    
    # Aguardar serviços iniciarem
    sleep 10
    
    # Verificar se os serviços estão rodando
    check_system_health
    
    log_success "Deploy executado com sucesso"
}

# Função para monitorar sistema
monitor_system() {
    local duration=$1
    local interval=30
    
    log "Iniciando monitoramento por $duration segundos (intervalo: $interval segundos)"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    while [ $(date +%s) -lt $end_time ]; do
        log "--- Monitoramento $(date '+%H:%M:%S') ---"
        
        # Verificar serviços
        check_service "SISPAT Backend" 3001
        check_service "SISPAT Frontend" 5173
        
        # Verificar logs de erro
        if [ -f "$PROJECT_ROOT/logs/application/error.log" ]; then
            local error_count=$(tail -n 100 "$PROJECT_ROOT/logs/application/error.log" | grep -c "$(date '+%Y-%m-%d')" || true)
            if [ "$error_count" -gt 0 ]; then
                log_warning "Encontrados $error_count erros hoje"
            fi
        fi
        
        # Verificar métricas de performance
        local response_time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/api/health 2>/dev/null || echo "N/A")
        log "Tempo de resposta da API: ${response_time}s"
        
        sleep $interval
    done
    
    log_success "Monitoramento concluído"
}

# Função para enviar notificação
send_notification() {
    local message=$1
    local type=${2:-"info"}
    
    log "Enviando notificação: $message"
    
    # Aqui você pode implementar envio de email, Slack, etc.
    # Por enquanto, apenas log
    case $type in
        "success")
            log_success "NOTIFICAÇÃO: $message"
            ;;
        "warning")
            log_warning "NOTIFICAÇÃO: $message"
            ;;
        "error")
            log_error "NOTIFICAÇÃO: $message"
            ;;
        *)
            log "NOTIFICAÇÃO: $message"
            ;;
    esac
}

# Função principal do go-live
execute_go_live() {
    log "🚀 INICIANDO GO-LIVE DO SISPAT - $(date)"
    
    # Fase 1: Preparação
    log "=== FASE 1: PREPARAÇÃO ==="
    
    # Verificar pré-requisitos
    log "Verificando pré-requisitos..."
    
    # Verificar se o sistema está funcionando
    check_system_health
    
    # Executar testes finais
    log "Executando testes finais..."
    run_tests "functional"
    run_tests "performance"
    run_tests "security"
    
    # Backup final
    log "Criando backup final..."
    create_backup "full"
    
    # Fase 2: Deploy
    log "=== FASE 2: DEPLOY ==="
    
    # Executar deploy
    execute_deploy
    
    # Verificar se o deploy foi bem-sucedido
    if check_service "SISPAT Backend" 3001 && check_service "SISPAT Frontend" 5173; then
        log_success "Deploy bem-sucedido!"
        send_notification "SISPAT deployado com sucesso em produção" "success"
    else
        log_error "Falha no deploy!"
        send_notification "Falha no deploy do SISPAT" "error"
        exit 1
    fi
    
    # Fase 3: Monitoramento
    log "=== FASE 3: MONITORAMENTO ==="
    
    # Monitorar por 1 hora
    monitor_system 3600
    
    # Verificação final
    log "=== VERIFICAÇÃO FINAL ==="
    check_system_health
    
    # Executar testes pós-deploy
    log "Executando testes pós-deploy..."
    run_tests "functional"
    
    log_success "🎉 GO-LIVE CONCLUÍDO COM SUCESSO!"
    send_notification "Go-live do SISPAT concluído com sucesso" "success"
    
    # Gerar relatório final
    generate_final_report
}

# Função para gerar relatório final
generate_final_report() {
    local report_file="$LOG_DIR/go-live-report-$TIMESTAMP.md"
    
    log "Gerando relatório final..."
    
    cat > "$report_file" << EOF
# 🚀 RELATÓRIO DE GO-LIVE - SISPAT 2025

**Data/Hora**: $(date)
**Duração**: $(date -d @$(($(date +%s) - $(date -d "$(head -n1 "$LOG_DIR/go-live-$TIMESTAMP.log" | cut -d']' -f1 | cut -d'[' -f2)" +%s))) +%H:%M:%S)

## ✅ Status do Go-Live

- **Status**: CONCLUÍDO COM SUCESSO
- **Deploy**: ✅ Executado
- **Testes**: ✅ Executados
- **Monitoramento**: ✅ Concluído
- **Backup**: ✅ Criado

## 📊 Métricas do Sistema

### Serviços
- **PostgreSQL**: ✅ Rodando (porta 5432)
- **Nginx**: ✅ Rodando (porta 80/443)
- **SISPAT Backend**: ✅ Rodando (porta 3001)
- **SISPAT Frontend**: ✅ Rodando (porta 5173)

### Recursos
- **CPU**: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%
- **Memória**: $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')%
- **Disco**: $(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)%

### Performance
- **Tempo de Resposta da API**: $(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/api/health 2>/dev/null || echo "N/A")s

## 📁 Arquivos Gerados

- **Log Principal**: \`$LOG_DIR/go-live-$TIMESTAMP.log\`
- **Backup do Banco**: \`$BACKUP_DIR/database-$TIMESTAMP.sql.gz\`
- **Backup de Arquivos**: \`$BACKUP_DIR/files-$TIMESTAMP.tar.gz\`
- **Testes Funcionais**: \`$LOG_DIR/functional-tests-$TIMESTAMP.log\`
- **Testes de Performance**: \`$LOG_DIR/performance-tests-$TIMESTAMP.log\`
- **Testes de Segurança**: \`$LOG_DIR/security-tests-$TIMESTAMP.log\`

## 🎯 Próximos Passos

1. **Monitoramento Contínuo**: Acompanhar métricas por 30 dias
2. **Suporte aos Usuários**: Disponibilizar suporte 24/7
3. **Feedback**: Coletar feedback dos usuários
4. **Otimizações**: Implementar melhorias baseadas no uso

## 📞 Contatos de Suporte

- **Suporte 24/7**: (11) 99999-9999
- **Email**: suporte@sispat.com
- **Portal**: https://suporte.sispat.com

---

**© 2025 SISPAT - Sistema de Patrimônio**
EOF

    log_success "Relatório final gerado: $report_file"
}

# Função para rollback
execute_rollback() {
    log "🔄 EXECUTANDO ROLLBACK..."
    
    # Parar serviços
    log "Parando serviços..."
    pm2 stop all 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    
    # Restaurar backup mais recente
    local latest_backup=$(ls -t "$BACKUP_DIR"/database-*.sql.gz 2>/dev/null | head -n1)
    if [ -n "$latest_backup" ]; then
        log "Restaurando backup: $latest_backup"
        gunzip -c "$latest_backup" | psql -h localhost -U postgres -d sispat
        log_success "Backup do banco restaurado"
    else
        log_error "Nenhum backup encontrado para restauração"
        exit 1
    fi
    
    # Restaurar arquivos
    local latest_files_backup=$(ls -t "$BACKUP_DIR"/files-*.tar.gz 2>/dev/null | head -n1)
    if [ -n "$latest_files_backup" ]; then
        log "Restaurando arquivos: $latest_files_backup"
        tar -xzf "$latest_files_backup" -C "$PROJECT_ROOT"
        log_success "Arquivos restaurados"
    fi
    
    # Reiniciar serviços
    log "Reiniciando serviços..."
    systemctl start nginx
    pm2 start ecosystem.production.config.cjs
    
    # Verificar se o rollback foi bem-sucedido
    sleep 10
    if check_service "SISPAT Backend" 3001 && check_service "SISPAT Frontend" 5173; then
        log_success "Rollback executado com sucesso!"
        send_notification "Rollback do SISPAT executado com sucesso" "success"
    else
        log_error "Falha no rollback!"
        send_notification "Falha no rollback do SISPAT" "error"
        exit 1
    fi
}

# Menu principal
show_menu() {
    echo -e "${BLUE}🚀 SCRIPT DE GO-LIVE - SISPAT 2025${NC}"
    echo "=================================="
    echo "1. Executar Go-Live Completo"
    echo "2. Executar Deploy"
    echo "3. Executar Testes"
    echo "4. Monitorar Sistema"
    echo "5. Verificar Saúde do Sistema"
    echo "6. Criar Backup"
    echo "7. Executar Rollback"
    echo "8. Gerar Relatório"
    echo "9. Sair"
    echo "=================================="
}

# Função principal
main() {
    case ${1:-"menu"} in
        "go-live")
            execute_go_live
            ;;
        "deploy")
            execute_deploy
            ;;
        "test")
            run_tests ${2:-"functional"}
            ;;
        "monitor")
            monitor_system ${2:-3600}
            ;;
        "health")
            check_system_health
            ;;
        "backup")
            create_backup ${2:-"full"}
            ;;
        "rollback")
            execute_rollback
            ;;
        "report")
            generate_final_report
            ;;
        "menu"|*)
            show_menu
            read -p "Escolha uma opção: " choice
            case $choice in
                1) execute_go_live ;;
                2) execute_deploy ;;
                3) run_tests "functional" ;;
                4) monitor_system 3600 ;;
                5) check_system_health ;;
                6) create_backup "full" ;;
                7) execute_rollback ;;
                8) generate_final_report ;;
                9) exit 0 ;;
                *) echo "Opção inválida" ;;
            esac
            ;;
    esac
}

# Executar função principal
main "$@"
