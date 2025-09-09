#!/bin/bash

# 📢 SISTEMA DE COMUNICAÇÃO E NOTIFICAÇÕES - SISPAT 2025
# Este script gerencia comunicações e notificações do sistema

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
LOG_DIR="$PROJECT_ROOT/logs/communication"
TEMPLATES_DIR="$PROJECT_ROOT/templates/communication"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Criar diretórios necessários
mkdir -p "$LOG_DIR" "$TEMPLATES_DIR"

# Configurações de email (ajustar conforme necessário)
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
FROM_EMAIL="noreply@sispat.com"

# Lista de destinatários
ADMIN_EMAILS=("admin@sispat.com" "suporte@sispat.com")
USER_EMAILS=("usuarios@sispat.com")

# Função de logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/communication-$TIMESTAMP.log"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_DIR/communication-$TIMESTAMP.log"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_DIR/communication-$TIMESTAMP.log"
}

# Função para criar templates de comunicação
create_templates() {
    log "Criando templates de comunicação..."
    
    # Template de Go-Live
    cat > "$TEMPLATES_DIR/go-live-announcement.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SISPAT - Sistema em Produção</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { background: #34495e; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 SISPAT - Sistema em Produção</h1>
        </div>
        <div class="content">
            <h2>Prezados usuários,</h2>
            
            <p>É com grande satisfação que informamos que o <strong>SISPAT (Sistema de Patrimônio)</strong> está oficialmente disponível em produção!</p>
            
            <div class="highlight">
                <h3>📋 Informações de Acesso</h3>
                <p><strong>URL:</strong> https://sispat.seudominio.com</p>
                <p><strong>Usuário:</strong> [SEU_USUARIO]</p>
                <p><strong>Senha:</strong> [SUA_SENHA]</p>
            </div>
            
            <h3>🎯 Principais Funcionalidades</h3>
            <ul>
                <li>📦 Cadastro e gerenciamento de patrimônios</li>
                <li>📊 Relatórios detalhados e personalizáveis</li>
                <li>🏷️ Geração de etiquetas com QR Code</li>
                <li>👥 Gestão de usuários e permissões</li>
                <li>📈 Dashboard com estatísticas em tempo real</li>
            </ul>
            
            <h3>📚 Recursos de Ajuda</h3>
            <ul>
                <li><strong>Manual do Usuário:</strong> Disponível no sistema</li>
                <li><strong>Vídeo Aulas:</strong> Portal de treinamento</li>
                <li><strong>Suporte:</strong> suporte@sispat.com</li>
                <li><strong>Telefone:</strong> (11) 99999-9999</li>
            </ul>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="https://sispat.seudominio.com" class="button">Acessar SISPAT</a>
            </p>
            
            <p>Estamos à disposição para esclarecer dúvidas e fornecer suporte durante este período de transição.</p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe SISPAT</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 SISPAT - Sistema de Patrimônio. Todos os direitos reservados.</p>
            <p>Este é um email automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>
EOF

    # Template de Problema
    cat > "$TEMPLATES_DIR/issue-notification.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SISPAT - Problema Identificado</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { background: #34495e; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .alert { background: #fdf2e9; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        .status.investigating { background: #f39c12; color: white; }
        .status.identified { background: #e67e22; color: white; }
        .status.monitoring { background: #3498db; color: white; }
        .status.resolved { background: #27ae60; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ SISPAT - Problema Identificado</h1>
        </div>
        <div class="content">
            <h2>Prezados usuários,</h2>
            
            <p>Identificamos um problema no sistema SISPAT que está sendo investigado e resolvido pela nossa equipe técnica.</p>
            
            <div class="alert">
                <h3>📊 Status do Problema</h3>
                <p><strong>Status:</strong> <span class="status [STATUS]">[STATUS_TEXT]</span></p>
                <p><strong>Descrição:</strong> [DESCRIPTION]</p>
                <p><strong>Impacto:</strong> [IMPACT]</p>
                <p><strong>Tempo Estimado:</strong> [ESTIMATED_TIME]</p>
            </div>
            
            <h3>🔧 O que estamos fazendo</h3>
            <ul>
                <li>Investigando a causa raiz do problema</li>
                <li>Aplicando correções necessárias</li>
                <li>Monitorando o sistema continuamente</li>
                <li>Mantendo vocês informados sobre o progresso</li>
            </ul>
            
            <h3>📞 Suporte Alternativo</h3>
            <p>Durante este período, nossa equipe de suporte está disponível para:</p>
            <ul>
                <li>Esclarecer dúvidas sobre o sistema</li>
                <li>Fornecer informações sobre o status</li>
                <li>Auxiliar com procedimentos alternativos</li>
            </ul>
            
            <p><strong>Contato:</strong> suporte@sispat.com | (11) 99999-9999</p>
            
            <h3>📈 Acompanhe o Status</h3>
            <p>Para acompanhar o status em tempo real, acesse: <a href="https://status.sispat.com">https://status.sispat.com</a></p>
            
            <p>Pedimos desculpas pelo inconveniente e agradecemos pela compreensão.</p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe SISPAT</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 SISPAT - Sistema de Patrimônio. Todos os direitos reservados.</p>
            <p>Este é um email automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>
EOF

    # Template de Manutenção
    cat > "$TEMPLATES_DIR/maintenance-notification.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SISPAT - Manutenção Programada</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f39c12; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { background: #34495e; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .maintenance { background: #fff3cd; padding: 15px; border-left: 4px solid #f39c12; margin: 15px 0; }
        .schedule { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 SISPAT - Manutenção Programada</h1>
        </div>
        <div class="content">
            <h2>Prezados usuários,</h2>
            
            <p>Informamos que será realizada uma manutenção programada no sistema SISPAT para implementar melhorias e correções.</p>
            
            <div class="maintenance">
                <h3>📅 Cronograma da Manutenção</h3>
                <div class="schedule">
                    <p><strong>Data:</strong> [MAINTENANCE_DATE]</p>
                    <p><strong>Horário:</strong> [MAINTENANCE_TIME]</p>
                    <p><strong>Duração Estimada:</strong> [ESTIMATED_DURATION]</p>
                    <p><strong>Tipo:</strong> [MAINTENANCE_TYPE]</p>
                </div>
            </div>
            
            <h3>🎯 O que será realizado</h3>
            <ul>
                <li>Atualizações de segurança</li>
                <li>Melhorias de performance</li>
                <li>Correções de bugs</li>
                <li>Otimizações do banco de dados</li>
            </ul>
            
            <h3>⚠️ Impacto no Sistema</h3>
            <p>Durante o período de manutenção:</p>
            <ul>
                <li>O sistema ficará temporariamente indisponível</li>
                <li>Não será possível acessar as funcionalidades</li>
                <li>Os dados estarão seguros e preservados</li>
                <li>O acesso será restaurado automaticamente</li>
            </ul>
            
            <h3>📞 Suporte</h3>
            <p>Em caso de dúvidas ou necessidade de suporte:</p>
            <ul>
                <li><strong>Email:</strong> suporte@sispat.com</li>
                <li><strong>Telefone:</strong> (11) 99999-9999</li>
                <li><strong>Horário:</strong> Segunda a Sexta, 8h às 18h</li>
            </ul>
            
            <p>Pedimos desculpas pelo inconveniente e agradecemos pela compreensão.</p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe SISPAT</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 SISPAT - Sistema de Patrimônio. Todos os direitos reservados.</p>
            <p>Este é um email automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>
EOF

    # Template de Relatório Semanal
    cat > "$TEMPLATES_DIR/weekly-report.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SISPAT - Relatório Semanal</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { background: #34495e; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .metric { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .metric h4 { margin: 0 0 10px 0; color: #27ae60; }
        .chart-placeholder { background: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 SISPAT - Relatório Semanal</h1>
            <p>Período: [WEEK_PERIOD]</p>
        </div>
        <div class="content">
            <h2>Resumo da Semana</h2>
            
            <div class="metric">
                <h4>📈 Disponibilidade do Sistema</h4>
                <p><strong>[AVAILABILITY]%</strong> - Sistema funcionando normalmente</p>
            </div>
            
            <div class="metric">
                <h4>👥 Usuários Ativos</h4>
                <p><strong>[ACTIVE_USERS]</strong> usuários utilizaram o sistema esta semana</p>
            </div>
            
            <div class="metric">
                <h4>📦 Patrimônios Cadastrados</h4>
                <p><strong>[TOTAL_PATRIMONIOS]</strong> patrimônios no sistema</p>
                <p><strong>[NEW_PATRIMONIOS]</strong> novos patrimônios cadastrados</p>
            </div>
            
            <div class="metric">
                <h4>📊 Relatórios Gerados</h4>
                <p><strong>[TOTAL_REPORTS]</strong> relatórios gerados esta semana</p>
            </div>
            
            <div class="metric">
                <h4>🏷️ Etiquetas Impressas</h4>
                <p><strong>[TOTAL_LABELS]</strong> etiquetas geradas esta semana</p>
            </div>
            
            <h3>🎯 Principais Atividades</h3>
            <ul>
                <li>[ACTIVITY_1]</li>
                <li>[ACTIVITY_2]</li>
                <li>[ACTIVITY_3]</li>
            </ul>
            
            <h3>📈 Tendências</h3>
            <div class="chart-placeholder">
                <p>📊 Gráfico de uso do sistema</p>
                <p><em>Dados detalhados disponíveis no dashboard</em></p>
            </div>
            
            <h3>🔧 Melhorias Implementadas</h3>
            <ul>
                <li>[IMPROVEMENT_1]</li>
                <li>[IMPROVEMENT_2]</li>
            </ul>
            
            <h3>📞 Suporte</h3>
            <p>Para dúvidas ou sugestões:</p>
            <ul>
                <li><strong>Email:</strong> suporte@sispat.com</li>
                <li><strong>Telefone:</strong> (11) 99999-9999</li>
            </ul>
            
            <p>Atenciosamente,<br>
            <strong>Equipe SISPAT</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 SISPAT - Sistema de Patrimônio. Todos os direitos reservados.</p>
            <p>Este é um email automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>
EOF

    log_success "Templates de comunicação criados"
}

# Função para enviar email
send_email() {
    local to=$1
    local subject=$2
    local template=$3
    local variables=$4
    
    log "Enviando email para: $to"
    log "Assunto: $subject"
    
    # Substituir variáveis no template
    local content=$(cat "$TEMPLATES_DIR/$template")
    
    # Substituir variáveis comuns
    content=$(echo "$content" | sed "s/\[TIMESTAMP\]/$(date '+%Y-%m-%d %H:%M:%S')/g")
    content=$(echo "$content" | sed "s/\[DATE\]/$(date '+%d/%m/%Y')/g")
    content=$(echo "$content" | sed "s/\[TIME\]/$(date '+%H:%M')/g")
    
    # Substituir variáveis específicas
    if [ -n "$variables" ]; then
        IFS=',' read -ra VARS <<< "$variables"
        for var in "${VARS[@]}"; do
            IFS='=' read -ra KV <<< "$var"
            local key="${KV[0]}"
            local value="${KV[1]}"
            content=$(echo "$content" | sed "s/\[$key\]/$value/g")
        done
    fi
    
    # Salvar conteúdo processado
    local temp_file="/tmp/email_$TIMESTAMP.html"
    echo "$content" > "$temp_file"
    
    # Enviar email (requer configuração do servidor SMTP)
    if command -v sendmail >/dev/null 2>&1; then
        {
            echo "To: $to"
            echo "From: $FROM_EMAIL"
            echo "Subject: $subject"
            echo "Content-Type: text/html; charset=UTF-8"
            echo ""
            cat "$temp_file"
        } | sendmail "$to"
        
        log_success "Email enviado com sucesso"
    else
        log_error "Sendmail não encontrado. Email salvo em: $temp_file"
    fi
    
    # Limpar arquivo temporário
    rm -f "$temp_file"
}

# Função para notificar go-live
notify_go_live() {
    local user_emails=$1
    
    log "Enviando notificação de go-live..."
    
    local subject="🚀 SISPAT - Sistema em Produção"
    local template="go-live-announcement.html"
    
    # Enviar para administradores
    for email in "${ADMIN_EMAILS[@]}"; do
        send_email "$email" "$subject" "$template" ""
    done
    
    # Enviar para usuários
    if [ -n "$user_emails" ]; then
        IFS=',' read -ra EMAILS <<< "$user_emails"
        for email in "${EMAILS[@]}"; do
            send_email "$email" "$subject" "$template" ""
        done
    fi
    
    log_success "Notificações de go-live enviadas"
}

# Função para notificar problema
notify_issue() {
    local status=$1
    local description=$2
    local impact=$3
    local estimated_time=$4
    
    log "Enviando notificação de problema..."
    
    local subject="⚠️ SISPAT - Problema Identificado"
    local template="issue-notification.html"
    local variables="STATUS=$status,DESCRIPTION=$description,IMPACT=$impact,ESTIMATED_TIME=$estimated_time"
    
    # Enviar para administradores
    for email in "${ADMIN_EMAILS[@]}"; do
        send_email "$email" "$subject" "$template" "$variables"
    done
    
    log_success "Notificações de problema enviadas"
}

# Função para notificar manutenção
notify_maintenance() {
    local date=$1
    local time=$2
    local duration=$3
    local type=$4
    
    log "Enviando notificação de manutenção..."
    
    local subject="🔧 SISPAT - Manutenção Programada"
    local template="maintenance-notification.html"
    local variables="MAINTENANCE_DATE=$date,MAINTENANCE_TIME=$time,ESTIMATED_DURATION=$duration,MAINTENANCE_TYPE=$type"
    
    # Enviar para todos os usuários
    for email in "${ADMIN_EMAILS[@]}"; do
        send_email "$email" "$subject" "$template" "$variables"
    done
    
    for email in "${USER_EMAILS[@]}"; do
        send_email "$email" "$subject" "$template" "$variables"
    done
    
    log_success "Notificações de manutenção enviadas"
}

# Função para enviar relatório semanal
send_weekly_report() {
    local week_period=$1
    local availability=$2
    local active_users=$3
    local total_patrimonios=$4
    local new_patrimonios=$5
    local total_reports=$6
    local total_labels=$7
    
    log "Enviando relatório semanal..."
    
    local subject="📊 SISPAT - Relatório Semanal"
    local template="weekly-report.html"
    local variables="WEEK_PERIOD=$week_period,AVAILABILITY=$availability,ACTIVE_USERS=$active_users,TOTAL_PATRIMONIOS=$total_patrimonios,NEW_PATRIMONIOS=$new_patrimonios,TOTAL_REPORTS=$total_reports,TOTAL_LABELS=$total_labels"
    
    # Enviar para administradores
    for email in "${ADMIN_EMAILS[@]}"; do
        send_email "$email" "$subject" "$template" "$variables"
    done
    
    log_success "Relatório semanal enviado"
}

# Função para criar comunicado interno
create_internal_announcement() {
    local title=$1
    local content=$2
    local priority=${3:-"normal"}
    
    log "Criando comunicado interno: $title"
    
    local announcement_file="$LOG_DIR/announcement-$TIMESTAMP.md"
    
    cat > "$announcement_file" << EOF
# 📢 COMUNICADO INTERNO - SISPAT

**Data:** $(date '+%d/%m/%Y %H:%M')
**Prioridade:** $priority
**Título:** $title

## Conteúdo

$content

---

**Equipe SISPAT**
EOF

    log_success "Comunicado interno criado: $announcement_file"
}

# Função para gerar relatório de comunicação
generate_communication_report() {
    local report_file="$LOG_DIR/communication-report-$TIMESTAMP.md"
    
    log "Gerando relatório de comunicação..."
    
    cat > "$report_file" << EOF
# 📢 RELATÓRIO DE COMUNICAÇÃO - SISPAT 2025

**Período:** $(date '+%Y-%m-%d %H:%M:%S')

## 📊 Estatísticas de Comunicação

### Emails Enviados
- **Go-Live:** $(grep -c "go-live" "$LOG_DIR"/*.log 2>/dev/null || echo "0")
- **Problemas:** $(grep -c "problema" "$LOG_DIR"/*.log 2>/dev/null || echo "0")
- **Manutenção:** $(grep -c "manutenção" "$LOG_DIR"/*.log 2>/dev/null || echo "0")
- **Relatórios:** $(grep -c "relatório" "$LOG_DIR"/*.log 2>/dev/null || echo "0")

### Comunicados Internos
- **Total:** $(ls "$LOG_DIR"/announcement-*.md 2>/dev/null | wc -l)

## 📁 Arquivos de Comunicação

### Templates Disponíveis
EOF

    if [ -d "$TEMPLATES_DIR" ]; then
        for template in "$TEMPLATES_DIR"/*.html; do
            if [ -f "$template" ]; then
                local template_name=$(basename "$template")
                echo "- **$template_name**" >> "$report_file"
            fi
        done
    fi

    cat >> "$report_file" << EOF

### Logs de Comunicação
EOF

    if [ -d "$LOG_DIR" ]; then
        for log_file in "$LOG_DIR"/*.log; do
            if [ -f "$log_file" ]; then
                local log_name=$(basename "$log_file")
                echo "- **$log_name**" >> "$report_file"
            fi
        done
    fi

    cat >> "$report_file" << EOF

## 🎯 Próximos Passos

1. **Revisar Templates:** Atualizar templates conforme necessário
2. **Configurar SMTP:** Configurar servidor de email para envio automático
3. **Lista de Contatos:** Atualizar listas de email
4. **Automação:** Implementar envio automático de relatórios

---

**© 2025 SISPAT - Sistema de Patrimônio**
EOF

    log_success "Relatório de comunicação gerado: $report_file"
}

# Menu principal
show_menu() {
    echo -e "${BLUE}📢 SISTEMA DE COMUNICAÇÃO - SISPAT 2025${NC}"
    echo "=============================================="
    echo "1. Criar Templates"
    echo "2. Notificar Go-Live"
    echo "3. Notificar Problema"
    echo "4. Notificar Manutenção"
    echo "5. Enviar Relatório Semanal"
    echo "6. Criar Comunicado Interno"
    echo "7. Gerar Relatório de Comunicação"
    echo "8. Sair"
    echo "=============================================="
}

# Função principal
main() {
    case ${1:-"menu"} in
        "templates")
            create_templates
            ;;
        "go-live")
            notify_go_live "$2"
            ;;
        "issue")
            notify_issue "$2" "$3" "$4" "$5"
            ;;
        "maintenance")
            notify_maintenance "$2" "$3" "$4" "$5"
            ;;
        "weekly-report")
            send_weekly_report "$2" "$3" "$4" "$5" "$6" "$7" "$8"
            ;;
        "announcement")
            create_internal_announcement "$2" "$3" "$4"
            ;;
        "report")
            generate_communication_report
            ;;
        "menu"|*)
            show_menu
            read -p "Escolha uma opção: " choice
            case $choice in
                1) create_templates ;;
                2) 
                    read -p "Emails dos usuários (separados por vírgula): " emails
                    notify_go_live "$emails"
                    ;;
                3)
                    read -p "Status: " status
                    read -p "Descrição: " description
                    read -p "Impacto: " impact
                    read -p "Tempo estimado: " time
                    notify_issue "$status" "$description" "$impact" "$time"
                    ;;
                4)
                    read -p "Data: " date
                    read -p "Horário: " time
                    read -p "Duração: " duration
                    read -p "Tipo: " type
                    notify_maintenance "$date" "$time" "$duration" "$type"
                    ;;
                5)
                    read -p "Período da semana: " period
                    read -p "Disponibilidade (%): " availability
                    read -p "Usuários ativos: " users
                    read -p "Total patrimônios: " total
                    read -p "Novos patrimônios: " new
                    read -p "Total relatórios: " reports
                    read -p "Total etiquetas: " labels
                    send_weekly_report "$period" "$availability" "$users" "$total" "$new" "$reports" "$labels"
                    ;;
                6)
                    read -p "Título: " title
                    read -p "Conteúdo: " content
                    read -p "Prioridade (normal/alta/crítica): " priority
                    create_internal_announcement "$title" "$content" "$priority"
                    ;;
                7) generate_communication_report ;;
                8) exit 0 ;;
                *) echo "Opção inválida" ;;
            esac
            ;;
    esac
}

# Executar função principal
main "$@"
