#!/bin/bash

# ===================================================
# Script de Backup Automático - SISPAT 2.0
# ===================================================
# Este script realiza backup automático do banco de dados
# e dos arquivos de upload do sistema SISPAT.
#
# Uso: ./scripts/auto-backup.sh
# Agendar: crontab -e
#   0 2 * * * /path/to/sispat/scripts/auto-backup.sh >> /var/log/sispat-backup.log 2>&1
# ===================================================

# Configurações
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/sispat"
DB_NAME="sispat_db"
DB_USER="postgres"
UPLOADS_DIR="./backend/uploads"
RETENTION_DAYS=30

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

echo -e "${YELLOW}🔄 Iniciando backup - $TIMESTAMP${NC}"

# 1. Backup do Banco de Dados
echo -e "${YELLOW}📊 Fazendo backup do banco de dados...${NC}"
pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
    DB_SIZE=$(du -h "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" | cut -f1)
    echo -e "${GREEN}✅ Backup do banco concluído - Tamanho: $DB_SIZE${NC}"
else
    echo -e "${RED}❌ Erro no backup do banco${NC}"
    exit 1
fi

# 2. Backup dos Uploads
if [ -d "$UPLOADS_DIR" ]; then
    echo -e "${YELLOW}📁 Fazendo backup dos uploads...${NC}"
    tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" $UPLOADS_DIR

    if [ $? -eq 0 ]; then
        UPLOADS_SIZE=$(du -h "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" | cut -f1)
        echo -e "${GREEN}✅ Backup dos uploads concluído - Tamanho: $UPLOADS_SIZE${NC}"
    else
        echo -e "${RED}❌ Erro no backup dos uploads${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Diretório de uploads não encontrado, pulando...${NC}"
fi

# 3. Limpar backups antigos
echo -e "${YELLOW}🧹 Removendo backups com mais de $RETENTION_DAYS dias...${NC}"
DELETED_COUNT=$(find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS | wc -l)
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

if [ $DELETED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ Removidos $DELETED_COUNT backups antigos${NC}"
else
    echo -e "${GREEN}✅ Nenhum backup antigo para remover${NC}"
fi

# 4. Estatísticas finais
TOTAL_BACKUPS=$(find $BACKUP_DIR -name "*.gz" | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)

echo -e "${GREEN}✅ Backup concluído com sucesso - $TIMESTAMP${NC}"
echo -e "${GREEN}📊 Total de backups: $TOTAL_BACKUPS${NC}"
echo -e "${GREEN}💾 Espaço utilizado: $TOTAL_SIZE${NC}"

# 5. (Opcional) Enviar para cloud
# Descomente e configure se quiser backup em nuvem
# echo -e "${YELLOW}☁️  Enviando para cloud storage...${NC}"
# aws s3 cp "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" s3://meu-bucket/backups/
# aws s3 cp "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" s3://meu-bucket/backups/

# 6. (Opcional) Notificar via webhook
# curl -X POST https://seu-webhook.com/notify \
#   -H "Content-Type: application/json" \
#   -d "{\"message\": \"Backup SISPAT concluído\", \"timestamp\": \"$TIMESTAMP\"}"

exit 0

