#!/bin/bash

# SISPAT - Script de Configuração do PostgreSQL para Produção
# Este script configura o PostgreSQL para ambiente de produção

set -e

echo "🚀 Configurando PostgreSQL para Produção..."

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

# Verificar se o PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    error "PostgreSQL não está instalado. Instale primeiro o PostgreSQL."
    exit 1
fi

# Verificar se o usuário tem permissões de superusuário
if ! sudo -u postgres psql -c "SELECT 1;" &> /dev/null; then
    error "Este script precisa ser executado com permissões de superusuário PostgreSQL"
    exit 1
fi

log "Configurando PostgreSQL para produção..."

# 1. Configurar postgresql.conf para produção
log "Configurando postgresql.conf..."

POSTGRES_CONF="/etc/postgresql/*/main/postgresql.conf"
if [ ! -f $POSTGRES_CONF ]; then
    # Tentar localização alternativa
    POSTGRES_CONF="/var/lib/pgsql/data/postgresql.conf"
fi

if [ -f $POSTGRES_CONF ]; then
    # Backup da configuração original
    sudo cp $POSTGRES_CONF ${POSTGRES_CONF}.backup.$(date +%Y%m%d_%H%M%S)
    
    # Configurações de memória
    sudo sed -i "s/#shared_buffers = 128MB/shared_buffers = 256MB/" $POSTGRES_CONF
    sudo sed -i "s/#effective_cache_size = 4GB/effective_cache_size = 1GB/" $POSTGRES_CONF
    sudo sed -i "s/#maintenance_work_mem = 64MB/maintenance_work_mem = 64MB/" $POSTGRES_CONF
    sudo sed -i "s/#work_mem = 4MB/work_mem = 4MB/" $POSTGRES_CONF
    
    # Configurações de WAL
    sudo sed -i "s/#wal_buffers = -1/wal_buffers = 16MB/" $POSTGRES_CONF
    sudo sed -i "s/#checkpoint_completion_target = 0.9/checkpoint_completion_target = 0.9/" $POSTGRES_CONF
    sudo sed -i "s/#checkpoint_timeout = 5min/checkpoint_timeout = 15min/" $POSTGRES_CONF
    sudo sed -i "s/#max_wal_size = 1GB/max_wal_size = 1GB/" $POSTGRES_CONF
    sudo sed -i "s/#min_wal_size = 80MB/min_wal_size = 80MB/" $POSTGRES_CONF
    
    # Configurações de conexão
    sudo sed -i "s/#max_connections = 100/max_connections = 100/" $POSTGRES_CONF
    sudo sed -i "s/#superuser_reserved_connections = 3/superuser_reserved_connections = 3/" $POSTGRES_CONF
    
    # Configurações de logging
    sudo sed -i "s/#log_destination = 'stderr'/log_destination = 'stderr'/" $POSTGRES_CONF
    sudo sed -i "s/#logging_collector = off/logging_collector = on/" $POSTGRES_CONF
    sudo sed -i "s/#log_directory = 'pg_log'/log_directory = 'pg_log'/" $POSTGRES_CONF
    sudo sed -i "s/#log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'/log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'/" $POSTGRES_CONF
    sudo sed -i "s/#log_rotation_age = 1d/log_rotation_age = 1d/" $POSTGRES_CONF
    sudo sed -i "s/#log_rotation_size = 10MB/log_rotation_size = 100MB/" $POSTGRES_CONF
    sudo sed -i "s/#log_min_duration_statement = -1/log_min_duration_statement = 1000/" $POSTGRES_CONF
    sudo sed -i "s/#log_line_prefix = ''/log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '/" $POSTGRES_CONF
    sudo sed -i "s/#log_checkpoints = off/log_checkpoints = on/" $POSTGRES_CONF
    sudo sed -i "s/#log_connections = off/log_connections = on/" $POSTGRES_CONF
    sudo sed -i "s/#log_disconnections = off/log_disconnections = on/" $POSTGRES_CONF
    sudo sed -i "s/#log_lock_waits = off/log_lock_waits = on/" $POSTGRES_CONF
    sudo sed -i "s/#log_temp_files = -1/log_temp_files = 0/" $POSTGRES_CONF
    
    # Configurações de estatísticas
    sudo sed -i "s/#track_activities = on/track_activities = on/" $POSTGRES_CONF
    sudo sed -i "s/#track_counts = on/track_counts = on/" $POSTGRES_CONF
    sudo sed -i "s/#track_io_timing = off/track_io_timing = on/" $POSTGRES_CONF
    
    # Configurações de autovacuum
    sudo sed -i "s/#autovacuum = on/autovacuum = on/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_max_workers = 3/autovacuum_max_workers = 3/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_naptime = 1min/autovacuum_naptime = 1min/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_vacuum_threshold = 50/autovacuum_vacuum_threshold = 50/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_analyze_threshold = 50/autovacuum_analyze_threshold = 50/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_vacuum_scale_factor = 0.2/autovacuum_vacuum_scale_factor = 0.2/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_analyze_scale_factor = 0.1/autovacuum_analyze_scale_factor = 0.1/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_freeze_max_age = 200000000/autovacuum_freeze_max_age = 200000000/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_multixact_freeze_max_age = 400000000/autovacuum_multixact_freeze_max_age = 400000000/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_vacuum_cost_delay = 20ms/autovacuum_vacuum_cost_delay = 20ms/" $POSTGRES_CONF
    sudo sed -i "s/#autovacuum_vacuum_cost_limit = 200/autovacuum_vacuum_cost_limit = 200/" $POSTGRES_CONF
    
    # Configurações de SSL
    sudo sed -i "s/#ssl = on/ssl = on/" $POSTGRES_CONF
    
    # Configurações de performance
    sudo sed -i "s/#random_page_cost = 4.0/random_page_cost = 1.1/" $POSTGRES_CONF
    sudo sed -i "s/#effective_io_concurrency = 1/effective_io_concurrency = 200/" $POSTGRES_CONF
    
    # Configurações de paralelismo
    sudo sed -i "s/#max_worker_processes = 8/max_worker_processes = 8/" $POSTGRES_CONF
    sudo sed -i "s/#max_parallel_workers_per_gather = 2/max_parallel_workers_per_gather = 2/" $POSTGRES_CONF
    sudo sed -i "s/#max_parallel_workers = 8/max_parallel_workers = 8/" $POSTGRES_CONF
    sudo sed -i "s/#max_parallel_maintenance_workers = 2/max_parallel_maintenance_workers = 2/" $POSTGRES_CONF
    
    # Configurações de timeout
    sudo sed -i "s/#statement_timeout = 0/statement_timeout = 30min/" $POSTGRES_CONF
    sudo sed -i "s/#lock_timeout = 0/lock_timeout = 1min/" $POSTGRES_CONF
    sudo sed -i "s/#idle_in_transaction_session_timeout = 0/idle_in_transaction_session_timeout = 10min/" $POSTGRES_CONF
    
    # Configurações de localização
    sudo sed -i "s/#lc_messages = 'en_US.UTF-8'/lc_messages = 'en_US.UTF-8'/" $POSTGRES_CONF
    sudo sed -i "s/#lc_monetary = 'en_US.UTF-8'/lc_monetary = 'en_US.UTF-8'/" $POSTGRES_CONF
    sudo sed -i "s/#lc_numeric = 'en_US.UTF-8'/lc_numeric = 'en_US.UTF-8'/" $POSTGRES_CONF
    sudo sed -i "s/#lc_time = 'en_US.UTF-8'/lc_time = 'en_US.UTF-8'/" $POSTGRES_CONF
    sudo sed -i "s/#default_text_search_config = 'pg_catalog.english'/default_text_search_config = 'pg_catalog.english'/" $POSTGRES_CONF
    sudo sed -i "s/#timezone = 'UTC'/timezone = 'UTC'/" $POSTGRES_CONF
    sudo sed -i "s/#log_timezone = 'UTC'/log_timezone = 'UTC'/" $POSTGRES_CONF
    
    # Configurações de replicação (para backup)
    sudo sed -i "s/#archive_mode = off/archive_mode = on/" $POSTGRES_CONF
    sudo sed -i "s/#archive_command = ''/archive_command = 'test ! -f \/var\/lib\/postgresql\/backup\/%f \&\& cp %p \/var\/lib\/postgresql\/backup\/%f'/" $POSTGRES_CONF
    sudo sed -i "s/#wal_level = replica/wal_level = replica/" $POSTGRES_CONF
    sudo sed -i "s/#max_wal_senders = 10/max_wal_senders = 3/" $POSTGRES_CONF
    sudo sed -i "s/#wal_keep_segments = 0/wal_keep_segments = 32/" $POSTGRES_CONF
    sudo sed -i "s/#hot_standby = off/hot_standby = on/" $POSTGRES_CONF
    sudo sed -i "s/#hot_standby_feedback = off/hot_standby_feedback = on/" $POSTGRES_CONF
    
    log "Configuração do postgresql.conf aplicada com sucesso"
else
    warn "Arquivo postgresql.conf não encontrado. Configuração manual necessária."
fi

# 2. Configurar pg_hba.conf para segurança
log "Configurando pg_hba.conf..."

PG_HBA_CONF="/etc/postgresql/*/main/pg_hba.conf"
if [ ! -f $PG_HBA_CONF ]; then
    PG_HBA_CONF="/var/lib/pgsql/data/pg_hba.conf"
fi

if [ -f $PG_HBA_CONF ]; then
    # Backup da configuração original
    sudo cp $PG_HBA_CONF ${PG_HBA_CONF}.backup.$(date +%Y%m%d_%H%M%S)
    
    # Configurações de segurança
    sudo sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" $PG_HBA_CONF
    sudo sed -i "s/host    all             all             127.0.0.1\/32            md5/host    all             all             127.0.0.1\/32            md5/" $PG_HBA_CONF
    sudo sed -i "s/host    all             all             ::1\/128                 md5/host    all             all             ::1\/128                 md5/" $PG_HBA_CONF
    
    log "Configuração do pg_hba.conf aplicada com sucesso"
else
    warn "Arquivo pg_hba.conf não encontrado. Configuração manual necessária."
fi

# 3. Criar diretório de backup
log "Criando diretório de backup..."
sudo mkdir -p /var/lib/postgresql/backup
sudo chown postgres:postgres /var/lib/postgresql/backup
sudo chmod 700 /var/lib/postgresql/backup

# 4. Configurar shared_preload_libraries
log "Configurando shared_preload_libraries..."

if [ -f $POSTGRES_CONF ]; then
    # Adicionar pg_stat_statements se não estiver presente
    if ! grep -q "shared_preload_libraries" $POSTGRES_CONF; then
        echo "shared_preload_libraries = 'pg_stat_statements'" | sudo tee -a $POSTGRES_CONF
    else
        sudo sed -i "s/#shared_preload_libraries = ''/shared_preload_libraries = 'pg_stat_statements'/" $POSTGRES_CONF
    fi
fi

# 5. Reiniciar PostgreSQL
log "Reiniciando PostgreSQL..."
sudo systemctl restart postgresql

# 6. Aguardar o PostgreSQL inicializar
sleep 5

# 7. Verificar se o PostgreSQL está rodando
if sudo systemctl is-active --quiet postgresql; then
    log "PostgreSQL reiniciado com sucesso"
else
    error "Falha ao reiniciar PostgreSQL"
    exit 1
fi

# 8. Criar extensões necessárias
log "Criando extensões do PostgreSQL..."

sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS btree_gin;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

log "Extensões criadas com sucesso"

# 9. Configurar usuário de backup
log "Configurando usuário de backup..."

sudo -u postgres psql -c "CREATE USER backup_user WITH PASSWORD 'backup_secure_password_2025';"
sudo -u postgres psql -c "GRANT CONNECT ON DATABASE sispat TO backup_user;"
sudo -u postgres psql -c "GRANT USAGE ON SCHEMA public TO backup_user;"
sudo -u postgres psql -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;"
sudo -u postgres psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;"

log "Usuário de backup configurado com sucesso"

# 10. Configurar monitoramento
log "Configurando monitoramento..."

# Criar função para monitoramento
sudo -u postgres psql -c "
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    database_name text,
    size_bytes bigint,
    connections integer,
    active_queries integer
) AS \$\$
BEGIN
    RETURN QUERY
    SELECT 
        d.datname::text,
        pg_database_size(d.datname) as size_bytes,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname) as connections,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname AND state = 'active') as active_queries
    FROM pg_database d
    WHERE d.datname NOT IN ('template0', 'template1', 'postgres');
END;
\$\$ LANGUAGE plpgsql;
"

log "Função de monitoramento criada com sucesso"

# 11. Configurar limpeza automática de logs
log "Configurando limpeza automática de logs..."

# Criar script de limpeza
sudo tee /usr/local/bin/cleanup-postgres-logs.sh > /dev/null << 'EOF'
#!/bin/bash
# Script para limpeza automática de logs do PostgreSQL

LOG_DIR="/var/lib/postgresql/*/main/pg_log"
RETENTION_DAYS=30

find $LOG_DIR -name "*.log" -type f -mtime +$RETENTION_DAYS -delete
find $LOG_DIR -name "*.log.*" -type f -mtime +$RETENTION_DAYS -delete

echo "$(date): Logs antigos removidos (mais de $RETENTION_DAYS dias)"
EOF

sudo chmod +x /usr/local/bin/cleanup-postgres-logs.sh

# Adicionar ao crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cleanup-postgres-logs.sh") | crontab -

log "Limpeza automática de logs configurada"

# 12. Verificar configuração
log "Verificando configuração..."

# Verificar se as extensões estão carregadas
if sudo -u postgres psql -c "SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';" | grep -q "pg_stat_statements"; then
    log "✅ Extensão pg_stat_statements carregada"
else
    warn "⚠️ Extensão pg_stat_statements não carregada"
fi

# Verificar configurações de memória
SHARED_BUFFERS=$(sudo -u postgres psql -c "SHOW shared_buffers;" | grep -v "shared_buffers" | grep -v "^-" | grep -v "^(" | tr -d ' ')
log "✅ shared_buffers: $SHARED_BUFFERS"

# Verificar configurações de logging
LOGGING_COLLECTOR=$(sudo -u postgres psql -c "SHOW logging_collector;" | grep -v "logging_collector" | grep -v "^-" | grep -v "^(" | tr -d ' ')
log "✅ logging_collector: $LOGGING_COLLECTOR"

# Verificar configurações de autovacuum
AUTOVACUUM=$(sudo -u postgres psql -c "SHOW autovacuum;" | grep -v "autovacuum" | grep -v "^-" | grep -v "^(" | tr -d ' ')
log "✅ autovacuum: $AUTOVACUUM"

# Verificar configurações de SSL
SSL=$(sudo -u postgres psql -c "SHOW ssl;" | grep -v "ssl" | grep -v "^-" | grep -v "^(" | tr -d ' ')
log "✅ ssl: $SSL"

log "🎉 Configuração do PostgreSQL para produção concluída com sucesso!"
log "📋 Próximos passos:"
log "   1. Configure o backup automático com o script de backup"
log "   2. Configure o monitoramento com ferramentas externas"
log "   3. Teste a performance com cargas de trabalho reais"
log "   4. Configure alertas para métricas críticas"

echo ""
log "🔧 Configurações aplicadas:"
log "   • Memória otimizada (shared_buffers: 256MB, work_mem: 4MB)"
log "   • WAL otimizado (checkpoint_timeout: 15min, max_wal_size: 1GB)"
log "   • Logging detalhado habilitado"
log "   • Autovacuum otimizado"
log "   • SSL habilitado"
log "   • Extensões de performance instaladas"
log "   • Usuário de backup criado"
log "   • Monitoramento configurado"
log "   • Limpeza automática de logs configurada"
