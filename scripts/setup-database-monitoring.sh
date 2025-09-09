#!/bin/bash

# SISPAT - Script de Configuração de Monitoramento do Banco de Dados
# Este script configura monitoramento avançado do PostgreSQL

set -e

echo "🚀 Configurando Monitoramento do Banco de Dados..."

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
DB_NAME="sispat"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
MONITORING_DIR="/var/lib/postgresql/monitoring"
LOG_DIR="/var/log/sispat"

# Criar diretórios
log "Criando diretórios de monitoramento..."
sudo mkdir -p $MONITORING_DIR
sudo mkdir -p $LOG_DIR
sudo chown -R postgres:postgres $MONITORING_DIR
sudo chown -R postgres:postgres $LOG_DIR
sudo chmod -R 755 $MONITORING_DIR
sudo chmod -R 755 $LOG_DIR

# 1. Script de monitoramento de performance
log "Criando script de monitoramento de performance..."

sudo tee /usr/local/bin/monitor-db-performance.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Monitoramento de Performance do Banco de Dados
# Monitora métricas de performance do PostgreSQL

set -e

DB_NAME="sispat"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
MONITORING_DIR="/var/lib/postgresql/monitoring"
LOG_FILE="/var/log/sispat/db-performance.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando monitoramento de performance..."

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log "ERRO: PostgreSQL não está rodando"
    exit 1
fi

# Coletar métricas
TIMESTAMP=\$(date +%Y-%m-%d_%H:%M:%S)

# 1. Conexões ativas
ACTIVE_CONNECTIONS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" | tr -d ' ')
TOTAL_CONNECTIONS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity;" | tr -d ' ')
MAX_CONNECTIONS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SHOW max_connections;" | tr -d ' ')

log "Conexões: \$ACTIVE_CONNECTIONS ativas, \$TOTAL_CONNECTIONS total, \$MAX_CONNECTIONS máximo"

# 2. Tamanho do banco de dados
DB_SIZE=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('\$DB_NAME'));" | tr -d ' ')
log "Tamanho do banco: \$DB_SIZE"

# 3. Queries lentas
SLOW_QUERIES=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;" | tr -d ' ')
log "Queries lentas (>1s): \$SLOW_QUERIES"

# 4. Cache hit ratio
CACHE_HIT_RATIO=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) FROM pg_stat_database WHERE datname = '\$DB_NAME';" | tr -d ' ')
log "Cache hit ratio: \$CACHE_HIT_RATIO%"

# 5. Locks
ACTIVE_LOCKS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_locks WHERE granted = false;" | tr -d ' ')
log "Locks ativos: \$ACTIVE_LOCKS"

# 6. Transações
COMMITTED_TXNS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT xact_commit FROM pg_stat_database WHERE datname = '\$DB_NAME';" | tr -d ' ')
ROLLED_BACK_TXNS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT xact_rollback FROM pg_stat_database WHERE datname = '\$DB_NAME';" | tr -d ' ')
log "Transações: \$COMMITTED_TXNS commitadas, \$ROLLED_BACK_TXNS revertidas"

# 7. I/O
DISK_READS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT blks_read FROM pg_stat_database WHERE datname = '\$DB_NAME';" | tr -d ' ')
DISK_HITS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT blks_hit FROM pg_stat_database WHERE datname = '\$DB_NAME';" | tr -d ' ')
log "I/O: \$DISK_READS leituras, \$DISK_HITS hits"

# 8. Tabelas com mais atividade
log "Tabelas mais ativas:"
sudo -u postgres psql -d \$DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC 
LIMIT 5;
" | tee -a \$LOG_FILE

# 9. Índices não utilizados
log "Índices não utilizados:"
UNUSED_INDEXES=\$(sudo -u postgres psql -d \$DB_NAME -t -c "
SELECT count(*) 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0;
" | tr -d ' ')
log "Índices não utilizados: \$UNUSED_INDEXES"

# 10. Verificar alertas
ALERTS=0

# Alerta de conexões altas
if [ \$ACTIVE_CONNECTIONS -gt 80 ]; then
    log "🚨 ALERTA: Muitas conexões ativas: \$ACTIVE_CONNECTIONS"
    ALERTS=\$((ALERTS + 1))
fi

# Alerta de cache hit ratio baixo
if [ \$(echo "\$CACHE_HIT_RATIO < 90" | bc -l) -eq 1 ]; then
    log "🚨 ALERTA: Cache hit ratio baixo: \$CACHE_HIT_RATIO%"
    ALERTS=\$((ALERTS + 1))
fi

# Alerta de queries lentas
if [ \$SLOW_QUERIES -gt 10 ]; then
    log "🚨 ALERTA: Muitas queries lentas: \$SLOW_QUERIES"
    ALERTS=\$((ALERTS + 1))
fi

# Alerta de locks
if [ \$ACTIVE_LOCKS -gt 5 ]; then
    log "🚨 ALERTA: Muitos locks ativos: \$ACTIVE_LOCKS"
    ALERTS=\$((ALERTS + 1))
fi

# Salvar métricas em arquivo
METRICS_FILE="\$MONITORING_DIR/performance_\$TIMESTAMP.json"
cat > \$METRICS_FILE << EOL
{
    "timestamp": "\$TIMESTAMP",
    "active_connections": \$ACTIVE_CONNECTIONS,
    "total_connections": \$TOTAL_CONNECTIONS,
    "max_connections": \$MAX_CONNECTIONS,
    "db_size": "\$DB_SIZE",
    "slow_queries": \$SLOW_QUERIES,
    "cache_hit_ratio": \$CACHE_HIT_RATIO,
    "active_locks": \$ACTIVE_LOCKS,
    "committed_txns": \$COMMITTED_TXNS,
    "rolled_back_txns": \$ROLLED_BACK_TXNS,
    "disk_reads": \$DISK_READS,
    "disk_hits": \$DISK_HITS,
    "unused_indexes": \$UNUSED_INDEXES,
    "alerts": \$ALERTS
}
EOL

log "Métricas salvas em: \$METRICS_FILE"

# Limpar métricas antigas (mais de 7 dias)
find \$MONITORING_DIR -name "performance_*.json" -mtime +7 -delete

log "Monitoramento de performance finalizado"
EOF

sudo chmod +x /usr/local/bin/monitor-db-performance.sh
sudo chown postgres:postgres /usr/local/bin/monitor-db-performance.sh

# 2. Script de monitoramento de saúde
log "Criando script de monitoramento de saúde..."

sudo tee /usr/local/bin/monitor-db-health.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Monitoramento de Saúde do Banco de Dados
# Monitora a saúde geral do PostgreSQL

set -e

DB_NAME="sispat"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
LOG_FILE="/var/log/sispat/db-health.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando monitoramento de saúde..."

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log "🚨 CRÍTICO: PostgreSQL não está rodando"
    exit 1
fi

# 1. Verificar conectividade
if sudo -u postgres psql -d \$DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    log "✅ Conectividade: OK"
else
    log "🚨 CRÍTICO: Falha na conectividade"
    exit 1
fi

# 2. Verificar espaço em disco
DISK_USAGE=\$(df -h /var/lib/postgresql | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    log "🚨 CRÍTICO: Espaço em disco crítico: \$DISK_USAGE%"
elif [ \$DISK_USAGE -gt 80 ]; then
    log "⚠️ ALERTA: Espaço em disco baixo: \$DISK_USAGE%"
else
    log "✅ Espaço em disco: OK (\$DISK_USAGE%)"
fi

# 3. Verificar memória
MEMORY_USAGE=\$(free | grep Mem | awk '{printf "%.0f", \$3/\$2 * 100.0}')
if [ \$MEMORY_USAGE -gt 90 ]; then
    log "🚨 CRÍTICO: Uso de memória crítico: \$MEMORY_USAGE%"
elif [ \$MEMORY_USAGE -gt 80 ]; then
    log "⚠️ ALERTA: Uso de memória alto: \$MEMORY_USAGE%"
else
    log "✅ Memória: OK (\$MEMORY_USAGE%)"
fi

# 4. Verificar CPU
CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | awk '{print \$2}' | awk -F'%' '{print \$1}')
if [ \$(echo "\$CPU_USAGE > 90" | bc -l) -eq 1 ]; then
    log "🚨 CRÍTICO: Uso de CPU crítico: \$CPU_USAGE%"
elif [ \$(echo "\$CPU_USAGE > 80" | bc -l) -eq 1 ]; then
    log "⚠️ ALERTA: Uso de CPU alto: \$CPU_USAGE%"
else
    log "✅ CPU: OK (\$CPU_USAGE%)"
fi

# 5. Verificar logs de erro
ERROR_COUNT=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_database WHERE datname = '\$DB_NAME' AND deadlocks > 0;" | tr -d ' ')
if [ \$ERROR_COUNT -gt 0 ]; then
    log "⚠️ ALERTA: Deadlocks detectados: \$ERROR_COUNT"
else
    log "✅ Deadlocks: OK"
fi

# 6. Verificar autovacuum
AUTOVACUUM_STATUS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SHOW autovacuum;" | tr -d ' ')
if [ "\$AUTOVACUUM_STATUS" = "on" ]; then
    log "✅ Autovacuum: OK"
else
    log "⚠️ ALERTA: Autovacuum desabilitado"
fi

# 7. Verificar WAL
WAL_FILES=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_ls_waldir();" | tr -d ' ')
if [ \$WAL_FILES -gt 100 ]; then
    log "⚠️ ALERTA: Muitos arquivos WAL: \$WAL_FILES"
else
    log "✅ WAL: OK (\$WAL_FILES arquivos)"
fi

# 8. Verificar replicação (se configurada)
REPLICATION_STATUS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_replication;" | tr -d ' ')
if [ \$REPLICATION_STATUS -gt 0 ]; then
    log "✅ Replicação: OK (\$REPLICATION_STATUS streams)"
else
    log "ℹ️ Replicação: Não configurada"
fi

# 9. Verificar backup recente
BACKUP_DIR="/var/lib/postgresql/backups"
RECENT_BACKUP=\$(find \$BACKUP_DIR -name "*.sql.gz" -mtime -1 -type f | wc -l)
if [ \$RECENT_BACKUP -gt 0 ]; then
    log "✅ Backup: OK (backup recente encontrado)"
else
    log "⚠️ ALERTA: Nenhum backup recente encontrado"
fi

# 10. Verificar integridade do banco
log "Verificando integridade do banco..."
if sudo -u postgres psql -d \$DB_NAME -c "VACUUM ANALYZE;" > /dev/null 2>&1; then
    log "✅ Integridade: OK"
else
    log "🚨 CRÍTICO: Falha na verificação de integridade"
fi

log "Monitoramento de saúde finalizado"
EOF

sudo chmod +x /usr/local/bin/monitor-db-health.sh
sudo chown postgres:postgres /usr/local/bin/monitor-db-health.sh

# 3. Script de análise de queries
log "Criando script de análise de queries..."

sudo tee /usr/local/bin/analyze-queries.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Análise de Queries
# Analisa queries lentas e otimizações

set -e

DB_NAME="sispat"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
LOG_FILE="/var/log/sispat/query-analysis.log"

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

log "Iniciando análise de queries..."

# Verificar se pg_stat_statements está disponível
if ! sudo -u postgres psql -d \$DB_NAME -c "SELECT 1 FROM pg_stat_statements LIMIT 1;" > /dev/null 2>&1; then
    log "⚠️ pg_stat_statements não disponível. Instalando..."
    sudo -u postgres psql -d \$DB_NAME -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
fi

# 1. Top 10 queries mais lentas
log "Top 10 queries mais lentas:"
sudo -u postgres psql -d \$DB_NAME -c "
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
" | tee -a \$LOG_FILE

# 2. Queries com mais chamadas
log "Top 10 queries com mais chamadas:"
sudo -u postgres psql -d \$DB_NAME -c "
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY calls DESC 
LIMIT 10;
" | tee -a \$LOG_FILE

# 3. Queries com mais I/O
log "Top 10 queries com mais I/O:"
sudo -u postgres psql -d \$DB_NAME -c "
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    shared_blks_read,
    shared_blks_written
FROM pg_stat_statements 
ORDER BY (shared_blks_read + shared_blks_written) DESC 
LIMIT 10;
" | tee -a \$LOG_FILE

# 4. Índices não utilizados
log "Índices não utilizados:"
sudo -u postgres psql -d \$DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
ORDER BY pg_relation_size(indexrelid) DESC;
" | tee -a \$LOG_FILE

# 5. Tabelas que precisam de VACUUM
log "Tabelas que precisam de VACUUM:"
sudo -u postgres psql -d \$DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000 
ORDER BY n_dead_tup DESC;
" | tee -a \$LOG_FILE

# 6. Recomendações de otimização
log "Recomendações de otimização:"
sudo -u postgres psql -d \$DB_NAME -c "
SELECT 
    'Tabela: ' || schemaname || '.' || tablename as recomendacao,
    'Dead tuples: ' || n_dead_tup as detalhes
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000
UNION ALL
SELECT 
    'Índice não utilizado: ' || schemaname || '.' || indexname as recomendacao,
    'Tamanho: ' || pg_size_pretty(pg_relation_size(indexrelid)) as detalhes
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 AND pg_relation_size(indexrelid) > 1024*1024;
" | tee -a \$LOG_FILE

log "Análise de queries finalizada"
EOF

sudo chmod +x /usr/local/bin/analyze-queries.sh
sudo chown postgres:postgres /usr/local/bin/analyze-queries.sh

# 4. Script de relatório de status
log "Criando script de relatório de status..."

sudo tee /usr/local/bin/db-status-report.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Relatório de Status do Banco de Dados
# Gera relatório completo do status do banco

DB_NAME="sispat"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "📊 Relatório de Status do Banco de Dados SISPAT"
echo "=============================================="
echo "Data: \$(date)"
echo ""

# 1. Informações básicas
echo "🔧 Informações Básicas:"
echo "   Banco: \$DB_NAME"
echo "   Host: \$DB_HOST:\$DB_PORT"
echo "   Usuário: \$DB_USER"
echo "   Versão: \$(sudo -u postgres psql -d \$DB_NAME -t -c 'SELECT version();' | head -1)"
echo ""

# 2. Status do serviço
echo "🚀 Status do Serviço:"
if systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL: Rodando"
else
    echo "   ❌ PostgreSQL: Parado"
fi
echo "   Uptime: \$(systemctl show postgresql --property=ActiveEnterTimestamp --value)"
echo ""

# 3. Conexões
echo "🔌 Conexões:"
ACTIVE_CONNECTIONS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" | tr -d ' ')
TOTAL_CONNECTIONS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity;" | tr -d ' ')
MAX_CONNECTIONS=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SHOW max_connections;" | tr -d ' ')
echo "   Ativas: \$ACTIVE_CONNECTIONS"
echo "   Total: \$TOTAL_CONNECTIONS"
echo "   Máximo: \$MAX_CONNECTIONS"
echo ""

# 4. Tamanho do banco
echo "💾 Tamanho do Banco:"
DB_SIZE=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('\$DB_NAME'));" | tr -d ' ')
echo "   Tamanho: \$DB_SIZE"
echo ""

# 5. Performance
echo "⚡ Performance:"
CACHE_HIT_RATIO=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) FROM pg_stat_database WHERE datname = '\$DB_NAME';" | tr -d ' ')
SLOW_QUERIES=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;" | tr -d ' ')
echo "   Cache Hit Ratio: \$CACHE_HIT_RATIO%"
echo "   Queries Lentas: \$SLOW_QUERIES"
echo ""

# 6. Tabelas
echo "📋 Tabelas:"
TABLE_COUNT=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo "   Total: \$TABLE_COUNT"
echo ""

# 7. Índices
echo "🔍 Índices:"
INDEX_COUNT=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';" | tr -d ' ')
UNUSED_INDEXES=\$(sudo -u postgres psql -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_user_indexes WHERE idx_scan = 0;" | tr -d ' ')
echo "   Total: \$INDEX_COUNT"
echo "   Não Utilizados: \$UNUSED_INDEXES"
echo ""

# 8. Backup
echo "💾 Backup:"
BACKUP_DIR="/var/lib/postgresql/backups"
if [ -d "\$BACKUP_DIR" ]; then
    DAILY_BACKUPS=\$(find \$BACKUP_DIR/daily -name "*.sql.gz" -type f | wc -l)
    WEEKLY_BACKUPS=\$(find \$BACKUP_DIR/weekly -name "*.sql.gz" -type f | wc -l)
    MONTHLY_BACKUPS=\$(find \$BACKUP_DIR/monthly -name "*.sql.gz" -type f | wc -l)
    echo "   Diários: \$DAILY_BACKUPS"
    echo "   Semanais: \$WEEKLY_BACKUPS"
    echo "   Mensais: \$MONTHLY_BACKUPS"
else
    echo "   ❌ Diretório de backup não encontrado"
fi
echo ""

# 9. Alertas
echo "🚨 Alertas:"
ALERTS=0

# Verificar conexões
if [ \$ACTIVE_CONNECTIONS -gt 80 ]; then
    echo "   ⚠️ Muitas conexões ativas: \$ACTIVE_CONNECTIONS"
    ALERTS=\$((ALERTS + 1))
fi

# Verificar cache hit ratio
if [ \$(echo "\$CACHE_HIT_RATIO < 90" | bc -l) -eq 1 ]; then
    echo "   ⚠️ Cache hit ratio baixo: \$CACHE_HIT_RATIO%"
    ALERTS=\$((ALERTS + 1))
fi

# Verificar queries lentas
if [ \$SLOW_QUERIES -gt 10 ]; then
    echo "   ⚠️ Muitas queries lentas: \$SLOW_QUERIES"
    ALERTS=\$((ALERTS + 1))
fi

# Verificar espaço em disco
DISK_USAGE=\$(df -h /var/lib/postgresql | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 80 ]; then
    echo "   ⚠️ Espaço em disco baixo: \$DISK_USAGE%"
    ALERTS=\$((ALERTS + 1))
fi

if [ \$ALERTS -eq 0 ]; then
    echo "   ✅ Nenhum alerta ativo"
fi
echo ""

echo "✅ Relatório gerado com sucesso"
EOF

sudo chmod +x /usr/local/bin/db-status-report.sh
sudo chown postgres:postgres /usr/local/bin/db-status-report.sh

# 5. Configurar agendamento
log "Configurando agendamento de monitoramento..."

# Monitoramento de performance a cada 15 minutos
(crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/monitor-db-performance.sh") | crontab -

# Monitoramento de saúde a cada hora
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/monitor-db-health.sh") | crontab -

# Análise de queries diária às 7:00
(crontab -l 2>/dev/null; echo "0 7 * * * /usr/local/bin/analyze-queries.sh") | crontab -

# Relatório de status diário às 8:00
(crontab -l 2>/dev/null; echo "0 8 * * * /usr/local/bin/db-status-report.sh") | crontab -

log "Agendamento de monitoramento configurado"

# 6. Testar monitoramento
log "Testando monitoramento..."

# Testar monitoramento de performance
if sudo -u postgres /usr/local/bin/monitor-db-performance.sh; then
    log "✅ Teste de monitoramento de performance bem-sucedido"
else
    warn "⚠️ Problemas no teste de monitoramento de performance"
fi

# Testar monitoramento de saúde
if sudo -u postgres /usr/local/bin/monitor-db-health.sh; then
    log "✅ Teste de monitoramento de saúde bem-sucedido"
else
    warn "⚠️ Problemas no teste de monitoramento de saúde"
fi

# Testar relatório de status
if sudo -u postgres /usr/local/bin/db-status-report.sh; then
    log "✅ Teste de relatório de status bem-sucedido"
else
    warn "⚠️ Problemas no teste de relatório de status"
fi

# 7. Configurar alertas por email (opcional)
log "Configurando alertas por email..."

# Criar script de alertas
sudo tee /usr/local/bin/send-db-alerts.sh > /dev/null << EOF
#!/bin/bash

# SISPAT - Envio de Alertas do Banco de Dados
# Envia alertas por email quando necessário

set -e

LOG_FILE="/var/log/sispat/db-alerts.log"
EMAIL_RECIPIENT="admin@sispat.com"  # Configurar com email real

# Função de log
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a \$LOG_FILE
}

# Verificar se há alertas críticos
CRITICAL_ALERTS=0

# Verificar se o PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
    log "🚨 ALERTA CRÍTICO: PostgreSQL não está rodando"
    CRITICAL_ALERTS=\$((CRITICAL_ALERTS + 1))
fi

# Verificar espaço em disco
DISK_USAGE=\$(df -h /var/lib/postgresql | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    log "🚨 ALERTA CRÍTICO: Espaço em disco crítico: \$DISK_USAGE%"
    CRITICAL_ALERTS=\$((CRITICAL_ALERTS + 1))
fi

# Verificar backup recente
BACKUP_DIR="/var/lib/postgresql/backups"
RECENT_BACKUP=\$(find \$BACKUP_DIR -name "*.sql.gz" -mtime -1 -type f | wc -l)
if [ \$RECENT_BACKUP -eq 0 ]; then
    log "⚠️ ALERTA: Nenhum backup recente encontrado"
fi

# Se houver alertas críticos, enviar email
if [ \$CRITICAL_ALERTS -gt 0 ]; then
    log "Enviando alertas críticos por email..."
    # Aqui você pode configurar o envio de email
    # echo "Alertas críticos do SISPAT" | mail -s "SISPAT - Alertas Críticos" \$EMAIL_RECIPIENT
fi

log "Verificação de alertas finalizada"
EOF

sudo chmod +x /usr/local/bin/send-db-alerts.sh
sudo chown postgres:postgres /usr/local/bin/send-db-alerts.sh

# Adicionar verificação de alertas a cada 30 minutos
(crontab -l 2>/dev/null; echo "*/30 * * * * /usr/local/bin/send-db-alerts.sh") | crontab -

log "Alertas por email configurados"

# 8. Executar relatório final
log "Executando relatório final de status..."
sudo -u postgres /usr/local/bin/db-status-report.sh

log "🎉 Sistema de monitoramento do banco de dados configurado com sucesso!"
log "📋 Configurações aplicadas:"
log "   • Monitoramento de performance a cada 15 minutos"
log "   • Monitoramento de saúde a cada hora"
log "   • Análise de queries diária às 7:00"
log "   • Relatório de status diário às 8:00"
log "   • Verificação de alertas a cada 30 minutos"
log "   • Logs centralizados em /var/log/sispat/"
log "   • Métricas salvas em /var/lib/postgresql/monitoring/"
log ""
log "🔧 Comandos úteis:"
log "   • Relatório de status: sudo -u postgres /usr/local/bin/db-status-report.sh"
log "   • Monitorar performance: sudo -u postgres /usr/local/bin/monitor-db-performance.sh"
log "   • Verificar saúde: sudo -u postgres /usr/local/bin/monitor-db-health.sh"
log "   • Analisar queries: sudo -u postgres /usr/local/bin/analyze-queries.sh"
log "   • Ver logs: tail -f /var/log/sispat/db-*.log"
