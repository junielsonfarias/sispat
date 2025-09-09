#!/bin/bash

# SISPAT - Script de Configuração do Banco de Dados de Produção
# Este script configura o PostgreSQL para produção

set -e

echo "🚀 Configurando Banco de Dados de Produção do SISPAT..."

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
DB_NAME="sispat_production"
DB_USER="sispat_user"
DB_PASSWORD="CHANGE_THIS_PASSWORD"
DB_HOST="localhost"
DB_PORT="5432"
SERVICE_USER="sispat"

# 1. Verificar se o PostgreSQL está instalado
log "Verificando instalação do PostgreSQL..."

if ! command -v psql &> /dev/null; then
    error "PostgreSQL não está instalado. Instale primeiro o PostgreSQL."
    exit 1
fi

log "✅ PostgreSQL está instalado"

# 2. Verificar se o PostgreSQL está rodando
log "Verificando se o PostgreSQL está rodando..."

if ! systemctl is-active --quiet postgresql; then
    log "Iniciando PostgreSQL..."
    systemctl start postgresql
    systemctl enable postgresql
fi

log "✅ PostgreSQL está rodando"

# 3. Configurar PostgreSQL para produção
log "Configurando PostgreSQL para produção..."

# Backup da configuração original
cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup
cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Obter versão do PostgreSQL
PG_VERSION=$(psql --version | grep -oP '\d+\.\d+' | head -1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

log "Versão do PostgreSQL: $PG_VERSION"

# Configurar postgresql.conf para produção
cat >> $PG_CONFIG_DIR/postgresql.conf << 'EOF'

# SISPAT - Configurações de Produção
# Conexões
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_truncate_on_rotation = on
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = -1

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Security
ssl = on
ssl_cert_file = '/etc/ssl/certs/sispat.crt'
ssl_key_file = '/etc/ssl/private/sispat.key'
password_encryption = scram-sha-256

# Monitoring
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
EOF

# Configurar pg_hba.conf para produção
cat >> $PG_CONFIG_DIR/pg_hba.conf << 'EOF'

# SISPAT - Configurações de Produção
# Local connections
local   all             postgres                                peer
local   all             all                                     md5

# IPv4 local connections
host    all             all             127.0.0.1/32            md5
host    all             all             0.0.0.0/0               md5

# IPv6 local connections
host    all             all             ::1/128                 md5

# SSL connections
hostssl all             all             0.0.0.0/0               md5
EOF

log "✅ Configurações do PostgreSQL aplicadas"

# 4. Reiniciar PostgreSQL
log "Reiniciando PostgreSQL..."

systemctl restart postgresql

log "✅ PostgreSQL reiniciado"

# 5. Criar usuário e banco de dados
log "Criando usuário e banco de dados..."

# Criar usuário
sudo -u postgres psql << EOF
-- Criar usuário
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Criar banco de dados
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Conceder privilégios de superusuário (apenas para desenvolvimento)
ALTER USER $DB_USER CREATEDB;
ALTER USER $DB_USER CREATEROLE;

-- Configurar extensões
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Conceder privilégios nas extensões
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

\q
EOF

log "✅ Usuário e banco de dados criados"

# 6. Configurar backup automático
log "Configurando backup automático..."

# Criar script de backup do banco
cat > /opt/sispat/scripts/backup-database.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup do Banco de Dados
BACKUP_DIR="/opt/sispat/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/sispat/application/backup-database.log"
DB_NAME="sispat_production"
DB_USER="sispat_user"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

log "Iniciando backup do banco de dados..."

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Fazer backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME -f $BACKUP_DIR/sispat_$DATE.sql

if [ $? -eq 0 ]; then
    log "Backup do banco de dados concluído: sispat_$DATE.sql"
    
    # Comprimir backup
    gzip $BACKUP_DIR/sispat_$DATE.sql
    log "Backup comprimido: sispat_$DATE.sql.gz"
    
    # Limpar backups antigos (manter apenas 30 dias)
    find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
    log "Backups antigos removidos"
    
    log "Backup do banco de dados concluído com sucesso!"
else
    log "ERRO: Falha no backup do banco de dados"
    exit 1
fi
EOF

# Tornar script executável
chmod +x /opt/sispat/scripts/backup-database.sh
chown $SERVICE_USER:$SERVICE_USER /opt/sispat/scripts/backup-database.sh

# Configurar cron para backup automático (diário às 2h)
echo "0 2 * * * $SERVICE_USER /opt/sispat/scripts/backup-database.sh" >> /etc/crontab

log "✅ Backup automático configurado"

# 7. Configurar monitoramento do banco
log "Configurando monitoramento do banco..."

# Criar script de monitoramento do banco
cat > /opt/sispat/scripts/monitor-database.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Monitoramento do Banco de Dados
LOG_FILE="/var/log/sispat/application/monitor-database.log"
ALERT_EMAIL="admin@sispat.com"
DB_NAME="sispat_production"
DB_USER="sispat_user"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT Database Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

# Verificar conectividade
if ! pg_isready -h localhost -p 5432 -U $DB_USER; then
    send_alert "Banco de dados PostgreSQL não está respondendo!"
    exit 1
fi

# Verificar conexões ativas
ACTIVE_CONNECTIONS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
if [ $ACTIVE_CONNECTIONS -gt 180 ]; then
    send_alert "Número alto de conexões ativas: $ACTIVE_CONNECTIONS"
fi

# Verificar tamanho do banco
DB_SIZE=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
log "Tamanho do banco de dados: $DB_SIZE"

# Verificar queries lentas
SLOW_QUERIES=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;")
if [ $SLOW_QUERIES -gt 10 ]; then
    send_alert "Número alto de queries lentas: $SLOW_QUERIES"
fi

# Verificar locks
LOCK_COUNT=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM pg_locks WHERE NOT granted;")
if [ $LOCK_COUNT -gt 5 ]; then
    send_alert "Número alto de locks não concedidos: $LOCK_COUNT"
fi

log "Monitoramento do banco de dados executado com sucesso"
EOF

# Tornar script executável
chmod +x /opt/sispat/scripts/monitor-database.sh
chown $SERVICE_USER:$SERVICE_USER /opt/sispat/scripts/monitor-database.sh

# Configurar cron para monitoramento (a cada 5 minutos)
echo "*/5 * * * * $SERVICE_USER /opt/sispat/scripts/monitor-database.sh" >> /etc/crontab

log "✅ Monitoramento do banco configurado"

# 8. Configurar otimizações de performance
log "Configurando otimizações de performance..."

# Criar script de otimização
cat > /opt/sispat/scripts/optimize-database.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Otimização do Banco de Dados
LOG_FILE="/var/log/sispat/application/optimize-database.log"
DB_NAME="sispat_production"
DB_USER="sispat_user"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

log "Iniciando otimização do banco de dados..."

# Analisar tabelas
log "Analisando tabelas..."
psql -h localhost -U $DB_USER -d $DB_NAME -c "ANALYZE;"

# Vacuum das tabelas
log "Executando VACUUM..."
psql -h localhost -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;"

# Reindexar tabelas
log "Reindexando tabelas..."
psql -h localhost -U $DB_USER -d $DB_NAME -c "REINDEX DATABASE $DB_NAME;"

# Atualizar estatísticas
log "Atualizando estatísticas..."
psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT pg_stat_reset();"

log "Otimização do banco de dados concluída com sucesso!"
EOF

# Tornar script executável
chmod +x /opt/sispat/scripts/optimize-database.sh
chown $SERVICE_USER:$SERVICE_USER /opt/sispat/scripts/optimize-database.sh

# Configurar cron para otimização (semanal aos domingos às 3h)
echo "0 3 * * 0 $SERVICE_USER /opt/sispat/scripts/optimize-database.sh" >> /etc/crontab

log "✅ Otimizações de performance configuradas"

# 9. Configurar SSL para o banco
log "Configurando SSL para o banco..."

# Criar certificado SSL para o banco
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/postgresql.key \
    -out /etc/ssl/certs/postgresql.crt \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=SISPAT/CN=localhost"

# Definir permissões
chown postgres:postgres /etc/ssl/certs/postgresql.crt
chown postgres:postgres /etc/ssl/private/postgresql.key
chmod 644 /etc/ssl/certs/postgresql.crt
chmod 600 /etc/ssl/private/postgresql.key

log "✅ SSL configurado para o banco"

# 10. Testar configuração
log "Testando configuração do banco..."

# Testar conexão
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null; then
    log "✅ Conexão com o banco testada com sucesso"
else
    error "❌ Falha na conexão com o banco"
    exit 1
fi

# Testar SSL
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT ssl_is_used();" | grep -q "t"; then
    log "✅ SSL está funcionando"
else
    warn "⚠️ SSL não está funcionando"
fi

log "✅ Configuração do banco testada"

# 11. Exibir resumo final
log "🎉 Banco de dados de produção configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Banco de dados: $DB_NAME"
log "   • Usuário: $DB_USER"
log "   • Host: $DB_HOST"
log "   • Porta: $DB_PORT"
log "   • SSL: Habilitado"
log ""
log "🔧 Recursos configurados:"
log "   • Backup automático: Diário às 2h"
log "   • Monitoramento: A cada 5 minutos"
log "   • Otimização: Semanal aos domingos às 3h"
log "   • Logs: Configurados para produção"
log "   • Extensões: uuid-ossp, pgcrypto, pg_trgm, etc."
log ""
log "📁 Scripts disponíveis:"
log "   • Backup: /opt/sispat/scripts/backup-database.sh"
log "   • Monitor: /opt/sispat/scripts/monitor-database.sh"
log "   • Otimização: /opt/sispat/scripts/optimize-database.sh"
log ""
log "⚠️  Próximos passos:"
log "   1. Executar migrações do banco de dados"
log "   2. Configurar senhas seguras"
log "   3. Testar backup e restore"
log "   4. Configurar monitoramento de alertas"
log ""
log "✅ Banco de dados de produção pronto para uso!"
