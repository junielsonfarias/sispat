#!/bin/bash

# SISPAT - Script de Configuração do Sistema de Backup
# Este script configura sistema de backup automatizado completo

set -e

echo "🚀 Configurando Sistema de Backup do SISPAT..."

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
PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="/opt/sispat/backups"
SERVICE_USER="sispat"
RETENTION_DAYS=${1:-30}
CLOUD_BACKUP=${2:-"false"}
CLOUD_PROVIDER=${3:-"aws"}

# 1. Criar estrutura de diretórios de backup
log "Criando estrutura de diretórios de backup..."

mkdir -p $BACKUP_DIR/{database,files,config,logs,full}
mkdir -p $BACKUP_DIR/database/{daily,weekly,monthly}
mkdir -p $BACKUP_DIR/files/{uploads,static,media}
mkdir -p $BACKUP_DIR/config/{nginx,pm2,ssl,env}
mkdir -p $BACKUP_DIR/logs/{application,system,security}

# Definir permissões
chown -R $SERVICE_USER:$SERVICE_USER $BACKUP_DIR
chmod -R 755 $BACKUP_DIR

log "✅ Estrutura de diretórios criada"

# 2. Configurar backup do banco de dados
log "Configurando backup do banco de dados..."

cat > $PRODUCTION_DIR/scripts/backup-database.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup do Banco de Dados
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-database.log"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="sispat_production"
DB_USER="sispat_user"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🗄️ Iniciando backup do banco de dados..."

# Verificar se o PostgreSQL está rodando
if ! pg_isready -h localhost -p 5432 -U $DB_USER; then
    log "ERRO: PostgreSQL não está respondendo"
    exit 1
fi

# Backup completo
log "Fazendo backup completo do banco..."
pg_dump -h localhost -U $DB_USER -d $DB_NAME \
    --verbose --no-password --format=custom \
    --file="$BACKUP_DIR/database/daily/sispat_full_$DATE.dump"

if [ $? -eq 0 ]; then
    log "✅ Backup completo criado: sispat_full_$DATE.dump"
else
    log "❌ ERRO: Falha no backup completo"
    exit 1
fi

# Backup apenas dados (sem schema)
log "Fazendo backup apenas dos dados..."
pg_dump -h localhost -U $DB_USER -d $DB_NAME \
    --data-only --verbose --no-password --format=custom \
    --file="$BACKUP_DIR/database/daily/sispat_data_$DATE.dump"

if [ $? -eq 0 ]; then
    log "✅ Backup de dados criado: sispat_data_$DATE.dump"
else
    log "❌ ERRO: Falha no backup de dados"
fi

# Backup apenas schema
log "Fazendo backup apenas do schema..."
pg_dump -h localhost -U $DB_USER -d $DB_NAME \
    --schema-only --verbose --no-password --format=custom \
    --file="$BACKUP_DIR/database/daily/sispat_schema_$DATE.dump"

if [ $? -eq 0 ]; then
    log "✅ Backup de schema criado: sispat_schema_$DATE.dump"
else
    log "❌ ERRO: Falha no backup de schema"
fi

# Backup em SQL (para compatibilidade)
log "Fazendo backup em formato SQL..."
pg_dump -h localhost -U $DB_USER -d $DB_NAME \
    --verbose --no-password --format=plain \
    --file="$BACKUP_DIR/database/daily/sispat_$DATE.sql"

if [ $? -eq 0 ]; then
    log "✅ Backup SQL criado: sispat_$DATE.sql"
    
    # Comprimir backup SQL
    gzip "$BACKUP_DIR/database/daily/sispat_$DATE.sql"
    log "✅ Backup SQL comprimido: sispat_$DATE.sql.gz"
else
    log "❌ ERRO: Falha no backup SQL"
fi

# Verificar integridade dos backups
log "Verificando integridade dos backups..."

# Verificar backup completo
if pg_restore --list "$BACKUP_DIR/database/daily/sispat_full_$DATE.dump" > /dev/null 2>&1; then
    log "✅ Backup completo: Integridade OK"
else
    log "❌ ERRO: Backup completo corrompido"
fi

# Verificar backup de dados
if pg_restore --list "$BACKUP_DIR/database/daily/sispat_data_$DATE.dump" > /dev/null 2>&1; then
    log "✅ Backup de dados: Integridade OK"
else
    log "❌ ERRO: Backup de dados corrompido"
fi

# Estatísticas do backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/database/daily/sispat_full_$DATE.dump" | cut -f1)
log "📊 Tamanho do backup completo: $BACKUP_SIZE"

# Limpar backups antigos
log "Limpando backups antigos..."
find $BACKUP_DIR/database/daily -name "*.dump" -mtime +7 -delete
find $BACKUP_DIR/database/daily -name "*.sql.gz" -mtime +7 -delete

log "🎉 Backup do banco de dados concluído com sucesso!"
EOF

chmod +x $PRODUCTION_DIR/scripts/backup-database.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup-database.sh

log "✅ Script de backup do banco configurado"

# 3. Configurar backup de arquivos
log "Configurando backup de arquivos..."

cat > $PRODUCTION_DIR/scripts/backup-files.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup de Arquivos
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-files.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "📁 Iniciando backup de arquivos..."

# Backup de uploads
if [ -d "$PRODUCTION_DIR/uploads" ]; then
    log "Fazendo backup de uploads..."
    tar -czf "$BACKUP_DIR/files/uploads/uploads_$DATE.tar.gz" \
        -C "$PRODUCTION_DIR" uploads/
    
    if [ $? -eq 0 ]; then
        log "✅ Backup de uploads criado: uploads_$DATE.tar.gz"
    else
        log "❌ ERRO: Falha no backup de uploads"
    fi
else
    log "⚠️ Diretório de uploads não encontrado"
fi

# Backup de arquivos estáticos
if [ -d "$PRODUCTION_DIR/app/public" ]; then
    log "Fazendo backup de arquivos estáticos..."
    tar -czf "$BACKUP_DIR/files/static/static_$DATE.tar.gz" \
        -C "$PRODUCTION_DIR/app" public/
    
    if [ $? -eq 0 ]; then
        log "✅ Backup de arquivos estáticos criado: static_$DATE.tar.gz"
    else
        log "❌ ERRO: Falha no backup de arquivos estáticos"
    fi
else
    log "⚠️ Diretório de arquivos estáticos não encontrado"
fi

# Backup de logs
if [ -d "/var/log/sispat" ]; then
    log "Fazendo backup de logs..."
    tar -czf "$BACKUP_DIR/logs/logs_$DATE.tar.gz" \
        -C "/var/log" sispat/
    
    if [ $? -eq 0 ]; then
        log "✅ Backup de logs criado: logs_$DATE.tar.gz"
    else
        log "❌ ERRO: Falha no backup de logs"
    fi
else
    log "⚠️ Diretório de logs não encontrado"
fi

# Backup de configurações
log "Fazendo backup de configurações..."
tar -czf "$BACKUP_DIR/config/config_$DATE.tar.gz" \
    -C "/etc" sispat/ \
    -C "$PRODUCTION_DIR" .env* package.json ecosystem.config.js

if [ $? -eq 0 ]; then
    log "✅ Backup de configurações criado: config_$DATE.tar.gz"
else
    log "❌ ERRO: Falha no backup de configurações"
fi

# Estatísticas dos backups
log "📊 Estatísticas dos backups:"
for file in $BACKUP_DIR/files/*/*_$DATE.tar.gz; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        log "   $(basename $file): $size"
    fi
done

# Limpar backups antigos
log "Limpando backups antigos..."
find $BACKUP_DIR/files -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR/config -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR/logs -name "*.tar.gz" -mtime +7 -delete

log "🎉 Backup de arquivos concluído com sucesso!"
EOF

chmod +x $PRODUCTION_DIR/scripts/backup-files.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup-files.sh

log "✅ Script de backup de arquivos configurado"

# 4. Configurar backup completo
log "Configurando backup completo..."

cat > $PRODUCTION_DIR/scripts/backup-full.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup Completo
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-full.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🔄 Iniciando backup completo do SISPAT..."

# Criar diretório de backup completo
mkdir -p "$BACKUP_DIR/full/sispat_full_$DATE"

# Executar backup do banco
log "Executando backup do banco de dados..."
$PRODUCTION_DIR/scripts/backup-database.sh

# Executar backup de arquivos
log "Executando backup de arquivos..."
$PRODUCTION_DIR/scripts/backup-files.sh

# Copiar backups para diretório completo
log "Consolidando backup completo..."
cp -r $BACKUP_DIR/database/daily/*_$DATE.* "$BACKUP_DIR/full/sispat_full_$DATE/" 2>/dev/null || true
cp -r $BACKUP_DIR/files/*/*_$DATE.tar.gz "$BACKUP_DIR/full/sispat_full_$DATE/" 2>/dev/null || true
cp -r $BACKUP_DIR/config/*_$DATE.tar.gz "$BACKUP_DIR/full/sispat_full_$DATE/" 2>/dev/null || true
cp -r $BACKUP_DIR/logs/*_$DATE.tar.gz "$BACKUP_DIR/full/sispat_full_$DATE/" 2>/dev/null || true

# Criar arquivo de metadados
cat > "$BACKUP_DIR/full/sispat_full_$DATE/backup_info.txt" << EOL
SISPAT Backup Completo
=====================
Data: $(date)
Versão: $(cd $PRODUCTION_DIR/app && git rev-parse --short HEAD 2>/dev/null || echo "N/A")
Sistema: $(uname -a)
Usuário: $(whoami)
Diretório: $PRODUCTION_DIR

Conteúdo do Backup:
- Banco de dados (PostgreSQL)
- Arquivos de upload
- Arquivos estáticos
- Logs do sistema
- Configurações

Para restaurar:
1. Restaurar banco: pg_restore -d sispat_production sispat_full_*.dump
2. Extrair arquivos: tar -xzf *.tar.gz
3. Restaurar configurações: cp -r config/* /etc/sispat/
EOL

# Comprimir backup completo
log "Comprimindo backup completo..."
cd "$BACKUP_DIR/full"
tar -czf "sispat_full_$DATE.tar.gz" "sispat_full_$DATE/"

# Remover diretório temporário
rm -rf "sispat_full_$DATE/"

# Verificar integridade
if [ -f "sispat_full_$DATE.tar.gz" ]; then
    size=$(du -h "sispat_full_$DATE.tar.gz" | cut -f1)
    log "✅ Backup completo criado: sispat_full_$DATE.tar.gz ($size)"
else
    log "❌ ERRO: Falha na criação do backup completo"
    exit 1
fi

# Limpar backups antigos
log "Limpando backups antigos..."
find $BACKUP_DIR/full -name "sispat_full_*.tar.gz" -mtime +30 -delete

log "🎉 Backup completo concluído com sucesso!"
EOF

chmod +x $PRODUCTION_DIR/scripts/backup-full.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup-full.sh

log "✅ Script de backup completo configurado"

# 5. Configurar backup em nuvem (opcional)
if [ "$CLOUD_BACKUP" = "true" ]; then
    log "Configurando backup em nuvem..."
    
    case $CLOUD_PROVIDER in
        "aws")
            # Configurar AWS CLI
            if ! command -v aws &> /dev/null; then
                log "Instalando AWS CLI..."
                curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
                unzip awscliv2.zip
                sudo ./aws/install
                rm -rf aws awscliv2.zip
            fi
            
            # Criar script de backup para AWS S3
            cat > $PRODUCTION_DIR/scripts/backup-cloud-aws.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup para AWS S3
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-cloud.log"
S3_BUCKET=${S3_BUCKET:-"sispat-backups"}
S3_PREFIX=${S3_PREFIX:-"backups"}

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "☁️ Iniciando backup para AWS S3..."

# Verificar se AWS CLI está configurado
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    log "❌ ERRO: AWS CLI não está configurado"
    exit 1
fi

# Fazer backup completo
$PRODUCTION_DIR/scripts/backup-full.sh

# Encontrar backup mais recente
LATEST_BACKUP=$(ls -t $BACKUP_DIR/full/sispat_full_*.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log "❌ ERRO: Nenhum backup encontrado"
    exit 1
fi

# Upload para S3
BACKUP_NAME=$(basename $LATEST_BACKUP)
log "Enviando $BACKUP_NAME para S3..."

aws s3 cp "$LATEST_BACKUP" "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_NAME" \
    --storage-class STANDARD_IA \
    --metadata "backup-date=$(date -Iseconds),system=sispat"

if [ $? -eq 0 ]; then
    log "✅ Backup enviado para S3: s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_NAME"
else
    log "❌ ERRO: Falha no upload para S3"
    exit 1
fi

# Limpar backups locais antigos (manter apenas 7 dias)
find $BACKUP_DIR/full -name "sispat_full_*.tar.gz" -mtime +7 -delete

log "🎉 Backup em nuvem concluído com sucesso!"
EOF
            ;;
        "gcp")
            # Configurar Google Cloud CLI
            if ! command -v gsutil &> /dev/null; then
                log "Instalando Google Cloud CLI..."
                curl https://sdk.cloud.google.com | bash
                source ~/.bashrc
            fi
            
            # Criar script de backup para Google Cloud Storage
            cat > $PRODUCTION_DIR/scripts/backup-cloud-gcp.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup para Google Cloud Storage
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-cloud.log"
GCS_BUCKET=${GCS_BUCKET:-"sispat-backups"}

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "☁️ Iniciando backup para Google Cloud Storage..."

# Verificar se gsutil está configurado
if ! gsutil ls > /dev/null 2>&1; then
    log "❌ ERRO: gsutil não está configurado"
    exit 1
fi

# Fazer backup completo
$PRODUCTION_DIR/scripts/backup-full.sh

# Encontrar backup mais recente
LATEST_BACKUP=$(ls -t $BACKUP_DIR/full/sispat_full_*.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log "❌ ERRO: Nenhum backup encontrado"
    exit 1
fi

# Upload para GCS
BACKUP_NAME=$(basename $LATEST_BACKUP)
log "Enviando $BACKUP_NAME para GCS..."

gsutil cp "$LATEST_BACKUP" "gs://$GCS_BUCKET/backups/$BACKUP_NAME" \
    -s NEARLINE

if [ $? -eq 0 ]; then
    log "✅ Backup enviado para GCS: gs://$GCS_BUCKET/backups/$BACKUP_NAME"
else
    log "❌ ERRO: Falha no upload para GCS"
    exit 1
fi

# Limpar backups locais antigos (manter apenas 7 dias)
find $BACKUP_DIR/full -name "sispat_full_*.tar.gz" -mtime +7 -delete

log "🎉 Backup em nuvem concluído com sucesso!"
EOF
            ;;
    esac
    
    chmod +x $PRODUCTION_DIR/scripts/backup-cloud-*.sh
    chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup-cloud-*.sh
    
    log "✅ Script de backup em nuvem configurado"
fi

# 6. Configurar agendamento de backups
log "Configurando agendamento de backups..."

# Backup diário (banco de dados)
echo "0 2 * * * $SERVICE_USER $PRODUCTION_DIR/scripts/backup-database.sh" >> /etc/crontab

# Backup semanal (arquivos)
echo "0 3 * * 0 $SERVICE_USER $PRODUCTION_DIR/scripts/backup-files.sh" >> /etc/crontab

# Backup mensal (completo)
echo "0 4 1 * * $SERVICE_USER $PRODUCTION_DIR/scripts/backup-full.sh" >> /etc/crontab

# Backup em nuvem (se configurado)
if [ "$CLOUD_BACKUP" = "true" ]; then
    echo "0 5 * * 0 $SERVICE_USER $PRODUCTION_DIR/scripts/backup-cloud-$CLOUD_PROVIDER.sh" >> /etc/crontab
fi

log "✅ Agendamento de backups configurado"

# 7. Configurar monitoramento de backups
log "Configurando monitoramento de backups..."

cat > $PRODUCTION_DIR/scripts/monitor-backup.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Monitoramento de Backup
LOG_FILE="/var/log/sispat/application/monitor-backup.log"
ALERT_EMAIL="admin@sispat.com"
BACKUP_DIR="/opt/sispat/backups"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT Backup Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

# Verificar se há backups recentes
log "Verificando backups recentes..."

# Verificar backup do banco (últimas 24 horas)
DB_BACKUP=$(find $BACKUP_DIR/database/daily -name "*.dump" -mtime -1 | wc -l)
if [ $DB_BACKUP -eq 0 ]; then
    send_alert "Nenhum backup do banco de dados nas últimas 24 horas!"
fi

# Verificar backup de arquivos (última semana)
FILES_BACKUP=$(find $BACKUP_DIR/files -name "*.tar.gz" -mtime -7 | wc -l)
if [ $FILES_BACKUP -eq 0 ]; then
    send_alert "Nenhum backup de arquivos na última semana!"
fi

# Verificar backup completo (último mês)
FULL_BACKUP=$(find $BACKUP_DIR/full -name "*.tar.gz" -mtime -30 | wc -l)
if [ $FULL_BACKUP -eq 0 ]; then
    send_alert "Nenhum backup completo no último mês!"
fi

# Verificar espaço em disco
DISK_USAGE=$(df $BACKUP_DIR | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    send_alert "Uso de disco alto no diretório de backup: ${DISK_USAGE}%"
fi

# Verificar integridade dos backups
log "Verificando integridade dos backups..."

# Verificar backup mais recente do banco
LATEST_DB_BACKUP=$(ls -t $BACKUP_DIR/database/daily/*.dump 2>/dev/null | head -1)
if [ -n "$LATEST_DB_BACKUP" ]; then
    if ! pg_restore --list "$LATEST_DB_BACKUP" > /dev/null 2>&1; then
        send_alert "Backup do banco de dados corrompido: $LATEST_DB_BACKUP"
    fi
fi

log "Monitoramento de backup executado com sucesso"
EOF

chmod +x $PRODUCTION_DIR/scripts/monitor-backup.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/monitor-backup.sh

# Agendar monitoramento diário
echo "0 6 * * * $SERVICE_USER $PRODUCTION_DIR/scripts/monitor-backup.sh" >> /etc/crontab

log "✅ Monitoramento de backups configurado"

# 8. Configurar script de restauração
log "Configurando script de restauração..."

cat > $PRODUCTION_DIR/scripts/restore-backup.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Restauração de Backup
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/restore-backup.log"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: $0 [OPÇÕES]"
    echo ""
    echo "Opções:"
    echo "  -d, --database FILE    Restaurar banco de dados"
    echo "  -f, --files FILE       Restaurar arquivos"
    echo "  -c, --config FILE      Restaurar configurações"
    echo "  -a, --all FILE         Restaurar backup completo"
    echo "  -l, --list             Listar backups disponíveis"
    echo "  -h, --help             Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 --list"
    echo "  $0 --database sispat_full_20240101_020000.dump"
    echo "  $0 --all sispat_full_20240101_020000.tar.gz"
}

# Função para listar backups
list_backups() {
    log "Backups disponíveis:"
    echo ""
    echo "Banco de dados:"
    ls -la $BACKUP_DIR/database/daily/*.dump 2>/dev/null || echo "  Nenhum backup encontrado"
    echo ""
    echo "Backups completos:"
    ls -la $BACKUP_DIR/full/*.tar.gz 2>/dev/null || echo "  Nenhum backup encontrado"
}

# Função para restaurar banco
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "❌ ERRO: Arquivo de backup não encontrado: $backup_file"
        exit 1
    fi
    
    log "🔄 Restaurando banco de dados de: $backup_file"
    
    # Fazer backup antes da restauração
    log "Fazendo backup antes da restauração..."
    $PRODUCTION_DIR/scripts/backup-database.sh
    
    # Parar aplicação
    log "Parando aplicação..."
    pm2 stop all
    
    # Restaurar banco
    log "Restaurando banco de dados..."
    pg_restore -h localhost -U sispat_user -d sispat_production \
        --clean --if-exists --verbose "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "✅ Banco de dados restaurado com sucesso"
    else
        log "❌ ERRO: Falha na restauração do banco"
        exit 1
    fi
    
    # Reiniciar aplicação
    log "Reiniciando aplicação..."
    pm2 start all
    
    log "🎉 Restauração do banco concluída!"
}

# Função para restaurar arquivos
restore_files() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "❌ ERRO: Arquivo de backup não encontrado: $backup_file"
        exit 1
    fi
    
    log "🔄 Restaurando arquivos de: $backup_file"
    
    # Extrair arquivos
    log "Extraindo arquivos..."
    tar -xzf "$backup_file" -C "$PRODUCTION_DIR/"
    
    if [ $? -eq 0 ]; then
        log "✅ Arquivos restaurados com sucesso"
    else
        log "❌ ERRO: Falha na restauração dos arquivos"
        exit 1
    fi
    
    # Definir permissões
    chown -R sispat:sispat $PRODUCTION_DIR/uploads
    chmod -R 755 $PRODUCTION_DIR/uploads
    
    log "🎉 Restauração de arquivos concluída!"
}

# Função para restaurar backup completo
restore_full() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "❌ ERRO: Arquivo de backup não encontrado: $backup_file"
        exit 1
    fi
    
    log "🔄 Restaurando backup completo de: $backup_file"
    
    # Extrair backup completo
    log "Extraindo backup completo..."
    cd "$BACKUP_DIR/full"
    tar -xzf "$backup_file"
    
    # Restaurar banco
    local db_backup=$(ls sispat_full_*/sispat_full_*.dump | head -1)
    if [ -n "$db_backup" ]; then
        restore_database "$db_backup"
    fi
    
    # Restaurar arquivos
    for file_backup in sispat_full_*/*.tar.gz; do
        if [ -f "$file_backup" ]; then
            restore_files "$file_backup"
        fi
    done
    
    # Limpar arquivos temporários
    rm -rf sispat_full_*
    
    log "🎉 Restauração completa concluída!"
}

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--database)
            restore_database "$2"
            shift 2
            ;;
        -f|--files)
            restore_files "$2"
            shift 2
            ;;
        -c|--config)
            restore_files "$2"  # Configurações são arquivos
            shift 2
            ;;
        -a|--all)
            restore_full "$2"
            shift 2
            ;;
        -l|--list)
            list_backups
            exit 0
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log "❌ ERRO: Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Se nenhum argumento foi fornecido, mostrar ajuda
show_help
EOF

chmod +x $PRODUCTION_DIR/scripts/restore-backup.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/restore-backup.sh

log "✅ Script de restauração configurado"

# 9. Exibir resumo final
log "🎉 Sistema de backup configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Diretório de backup: $BACKUP_DIR"
log "   • Retenção: $RETENTION_DAYS dias"
log "   • Backup em nuvem: $([ "$CLOUD_BACKUP" = "true" ] && echo "Sim ($CLOUD_PROVIDER)" || echo "Não")"
log ""
log "🔧 Scripts disponíveis:"
log "   • Backup do banco: $PRODUCTION_DIR/scripts/backup-database.sh"
log "   • Backup de arquivos: $PRODUCTION_DIR/scripts/backup-files.sh"
log "   • Backup completo: $PRODUCTION_DIR/scripts/backup-full.sh"
log "   • Restauração: $PRODUCTION_DIR/scripts/restore-backup.sh"
log "   • Monitoramento: $PRODUCTION_DIR/scripts/monitor-backup.sh"
if [ "$CLOUD_BACKUP" = "true" ]; then
    log "   • Backup em nuvem: $PRODUCTION_DIR/scripts/backup-cloud-$CLOUD_PROVIDER.sh"
fi
log ""
log "⏰ Agendamento:"
log "   • Backup do banco: Diário às 2h"
log "   • Backup de arquivos: Semanal aos domingos às 3h"
log "   • Backup completo: Mensal no dia 1 às 4h"
log "   • Monitoramento: Diário às 6h"
if [ "$CLOUD_BACKUP" = "true" ]; then
    log "   • Backup em nuvem: Semanal aos domingos às 5h"
fi
log ""
log "⚠️  Próximos passos:"
log "   1. Testar backup manual"
log "   2. Configurar credenciais de nuvem (se aplicável)"
log "   3. Verificar agendamento"
log "   4. Testar restauração"
log "   5. Monitorar logs de backup"
log ""
log "✅ Sistema de backup pronto para uso!"
