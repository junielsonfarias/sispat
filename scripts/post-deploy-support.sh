#!/bin/bash

# 🆘 SCRIPT DE SUPORTE PÓS-DEPLOY - SISPAT 2025
# Este script gerencia suporte pós-deploy e resolução de problemas

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs/support"
TICKETS_DIR="$PROJECT_ROOT/logs/tickets"
KNOWLEDGE_BASE="$PROJECT_ROOT/docs/knowledge-base"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Criar diretórios necessários
mkdir -p "$LOG_DIR" "$TICKETS_DIR" "$KNOWLEDGE_BASE"

# Configurações de suporte
SUPPORT_LEVELS=("L1" "L2" "L3")
SUPPORT_PRIORITIES=("LOW" "MEDIUM" "HIGH" "CRITICAL")
SUPPORT_STATUSES=("OPEN" "IN_PROGRESS" "RESOLVED" "CLOSED")

# Função de logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/support-$TIMESTAMP.log"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_DIR/support-$TIMESTAMP.log"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_DIR/support-$TIMESTAMP.log"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_DIR/support-$TIMESTAMP.log"
}

# Função para criar ticket de suporte
create_support_ticket() {
    local ticket_id="TICKET-$(date +%Y%m%d-%H%M%S)"
    local user_name=$1
    local user_email=$2
    local issue_type=$3
    local priority=$4
    local description=$5
    
    log "Criando ticket de suporte: $ticket_id"
    
    local ticket_file="$TICKETS_DIR/$ticket_id.md"
    
    cat > "$ticket_file" << EOF
# 🎫 TICKET DE SUPORTE - $ticket_id

**Data de Criação**: $(date '+%d/%m/%Y %H:%M:%S')
**Status**: OPEN
**Prioridade**: $priority
**Nível**: L1

## 👤 Informações do Usuário

- **Nome**: $user_name
- **Email**: $user_email
- **Tipo de Problema**: $issue_type

## 📝 Descrição do Problema

$description

## 🔧 Ações Tomadas

- [ ] Problema identificado
- [ ] Solução implementada
- [ ] Teste realizado
- [ ] Usuário notificado

## 📋 Histórico

- **$(date '+%d/%m/%Y %H:%M:%S')**: Ticket criado
- **$(date '+%d/%m/%Y %H:%M:%S')**: Atribuído ao nível L1

## 📞 Contatos

- **Suporte**: suporte@sispat.com
- **Telefone**: (11) 99999-9999

---

**© 2025 SISPAT - Sistema de Patrimônio**
EOF

    log_success "Ticket criado: $ticket_id"
    echo "$ticket_id"
}

# Função para atualizar ticket
update_ticket() {
    local ticket_id=$1
    local action=$2
    local details=$3
    local assigned_to=${4:-"Sistema"}
    
    local ticket_file="$TICKETS_DIR/$ticket_id.md"
    
    if [ ! -f "$ticket_file" ]; then
        log_error "Ticket não encontrado: $ticket_id"
        return 1
    fi
    
    log "Atualizando ticket: $ticket_id - $action"
    
    # Adicionar entrada no histórico
    local history_entry="
- **$(date '+%d/%m/%Y %H:%M:%S')**: $action por $assigned_to"
    if [ -n "$details" ]; then
        history_entry="$history_entry - $details"
    fi
    
    # Inserir no arquivo antes da linha de contatos
    sed -i "/^## 📞 Contatos/i\\$history_entry" "$ticket_file"
    
    # Atualizar status se necessário
    case $action in
        "IN_PROGRESS")
            sed -i "s/\*\*Status\*\*: .*/\*\*Status\*\*: IN_PROGRESS/" "$ticket_file"
            ;;
        "RESOLVED")
            sed -i "s/\*\*Status\*\*: .*/\*\*Status\*\*: RESOLVED/" "$ticket_file"
            ;;
        "CLOSED")
            sed -i "s/\*\*Status\*\*: .*/\*\*Status\*\*: CLOSED/" "$ticket_file"
            ;;
    esac
    
    log_success "Ticket atualizado: $ticket_id"
}

# Função para diagnosticar problema comum
diagnose_common_issue() {
    local issue_type=$1
    local ticket_id=$2
    
    log "Diagnosticando problema: $issue_type"
    
    case $issue_type in
        "login_issue")
            log "Verificando problemas de login..."
            
            # Verificar se o backend está rodando
            if ! netstat -tuln | grep -q ":3001 "; then
                log_error "Backend não está rodando"
                update_ticket "$ticket_id" "DIAGNOSIS" "Backend offline - reiniciando serviços"
                restart_services
                return 0
            fi
            
            # Verificar banco de dados
            if ! psql -h localhost -U postgres -d sispat -c "SELECT 1;" >/dev/null 2>&1; then
                log_error "Banco de dados não acessível"
                update_ticket "$ticket_id" "DIAGNOSIS" "Banco de dados offline - reiniciando PostgreSQL"
                systemctl restart postgresql
                return 0
            fi
            
            log_success "Sistema funcionando normalmente"
            update_ticket "$ticket_id" "DIAGNOSIS" "Sistema funcionando - problema pode ser de credenciais"
            ;;
            
        "performance_issue")
            log "Verificando problemas de performance..."
            
            # Verificar uso de CPU
            local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
            if (( $(echo "$cpu_usage > 80" | bc -l) )); then
                log_warning "CPU alto: ${cpu_usage}%"
                update_ticket "$ticket_id" "DIAGNOSIS" "CPU alto: ${cpu_usage}% - verificando processos"
                check_high_cpu_processes
            fi
            
            # Verificar uso de memória
            local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
            if (( $(echo "$memory_usage > 85" | bc -l) )); then
                log_warning "Memória alta: ${memory_usage}%"
                update_ticket "$ticket_id" "DIAGNOSIS" "Memória alta: ${memory_usage}% - verificando processos"
                check_high_memory_processes
            fi
            
            # Verificar tempo de resposta
            local response_time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/api/health 2>/dev/null || echo "0")
            if (( $(echo "$response_time > 2.0" | bc -l) )); then
                log_warning "Tempo de resposta alto: ${response_time}s"
                update_ticket "$ticket_id" "DIAGNOSIS" "Tempo de resposta alto: ${response_time}s"
            fi
            
            log_success "Diagnóstico de performance concluído"
            ;;
            
        "data_issue")
            log "Verificando problemas de dados..."
            
            # Verificar integridade do banco
            local db_check=$(psql -h localhost -U postgres -d sispat -c "SELECT COUNT(*) FROM patrimonios;" 2>/dev/null | tail -n 1 | tr -d ' ')
            if [ -n "$db_check" ] && [ "$db_check" -gt 0 ]; then
                log_success "Banco de dados acessível com $db_check patrimônios"
                update_ticket "$ticket_id" "DIAGNOSIS" "Banco de dados acessível - $db_check patrimônios encontrados"
            else
                log_error "Problema no banco de dados"
                update_ticket "$ticket_id" "DIAGNOSIS" "Problema no banco de dados - verificando conexão"
            fi
            ;;
            
        "access_issue")
            log "Verificando problemas de acesso..."
            
            # Verificar Nginx
            if ! netstat -tuln | grep -q ":80 "; then
                log_error "Nginx não está rodando"
                update_ticket "$ticket_id" "DIAGNOSIS" "Nginx offline - reiniciando"
                systemctl restart nginx
                return 0
            fi
            
            # Verificar SSL
            if ! netstat -tuln | grep -q ":443 "; then
                log_warning "SSL não está ativo"
                update_ticket "$ticket_id" "DIAGNOSIS" "SSL não ativo - verificando certificados"
            fi
            
            log_success "Verificação de acesso concluída"
            ;;
    esac
}

# Função para verificar processos com alto uso de CPU
check_high_cpu_processes() {
    log "Verificando processos com alto uso de CPU..."
    
    echo -e "${YELLOW}Top 10 processos por CPU:${NC}"
    top -bn1 | head -20
    
    # Verificar se há processos Node.js com alto uso
    local node_processes=$(ps aux | grep node | grep -v grep | awk '{print $2, $3, $11}' | sort -k2 -nr | head -5)
    if [ -n "$node_processes" ]; then
        log_warning "Processos Node.js com alto uso de CPU:"
        echo "$node_processes"
    fi
}

# Função para verificar processos com alto uso de memória
check_high_memory_processes() {
    log "Verificando processos com alto uso de memória..."
    
    echo -e "${YELLOW}Top 10 processos por memória:${NC}"
    ps aux --sort=-%mem | head -11
    
    # Verificar se há processos Node.js com alto uso de memória
    local node_processes=$(ps aux | grep node | grep -v grep | awk '{print $2, $4, $11}' | sort -k2 -nr | head -5)
    if [ -n "$node_processes" ]; then
        log_warning "Processos Node.js com alto uso de memória:"
        echo "$node_processes"
    fi
}

# Função para reiniciar serviços
restart_services() {
    log "Reiniciando serviços do SISPAT..."
    
    # Parar PM2
    pm2 stop all 2>/dev/null || true
    sleep 5
    
    # Reiniciar PostgreSQL
    systemctl restart postgresql
    sleep 10
    
    # Reiniciar Nginx
    systemctl restart nginx
    sleep 5
    
    # Iniciar PM2
    pm2 start ecosystem.production.config.cjs
    sleep 10
    
    # Verificar se os serviços estão rodando
    if netstat -tuln | grep -q ":3001 " && netstat -tuln | grep -q ":80 "; then
        log_success "Serviços reiniciados com sucesso"
        return 0
    else
        log_error "Falha ao reiniciar serviços"
        return 1
    fi
}

# Função para executar solução automática
execute_automatic_solution() {
    local issue_type=$1
    local ticket_id=$2
    
    log "Executando solução automática para: $issue_type"
    
    case $issue_type in
        "login_issue")
            restart_services
            if [ $? -eq 0 ]; then
                update_ticket "$ticket_id" "SOLUTION" "Serviços reiniciados automaticamente"
                update_ticket "$ticket_id" "RESOLVED" "Problema resolvido - serviços reiniciados"
            else
                update_ticket "$ticket_id" "ESCALATION" "Falha na solução automática - escalando para L2"
            fi
            ;;
            
        "performance_issue")
            # Limpar logs antigos
            find "$PROJECT_ROOT/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
            
            # Reiniciar PM2
            pm2 restart all
            
            update_ticket "$ticket_id" "SOLUTION" "Logs limpos e PM2 reiniciado"
            update_ticket "$ticket_id" "RESOLVED" "Problema de performance resolvido"
            ;;
            
        "access_issue")
            systemctl restart nginx
            sleep 5
            
            if netstat -tuln | grep -q ":80 "; then
                update_ticket "$ticket_id" "SOLUTION" "Nginx reiniciado"
                update_ticket "$ticket_id" "RESOLVED" "Problema de acesso resolvido"
            else
                update_ticket "$ticket_id" "ESCALATION" "Falha ao reiniciar Nginx - escalando para L2"
            fi
            ;;
    esac
}

# Função para escalar ticket
escalate_ticket() {
    local ticket_id=$1
    local current_level=$2
    local reason=$3
    
    log "Escalando ticket $ticket_id de $current_level"
    
    case $current_level in
        "L1")
            update_ticket "$ticket_id" "ESCALATION" "Escalado para L2 - $reason"
            sed -i "s/\*\*Nível\*\*: L1/\*\*Nível\*\*: L2/" "$TICKETS_DIR/$ticket_id.md"
            ;;
        "L2")
            update_ticket "$ticket_id" "ESCALATION" "Escalado para L3 - $reason"
            sed -i "s/\*\*Nível\*\*: L2/\*\*Nível\*\*: L3/" "$TICKETS_DIR/$ticket_id.md"
            ;;
        "L3")
            update_ticket "$ticket_id" "ESCALATION" "Escalado para desenvolvimento - $reason"
            ;;
    esac
}

# Função para listar tickets
list_tickets() {
    local status=${1:-"ALL"}
    
    log "Listando tickets (status: $status)"
    
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                        🎫 TICKETS DE SUPORTE                ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    local count=0
    for ticket_file in "$TICKETS_DIR"/*.md; do
        if [ -f "$ticket_file" ]; then
            local ticket_id=$(basename "$ticket_file" .md)
            local status_line=$(grep "^\*\*Status\*\*:" "$ticket_file" | cut -d':' -f2 | tr -d ' ')
            local priority_line=$(grep "^\*\*Prioridade\*\*:" "$ticket_file" | cut -d':' -f2 | tr -d ' ')
            local date_line=$(grep "^\*\*Data de Criação\*\*:" "$ticket_file" | cut -d':' -f2- | tr -d ' ')
            
            if [ "$status" = "ALL" ] || [ "$status" = "$status_line" ]; then
                count=$((count + 1))
                echo -e "${CYAN}Ticket: $ticket_id${NC}"
                echo -e "  Status: $status_line"
                echo -e "  Prioridade: $priority_line"
                echo -e "  Data: $date_line"
                echo
            fi
        fi
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}Nenhum ticket encontrado${NC}"
    else
        echo -e "${GREEN}Total: $count tickets${NC}"
    fi
}

# Função para gerar relatório de suporte
generate_support_report() {
    local report_file="$LOG_DIR/support-report-$TIMESTAMP.md"
    
    log "Gerando relatório de suporte..."
    
    cat > "$report_file" << EOF
# 🆘 RELATÓRIO DE SUPORTE - SISPAT 2025

**Período**: $(date '+%d/%m/%Y %H:%M:%S')

## 📊 Estatísticas de Tickets

### Por Status
EOF

    for status in "${SUPPORT_STATUSES[@]}"; do
        local count=$(grep -l "^\*\*Status\*\*: $status" "$TICKETS_DIR"/*.md 2>/dev/null | wc -l)
        echo "- **$status**: $count tickets" >> "$report_file"
    done

    cat >> "$report_file" << EOF

### Por Prioridade
EOF

    for priority in "${SUPPORT_PRIORITIES[@]}"; do
        local count=$(grep -l "^\*\*Prioridade\*\*: $priority" "$TICKETS_DIR"/*.md 2>/dev/null | wc -l)
        echo "- **$priority**: $count tickets" >> "$report_file"
    done

    cat >> "$report_file" << EOF

### Por Nível
EOF

    for level in "${SUPPORT_LEVELS[@]}"; do
        local count=$(grep -l "^\*\*Nível\*\*: $level" "$TICKETS_DIR"/*.md 2>/dev/null | wc -l)
        echo "- **$level**: $count tickets" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## 🎫 Tickets Recentes

EOF

    # Listar últimos 10 tickets
    ls -t "$TICKETS_DIR"/*.md 2>/dev/null | head -10 | while read ticket_file; do
        if [ -f "$ticket_file" ]; then
            local ticket_id=$(basename "$ticket_file" .md)
            local status_line=$(grep "^\*\*Status\*\*:" "$ticket_file" | cut -d':' -f2 | tr -d ' ')
            local priority_line=$(grep "^\*\*Prioridade\*\*:" "$ticket_file" | cut -d':' -f2 | tr -d ' ')
            local date_line=$(grep "^\*\*Data de Criação\*\*:" "$ticket_file" | cut -d':' -f2- | tr -d ' ')
            
            echo "- **$ticket_id**: $status_line ($priority_line) - $date_line" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF

## 📈 Métricas de Performance

- **Tempo Médio de Resolução**: [A calcular]
- **Taxa de Resolução L1**: [A calcular]
- **Taxa de Escalação**: [A calcular]

## 🎯 Recomendações

1. **Monitoramento**: Manter monitoramento ativo
2. **Documentação**: Atualizar base de conhecimento
3. **Treinamento**: Capacitar equipe de suporte
4. **Automação**: Implementar mais soluções automáticas

---

**© 2025 SISPAT - Sistema de Patrimônio**
EOF

    log_success "Relatório de suporte gerado: $report_file"
}

# Função para criar entrada na base de conhecimento
create_knowledge_base_entry() {
    local title=$1
    local category=$2
    local solution=$3
    local keywords=$4
    
    local kb_file="$KNOWLEDGE_BASE/$category-$(date +%Y%m%d-%H%M%S).md"
    
    log "Criando entrada na base de conhecimento: $title"
    
    cat > "$kb_file" << EOF
# 📚 $title

**Categoria**: $category
**Data**: $(date '+%d/%m/%Y')
**Palavras-chave**: $keywords

## 🎯 Problema

[Descrição do problema]

## 🔧 Solução

$solution

## 📋 Passos para Resolução

1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

## ⚠️ Observações

[Observações importantes]

## 📞 Suporte

- **Email**: suporte@sispat.com
- **Telefone**: (11) 99999-9999

---

**© 2025 SISPAT - Sistema de Patrimônio**
EOF

    log_success "Entrada na base de conhecimento criada: $kb_file"
}

# Menu principal
show_menu() {
    echo -e "${BLUE}🆘 SISTEMA DE SUPORTE PÓS-DEPLOY - SISPAT 2025${NC}"
    echo "=============================================="
    echo "1. Criar Ticket de Suporte"
    echo "2. Listar Tickets"
    echo "3. Atualizar Ticket"
    echo "4. Diagnosticar Problema"
    echo "5. Executar Solução Automática"
    echo "6. Escalar Ticket"
    echo "7. Gerar Relatório de Suporte"
    echo "8. Criar Entrada na Base de Conhecimento"
    echo "9. Sair"
    echo "=============================================="
}

# Função principal
main() {
    case ${1:-"menu"} in
        "create-ticket")
            create_support_ticket "$2" "$3" "$4" "$5" "$6"
            ;;
        "list-tickets")
            list_tickets "$2"
            ;;
        "update-ticket")
            update_ticket "$2" "$3" "$4" "$5"
            ;;
        "diagnose")
            diagnose_common_issue "$2" "$3"
            ;;
        "solve")
            execute_automatic_solution "$2" "$3"
            ;;
        "escalate")
            escalate_ticket "$2" "$3" "$4"
            ;;
        "report")
            generate_support_report
            ;;
        "knowledge")
            create_knowledge_base_entry "$2" "$3" "$4" "$5"
            ;;
        "menu"|*)
            show_menu
            read -p "Escolha uma opção: " choice
            case $choice in
                1)
                    read -p "Nome do usuário: " name
                    read -p "Email: " email
                    read -p "Tipo de problema: " type
                    read -p "Prioridade (LOW/MEDIUM/HIGH/CRITICAL): " priority
                    read -p "Descrição: " description
                    create_support_ticket "$name" "$email" "$type" "$priority" "$description"
                    ;;
                2)
                    read -p "Status (ALL/OPEN/IN_PROGRESS/RESOLVED/CLOSED): " status
                    list_tickets "$status"
                    ;;
                3)
                    read -p "ID do ticket: " ticket_id
                    read -p "Ação: " action
                    read -p "Detalhes: " details
                    read -p "Atribuído a: " assigned
                    update_ticket "$ticket_id" "$action" "$details" "$assigned"
                    ;;
                4)
                    read -p "Tipo de problema: " type
                    read -p "ID do ticket: " ticket_id
                    diagnose_common_issue "$type" "$ticket_id"
                    ;;
                5)
                    read -p "Tipo de problema: " type
                    read -p "ID do ticket: " ticket_id
                    execute_automatic_solution "$type" "$ticket_id"
                    ;;
                6)
                    read -p "ID do ticket: " ticket_id
                    read -p "Nível atual: " level
                    read -p "Motivo da escalação: " reason
                    escalate_ticket "$ticket_id" "$level" "$reason"
                    ;;
                7) generate_support_report ;;
                8)
                    read -p "Título: " title
                    read -p "Categoria: " category
                    read -p "Solução: " solution
                    read -p "Palavras-chave: " keywords
                    create_knowledge_base_entry "$title" "$category" "$solution" "$keywords"
                    ;;
                9) exit 0 ;;
                *) echo "Opção inválida" ;;
            esac
            ;;
    esac
}

# Executar função principal
main "$@"
