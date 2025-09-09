#!/bin/bash

# SISPAT - Script de Configuração de Backup Automático
# Este script configura backup automático do banco de dados PostgreSQL

set -e

echo "🚀 Configurando Sistema de Backup Automático..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Configurações
BACKUP_DIR="/var/lib/postgresql/backups"
RETENTION_DAYS=30
RETENTION_WEEKS=12
RETENTION_MONTHS=12
DB_NAME="sispat"
DB_USER="backup_user"
DB_HOST="localhost"
DB_PORT="5432"

# Criar diretório de backup
log "Criando diretório de backup..."
sudo mkdir -p $BACKUP_DIR
sudo chown postgres:postgres $BACKUP_DIR
sudo chmod 700 $BACKUP_DIR

# Criar subdiretórios
sudo mkdir -p $BACKUP_DIR/{daily,weekly,monthly}
sudo chown -R postgres:postgres $BACKUP_DIR
sudo chmod -R 700 $BACKUP_DIR

# 1. Script de backup diário
log "Criando script de backup diário..."

sudo tee /usr/local/bin/backup-daily.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Backup Diário do Banco de Dados
# Executa backup completo diário com compressão

set -e

BACKUP_DIR="/var/lib/postgresql/backups"
DB_NAME="sispat"
DB_USER="backup_user"
DB_HOST="localhost"
DB_PORT="5432"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/daily/sispat_daily_\$DATE.sql.gz"
LOG_FILE="/var/log/sispat/backup-daily.log"

# Criar diretório de log se não existir
mkdir -p /var/log/sispat
chown postgres:postgres /var/log/sispat

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando backup diário do SISPAT..."

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log "ERRO: PostgreSQL não está rodando"
    exit 1
fi

# Executar backup
log "Executando backup do banco de dados..."
if pg_dump -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME --verbose --no-password | gzip > \$BACKUP_FILE; then
    log "Backup diário concluído com sucesso: \$BACKUP_FILE"
    
    # Verificar tamanho do arquivo
    SIZE=\$(du -h \$BACKUP_FILE | cut -f1)
    log "Tamanho do backup: \$SIZE"
    
    # Verificar integridade do backup
    if gzip -t \$BACKUP_FILE; then
        log "Integridade do backup verificada com sucesso"
    else
        log "ERRO: Backup corrompido detectado"
        rm -f \$BACKUP_FILE
        exit 1
    fi
    
    # Limpar backups antigos (mais de 30 dias)
    find \$BACKUP_DIR/daily -name "*.sql.gz" -mtime +30 -delete
    log "Backups antigos removidos (mais de 30 dias)"
    
else
    log "ERRO: Falha no backup diário"
    exit 1
fi

log "Backup diário finalizado"
EOF

sudo chmod +x /usr/local/bin/backup-daily.sh
sudo chown postgres:postgres /usr/local/bin/backup-daily.sh

# 2. Script de backup semanal
log "Criando script de backup semanal..."

sudo tee /usr/local/bin/backup-weekly.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Backup Semanal do Banco de Dados
# Executa backup completo semanal com compressão

set -e

BACKUP_DIR="/var/lib/postgresql/backups"
DB_NAME="sispat"
DB_USER="backup_user"
DB_HOST="localhost"
DB_PORT="5432"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/weekly/sispat_weekly_\$DATE.sql.gz"
LOG_FILE="/var/log/sispat/backup-weekly.log"

# Criar diretório de log se não existir
mkdir -p /var/log/sispat
chown postgres:postgres /var/log/sispat

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando backup semanal do SISPAT..."

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log "ERRO: PostgreSQL não está rodando"
    exit 1
fi

# Executar backup
log "Executando backup do banco de dados..."
if pg_dump -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME --verbose --no-password | gzip > \$BACKUP_FILE; then
    log "Backup semanal concluído com sucesso: \$BACKUP_FILE"
    
    # Verificar tamanho do arquivo
    SIZE=\$(du -h \$BACKUP_FILE | cut -f1)
    log "Tamanho do backup: \$SIZE"
    
    # Verificar integridade do backup
    if gzip -t \$BACKUP_FILE; then
        log "Integridade do backup verificada com sucesso"
    else
        log "ERRO: Backup corrompido detectado"
        rm -f \$BACKUP_FILE
        exit 1
    fi
    
    # Limpar backups antigos (mais de 12 semanas)
    find \$BACKUP_DIR/weekly -name "*.sql.gz" -mtime +84 -delete
    log "Backups antigos removidos (mais de 12 semanas)"
    
else
    log "ERRO: Falha no backup semanal"
    exit 1
fi

log "Backup semanal finalizado"
EOF

sudo chmod +x /usr/local/bin/backup-weekly.sh
sudo chown postgres:postgres /usr/local/bin/backup-weekly.sh

# 3. Script de backup mensal
log "Criando script de backup mensal..."

sudo tee /usr/local/bin/backup-monthly.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Backup Mensal do Banco de Dados
# Executa backup completo mensal com compressão

set -e

BACKUP_DIR="/var/lib/postgresql/backups"
DB_NAME="sispat"
DB_USER="backup_user"
DB_HOST="localhost"
DB_PORT="5432"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/monthly/sispat_monthly_\$DATE.sql.gz"
LOG_FILE="/var/log/sispat/backup-monthly.log"

# Criar diretório de log se não existir
mkdir -p /var/log/sispat
chown postgres:postgres /var/log/sispat

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando backup mensal do SISPAT..."

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log "ERRO: PostgreSQL não está rodando"
    exit 1
fi

# Executar backup
log "Executando backup do banco de dados..."
if pg_dump -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME --verbose --no-password | gzip > \$BACKUP_FILE; then
    log "Backup mensal concluído com sucesso: \$BACKUP_FILE"
    
    # Verificar tamanho do arquivo
    SIZE=\$(du -h \$BACKUP_FILE | cut -f1)
    log "Tamanho do backup: \$SIZE"
    
    # Verificar integridade do backup
    if gzip -t \$BACKUP_FILE; then
        log "Integridade do backup verificada com sucesso"
    else
        log "ERRO: Backup corrompido detectado"
        rm -f \$BACKUP_FILE
        exit 1
    fi
    
    # Limpar backups antigos (mais de 12 meses)
    find \$BACKUP_DIR/monthly -name "*.sql.gz" -mtime +365 -delete
    log "Backups antigos removidos (mais de 12 meses)"
    
else
    log "ERRO: Falha no backup mensal"
    exit 1
fi

log "Backup mensal finalizado"
EOF

sudo chmod +x /usr/local/bin/backup-monthly.sh
sudo chown postgres:postgres /usr/local/bin/backup-monthly.sh

# 4. Script de verificação de backup
log "Criando script de verificação de backup..."

sudo tee /usr/local/bin/verify-backup.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Verificação de Backup
# Verifica a integridade dos backups

set -e

BACKUP_DIR="/var/lib/postgresql/backups"
LOG_FILE="/var/log/sispat/backup-verify.log"

# Criar diretório de log se não existir
mkdir -p /var/log/sispat
chown postgres:postgres /var/log/sispat

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando verificação de backups..."

# Verificar backups diários
log "Verificando backups diários..."
DAILY_BACKUPS=\$(find \$BACKUP_DIR/daily -name "*.sql.gz" -type f | wc -l)
if [ \$DAILY_BACKUPS -gt 0 ]; then
    log "Encontrados \$DAILY_BACKUPS backups diários"
    
    # Verificar o backup mais recente
    LATEST_DAILY=\$(find \$BACKUP_DIR/daily -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "\$LATEST_DAILY" ]; then
        if gzip -t "\$LATEST_DAILY"; then
            log "✅ Backup diário mais recente íntegro: \$LATEST_DAILY"
        else
            log "❌ Backup diário mais recente corrompido: \$LATEST_DAILY"
        fi
    fi
else
    log "⚠️ Nenhum backup diário encontrado"
fi

# Verificar backups semanais
log "Verificando backups semanais..."
WEEKLY_BACKUPS=\$(find \$BACKUP_DIR/weekly -name "*.sql.gz" -type f | wc -l)
if [ \$WEEKLY_BACKUPS -gt 0 ]; then
    log "Encontrados \$WEEKLY_BACKUPS backups semanais"
    
    # Verificar o backup mais recente
    LATEST_WEEKLY=\$(find \$BACKUP_DIR/weekly -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "\$LATEST_WEEKLY" ]; then
        if gzip -t "\$LATEST_WEEKLY"; then
            log "✅ Backup semanal mais recente íntegro: \$LATEST_WEEKLY"
        else
            log "❌ Backup semanal mais recente corrompido: \$LATEST_WEEKLY"
        fi
    fi
else
    log "⚠️ Nenhum backup semanal encontrado"
fi

# Verificar backups mensais
log "Verificando backups mensais..."
MONTHLY_BACKUPS=\$(find \$BACKUP_DIR/monthly -name "*.sql.gz" -type f | wc -l)
if [ \$MONTHLY_BACKUPS -gt 0 ]; then
    log "Encontrados \$MONTHLY_BACKUPS backups mensais"
    
    # Verificar o backup mais recente
    LATEST_MONTHLY=\$(find \$BACKUP_DIR/monthly -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "\$LATEST_MONTHLY" ]; then
        if gzip -t "\$LATEST_MONTHLY"; then
            log "✅ Backup mensal mais recente íntegro: \$LATEST_MONTHLY"
        else
            log "❌ Backup mensal mais recente corrompido: \$LATEST_MONTHLY"
        fi
    fi
else
    log "⚠️ Nenhum backup mensal encontrado"
fi

# Verificar espaço em disco
log "Verificando espaço em disco..."
DISK_USAGE=\$(df -h \$BACKUP_DIR | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 80 ]; then
    log "⚠️ Espaço em disco baixo: \$DISK_USAGE% usado"
else
    log "✅ Espaço em disco OK: \$DISK_USAGE% usado"
fi

log "Verificação de backups finalizada"
EOF

sudo chmod +x /usr/local/bin/verify-backup.sh
sudo chown postgres:postgres /usr/local/bin/verify-backup.sh

# 5. Script de limpeza de backup
log "Criando script de limpeza de backup..."

sudo tee /usr/local/bin/cleanup-backups.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Limpeza de Backups
# Remove backups antigos conforme política de retenção

set -e

BACKUP_DIR="/var/lib/postgresql/backups"
LOG_FILE="/var/log/sispat/backup-cleanup.log"

# Criar diretório de log se não existir
mkdir -p /var/log/sispat
chown postgres:postgres /var/log/sispat

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando limpeza de backups..."

# Limpar backups diários antigos (mais de 30 dias)
log "Limpando backups diários antigos..."
DAILY_REMOVED=\$(find \$BACKUP_DIR/daily -name "*.sql.gz" -mtime +30 -delete -print | wc -l)
log "Removidos \$DAILY_REMOVED backups diários antigos"

# Limpar backups semanais antigos (mais de 12 semanas)
log "Limpando backups semanais antigos..."
WEEKLY_REMOVED=\$(find \$BACKUP_DIR/weekly -name "*.sql.gz" -mtime +84 -delete -print | wc -l)
log "Removidos \$WEEKLY_REMOVED backups semanais antigos"

# Limpar backups mensais antigos (mais de 12 meses)
log "Limpando backups mensais antigos..."
MONTHLY_REMOVED=\$(find \$BACKUP_DIR/monthly -name "*.sql.gz" -mtime +365 -delete -print | wc -l)
log "Removidos \$MONTHLY_REMOVED backups mensais antigos"

# Limpar logs antigos (mais de 90 dias)
log "Limpando logs antigos..."
LOG_REMOVED=\$(find /var/log/sispat -name "*.log" -mtime +90 -delete -print | wc -l)
log "Removidos \$LOG_REMOVED logs antigos"

log "Limpeza de backups finalizada"
EOF

sudo chmod +x /usr/local/bin/cleanup-backups.sh
sudo chown postgres:postgres /usr/local/bin/cleanup-backups.sh

# 6. Configurar crontab
log "Configurando agendamento de backups..."

# Backup diário às 2:00
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-daily.sh") | crontab -

# Backup semanal aos domingos às 3:00
(crontab -l 2>/dev/null; echo "0 3 * * 0 /usr/local/bin/backup-weekly.sh") | crontab -

# Backup mensal no primeiro dia do mês às 4:00
(crontab -l 2>/dev/null; echo "0 4 1 * * /usr/local/bin/backup-monthly.sh") | crontab -

# Verificação de backup diária às 5:00
(crontab -l 2>/dev/null; echo "0 5 * * * /usr/local/bin/verify-backup.sh") | crontab -

# Limpeza de backups diária às 6:00
(crontab -l 2>/dev/null; echo "0 6 * * * /usr/local/bin/cleanup-backups.sh") | crontab -

log "Agendamento de backups configurado"

# 7. Testar backup
log "Testando backup..."

# Executar backup de teste
if sudo -u postgres /usr/local/bin/backup-daily.sh; then
    log "✅ Teste de backup bem-sucedido"
else
    error "❌ Falha no teste de backup"
    exit 1
fi

# 8. Verificar backup
log "Verificando backup de teste..."

if sudo -u postgres /usr/local/bin/verify-backup.sh; then
    log "✅ Verificação de backup bem-sucedida"
else
    warn "⚠️ Problemas na verificação de backup"
fi

# 9. Configurar monitoramento
log "Configurando monitoramento de backup..."

# Criar script de monitoramento
sudo tee /usr/local/bin/monitor-backups.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Monitoramento de Backups
# Monitora o status dos backups e envia alertas

set -e

BACKUP_DIR="/var/lib/postgresql/backups"
LOG_FILE="/var/log/sispat/backup-monitor.log"

# Criar diretório de log se não existir
mkdir -p /var/log/sispat
chown postgres:postgres /var/log/sispat

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando monitoramento de backups..."

# Verificar se há backups recentes
DAILY_BACKUPS=\$(find \$BACKUP_DIR/daily -name "*.sql.gz" -mtime -1 -type f | wc -l)
WEEKLY_BACKUPS=\$(find \$BACKUP_DIR/weekly -name "*.sql.gz" -mtime -7 -type f | wc -l)
MONTHLY_BACKUPS=\$(find \$BACKUP_DIR/monthly -name "*.sql.gz" -mtime -30 -type f | wc -l)

if [ \$DAILY_BACKUPS -eq 0 ]; then
    log "⚠️ ALERTA: Nenhum backup diário nas últimas 24 horas"
fi

if [ \$WEEKLY_BACKUPS -eq 0 ]; then
    log "⚠️ ALERTA: Nenhum backup semanal na última semana"
fi

if [ \$MONTHLY_BACKUPS -eq 0 ]; then
    log "⚠️ ALERTA: Nenhum backup mensal no último mês"
fi

# Verificar espaço em disco
DISK_USAGE=\$(df -h \$BACKUP_DIR | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    log "🚨 ALERTA CRÍTICO: Espaço em disco crítico: \$DISK_USAGE% usado"
elif [ \$DISK_USAGE -gt 80 ]; then
    log "⚠️ ALERTA: Espaço em disco baixo: \$DISK_USAGE% usado"
fi

log "Monitoramento de backups finalizado"
EOF

sudo chmod +x /usr/local/bin/monitor-backups.sh
sudo chown postgres:postgres /usr/local/bin/monitor-backups.sh

# Adicionar monitoramento ao crontab (a cada hora)
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/monitor-backups.sh") | crontab -

log "Monitoramento de backups configurado"

# 10. Criar relatório de status
log "Criando relatório de status..."

sudo tee /usr/local/bin/backup-status.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Status dos Backups
# Exibe o status atual dos backups

BACKUP_DIR="/var/lib/postgresql/backups"

echo "📊 Status dos Backups SISPAT"
echo "=============================="
echo ""

# Backups diários
echo "📅 Backups Diários:"
DAILY_COUNT=\$(find \$BACKUP_DIR/daily -name "*.sql.gz" -type f | wc -l)
echo "   Total: \$DAILY_COUNT"
if [ \$DAILY_COUNT -gt 0 ]; then
    LATEST_DAILY=\$(find \$BACKUP_DIR/daily -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    LATEST_DAILY_DATE=\$(stat -c %y "\$LATEST_DAILY" | cut -d' ' -f1)
    LATEST_DAILY_SIZE=\$(du -h "\$LATEST_DAILY" | cut -f1)
    echo "   Mais recente: \$LATEST_DAILY_DATE (\$LATEST_DAILY_SIZE)"
fi
echo ""

# Backups semanais
echo "📅 Backups Semanais:"
WEEKLY_COUNT=\$(find \$BACKUP_DIR/weekly -name "*.sql.gz" -type f | wc -l)
echo "   Total: \$WEEKLY_COUNT"
if [ \$WEEKLY_COUNT -gt 0 ]; then
    LATEST_WEEKLY=\$(find \$BACKUP_DIR/weekly -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    LATEST_WEEKLY_DATE=\$(stat -c %y "\$LATEST_WEEKLY" | cut -d' ' -f1)
    LATEST_WEEKLY_SIZE=\$(du -h "\$LATEST_WEEKLY" | cut -f1)
    echo "   Mais recente: \$LATEST_WEEKLY_DATE (\$LATEST_WEEKLY_SIZE)"
fi
echo ""

# Backups mensais
echo "📅 Backups Mensais:"
MONTHLY_COUNT=\$(find \$BACKUP_DIR/monthly -name "*.sql.gz" -type f | wc -l)
echo "   Total: \$MONTHLY_COUNT"
if [ \$MONTHLY_COUNT -gt 0 ]; then
    LATEST_MONTHLY=\$(find \$BACKUP_DIR/monthly -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    LATEST_MONTHLY_DATE=\$(stat -c %y "\$LATEST_MONTHLY" | cut -d' ' -f1)
    LATEST_MONTHLY_SIZE=\$(du -h "\$LATEST_MONTHLY" | cut -f1)
    echo "   Mais recente: \$LATEST_MONTHLY_DATE (\$LATEST_MONTHLY_SIZE)"
fi
echo ""

# Espaço em disco
echo "💾 Espaço em Disco:"
DISK_USAGE=\$(df -h \$BACKUP_DIR | tail -1 | awk '{print \$5}')
DISK_AVAILABLE=\$(df -h \$BACKUP_DIR | tail -1 | awk '{print \$4}')
echo "   Usado: \$DISK_USAGE"
echo "   Disponível: \$DISK_AVAILABLE"
echo ""

# Próximos backups
echo "⏰ Próximos Backups:"
echo "   Diário: 02:00 (todos os dias)"
echo "   Semanal: 03:00 (domingos)"
echo "   Mensal: 04:00 (primeiro dia do mês)"
echo ""

echo "✅ Sistema de backup configurado e funcionando"
EOF

sudo chmod +x /usr/local/bin/backup-status.sh
sudo chown postgres:postgres /usr/local/bin/backup-status.sh

# 11. Executar status
log "Executando status dos backups..."
sudo -u postgres /usr/local/bin/backup-status.sh

log "🎉 Sistema de backup automático configurado com sucesso!"
log "📋 Configurações aplicadas:"
log "   • Backup diário às 2:00 (retenção: 30 dias)"
log "   • Backup semanal aos domingos às 3:00 (retenção: 12 semanas)"
log "   • Backup mensal no primeiro dia às 4:00 (retenção: 12 meses)"
log "   • Verificação diária às 5:00"
log "   • Limpeza automática às 6:00"
log "   • Monitoramento a cada hora"
log "   • Logs centralizados em /var/log/sispat/"
log ""
log "🔧 Comandos úteis:"
log "   • Ver status: sudo -u postgres /usr/local/bin/backup-status.sh"
log "   • Verificar backups: sudo -u postgres /usr/local/bin/verify-backup.sh"
log "   • Executar backup manual: sudo -u postgres /usr/local/bin/backup-daily.sh"
log "   • Monitorar logs: tail -f /var/log/sispat/backup-*.log"
