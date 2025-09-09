#!/bin/bash

# SISPAT - Script de Configuração de Backup em Nuvem
# Este script configura backup automático em nuvem

set -e

echo "☁️ Configurando Backup em Nuvem do SISPAT..."

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
SERVICE_USER="sispat"
PROVIDER=${1:-"aws"}
BUCKET_NAME=${2:-"sispat-backups"}
REGION=${3:-"us-east-1"}

# 1. Configurar AWS S3
if [ "$PROVIDER" = "aws" ]; then
    log "Configurando backup para AWS S3..."
    
    # Instalar AWS CLI
    if ! command -v aws &> /dev/null; then
        log "Instalando AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    fi
    
    # Configurar credenciais
    log "Configurando credenciais AWS..."
    mkdir -p /home/$SERVICE_USER/.aws
    cat > /home/$SERVICE_USER/.aws/credentials << 'EOF'
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF
    
    cat > /home/$SERVICE_USER/.aws/config << 'EOF'
[default]
region = us-east-1
output = json
EOF
    
    chown -R $SERVICE_USER:$SERVICE_USER /home/$SERVICE_USER/.aws
    chmod 600 /home/$SERVICE_USER/.aws/credentials
    
    # Criar bucket S3
    log "Criando bucket S3: $BUCKET_NAME"
    aws s3 mb s3://$BUCKET_NAME --region $REGION
    
    # Configurar lifecycle
    cat > /tmp/lifecycle.json << EOF
{
    "Rules": [
        {
            "ID": "SISPATBackupLifecycle",
            "Status": "Enabled",
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ]
        }
    ]
}
EOF
    
    aws s3api put-bucket-lifecycle-configuration \
        --bucket $BUCKET_NAME \
        --lifecycle-configuration file:///tmp/lifecycle.json
    
    rm /tmp/lifecycle.json
    
    # Configurar script de backup
    cat > $PRODUCTION_DIR/scripts/backup-s3.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup para AWS S3
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-s3.log"
S3_BUCKET="sispat-backups"
S3_PREFIX="backups"

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
log "Executando backup completo..."
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
    --metadata "backup-date=$(date -Iseconds),system=sispat,version=$(cd $PRODUCTION_DIR/app && git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"

if [ $? -eq 0 ]; then
    log "✅ Backup enviado para S3: s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_NAME"
    
    # Verificar integridade
    log "Verificando integridade do backup..."
    aws s3api head-object --bucket $S3_BUCKET --key "$S3_PREFIX/$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        log "✅ Backup verificado com sucesso"
    else
        log "❌ ERRO: Falha na verificação do backup"
    fi
else
    log "❌ ERRO: Falha no upload para S3"
    exit 1
fi

# Limpar backups locais antigos (manter apenas 7 dias)
find $BACKUP_DIR/full -name "sispat_full_*.tar.gz" -mtime +7 -delete

log "🎉 Backup em nuvem concluído com sucesso!"
EOF
    
    chmod +x $PRODUCTION_DIR/scripts/backup-s3.sh
    chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup-s3.sh
    
    log "✅ Backup para AWS S3 configurado"
fi

# 2. Configurar Google Cloud Storage
if [ "$PROVIDER" = "gcp" ]; then
    log "Configurando backup para Google Cloud Storage..."
    
    # Instalar Google Cloud CLI
    if ! command -v gsutil &> /dev/null; then
        log "Instalando Google Cloud CLI..."
        curl https://sdk.cloud.google.com | bash
        source ~/.bashrc
    fi
    
    # Configurar autenticação
    log "Configurando autenticação GCP..."
    gcloud auth login
    gcloud config set project $BUCKET_NAME
    
    # Criar bucket
    log "Criando bucket GCS: $BUCKET_NAME"
    gsutil mb gs://$BUCKET_NAME
    
    # Configurar lifecycle
    cat > /tmp/lifecycle.json << 'EOF'
{
    "rule": [
        {
            "action": {
                "type": "SetStorageClass",
                "storageClass": "NEARLINE"
            },
            "condition": {
                "age": 30
            }
        },
        {
            "action": {
                "type": "SetStorageClass",
                "storageClass": "COLDLINE"
            },
            "condition": {
                "age": 90
            }
        },
        {
            "action": {
                "type": "SetStorageClass",
                "storageClass": "ARCHIVE"
            },
            "condition": {
                "age": 365
            }
        }
    ]
}
EOF
    
    gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME
    rm /tmp/lifecycle.json
    
    # Configurar script de backup
    cat > $PRODUCTION_DIR/scripts/backup-gcs.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup para Google Cloud Storage
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-gcs.log"
GCS_BUCKET="sispat-backups"

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
log "Executando backup completo..."
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
    -s NEARLINE \
    -m "backup-date:$(date -Iseconds)" \
    -m "system:sispat" \
    -m "version:$(cd $PRODUCTION_DIR/app && git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"

if [ $? -eq 0 ]; then
    log "✅ Backup enviado para GCS: gs://$GCS_BUCKET/backups/$BACKUP_NAME"
    
    # Verificar integridade
    log "Verificando integridade do backup..."
    gsutil stat "gs://$GCS_BUCKET/backups/$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        log "✅ Backup verificado com sucesso"
    else
        log "❌ ERRO: Falha na verificação do backup"
    fi
else
    log "❌ ERRO: Falha no upload para GCS"
    exit 1
fi

# Limpar backups locais antigos (manter apenas 7 dias)
find $BACKUP_DIR/full -name "sispat_full_*.tar.gz" -mtime +7 -delete

log "🎉 Backup em nuvem concluído com sucesso!"
EOF
    
    chmod +x $PRODUCTION_DIR/scripts/backup-gcs.sh
    chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup-gcs.sh
    
    log "✅ Backup para Google Cloud Storage configurado"
fi

# 3. Configurar Azure Blob Storage
if [ "$PROVIDER" = "azure" ]; then
    log "Configurando backup para Azure Blob Storage..."
    
    # Instalar Azure CLI
    if ! command -v az &> /dev/null; then
        log "Instalando Azure CLI..."
        curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
    fi
    
    # Configurar autenticação
    log "Configurando autenticação Azure..."
    az login
    
    # Criar storage account
    log "Criando storage account..."
    az storage account create \
        --name $BUCKET_NAME \
        --resource-group sispat-rg \
        --location $REGION \
        --sku Standard_LRS
    
    # Criar container
    log "Criando container..."
    az storage container create \
        --name backups \
        --account-name $BUCKET_NAME
    
    # Configurar script de backup
    cat > $PRODUCTION_DIR/scripts/backup-azure.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup para Azure Blob Storage
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
LOG_FILE="/var/log/sispat/application/backup-azure.log"
AZURE_STORAGE_ACCOUNT="sispat-backups"
AZURE_CONTAINER="backups"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "☁️ Iniciando backup para Azure Blob Storage..."

# Verificar se Azure CLI está configurado
if ! az account show > /dev/null 2>&1; then
    log "❌ ERRO: Azure CLI não está configurado"
    exit 1
fi

# Fazer backup completo
log "Executando backup completo..."
$PRODUCTION_DIR/scripts/backup-full.sh

# Encontrar backup mais recente
LATEST_BACKUP=$(ls -t $BACKUP_DIR/full/sispat_full_*.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log "❌ ERRO: Nenhum backup encontrado"
    exit 1
fi

# Upload para Azure
BACKUP_NAME=$(basename $LATEST_BACKUP)
log "Enviando $BACKUP_NAME para Azure..."

az storage blob upload \
    --file "$LATEST_BACKUP" \
    --container-name $AZURE_CONTAINER \
    --name $BACKUP_NAME \
    --account-name $AZURE_STORAGE_ACCOUNT \
    --metadata backup-date=$(date -Iseconds) system=sispat version=$(cd $PRODUCTION_DIR/app && git rev-parse --short HEAD 2>/dev/null || echo 'N/A')

if [ $? -eq 0 ]; then
    log "✅ Backup enviado para Azure: $AZURE_CONTAINER/$BACKUP_NAME"
    
    # Verificar integridade
    log "Verificando integridade do backup..."
    az storage blob show \
        --container-name $AZURE_CONTAINER \
        --name $BACKUP_NAME \
        --account-name $AZURE_STORAGE_ACCOUNT
    
    if [ $? -eq 0 ]; then
        log "✅ Backup verificado com sucesso"
    else
        log "❌ ERRO: Falha na verificação do backup"
    fi
else
    log "❌ ERRO: Falha no upload para Azure"
    exit 1
fi

# Limpar backups locais antigos (manter apenas 7 dias)
find $BACKUP_DIR/full -name "sispat_full_*.tar.gz" -mtime +7 -delete

log "🎉 Backup em nuvem concluído com sucesso!"
EOF
    
    chmod +x $PRODUCTION_DIR/scripts/backup-azure.sh
    chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/backup-azure.sh
    
    log "✅ Backup para Azure Blob Storage configurado"
fi

# 4. Configurar agendamento
log "Configurando agendamento de backup em nuvem..."

# Backup semanal em nuvem
echo "0 5 * * 0 $SERVICE_USER $PRODUCTION_DIR/scripts/backup-$PROVIDER.sh" >> /etc/crontab

log "✅ Agendamento configurado"

# 5. Configurar monitoramento
log "Configurando monitoramento de backup em nuvem..."

cat > $PRODUCTION_DIR/scripts/monitor-cloud-backup.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Monitoramento de Backup em Nuvem
LOG_FILE="/var/log/sispat/application/monitor-cloud-backup.log"
ALERT_EMAIL="admin@sispat.com"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT Cloud Backup Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

# Verificar backup em nuvem (última semana)
log "Verificando backup em nuvem..."

# Verificar se há backup recente em nuvem
CLOUD_BACKUP=$(find /opt/sispat/backups/full -name "*.tar.gz" -mtime -7 | wc -l)

if [ $CLOUD_BACKUP -eq 0 ]; then
    send_alert "Nenhum backup em nuvem na última semana!"
fi

# Verificar logs de backup em nuvem
if [ -f "/var/log/sispat/application/backup-$PROVIDER.log" ]; then
    LAST_BACKUP=$(tail -1 "/var/log/sispat/application/backup-$PROVIDER.log" | grep -c "sucesso")
    
    if [ $LAST_BACKUP -eq 0 ]; then
        send_alert "Último backup em nuvem falhou!"
    fi
fi

log "Monitoramento de backup em nuvem executado com sucesso"
EOF

chmod +x $PRODUCTION_DIR/scripts/monitor-cloud-backup.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/monitor-cloud-backup.sh

# Agendar monitoramento
echo "0 7 * * 0 $SERVICE_USER $PRODUCTION_DIR/scripts/monitor-cloud-backup.sh" >> /etc/crontab

log "✅ Monitoramento configurado"

# 6. Exibir resumo final
log "🎉 Backup em nuvem configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Provedor: $PROVIDER"
log "   • Bucket/Container: $BUCKET_NAME"
log "   • Região: $REGION"
log "   • Agendamento: Semanal aos domingos às 5h"
log "   • Monitoramento: Semanal aos domingos às 7h"
log ""
log "🔧 Scripts disponíveis:"
log "   • Backup: $PRODUCTION_DIR/scripts/backup-$PROVIDER.sh"
log "   • Monitoramento: $PRODUCTION_DIR/scripts/monitor-cloud-backup.sh"
log ""
log "⚠️  Próximos passos:"
log "   1. Configurar credenciais de autenticação"
log "   2. Testar backup manual"
log "   3. Verificar agendamento"
log "   4. Monitorar logs"
log "   5. Configurar alertas"
log ""
log "✅ Backup em nuvem pronto para uso!"
