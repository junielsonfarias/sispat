#!/bin/bash

# SISPAT - Script de Configuração de Deploy com Docker
# Este script configura deploy com Docker para produção

set -e

echo "🚀 Configurando Deploy com Docker do SISPAT..."

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
DOCKER_REGISTRY=${1:-"localhost:5000"}
IMAGE_NAME="sispat"

# 1. Verificar se o Docker está instalado
log "Verificando instalação do Docker..."

if ! command -v docker &> /dev/null; then
    log "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $SERVICE_USER
    systemctl enable docker
    systemctl start docker
fi

log "✅ Docker está instalado"

# 2. Verificar se o Docker Compose está instalado
log "Verificando instalação do Docker Compose..."

if ! command -v docker-compose &> /dev/null; then
    log "Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

log "✅ Docker Compose está instalado"

# 3. Criar Dockerfile para produção
log "Criando Dockerfile para produção..."

cat > $PRODUCTION_DIR/Dockerfile << 'EOF'
# SISPAT - Dockerfile para Produção
FROM node:18-alpine AS builder

# Instalar dependências do sistema
RUN apk add --no-cache git

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Compilar frontend
RUN npm run build

# Estágio de produção
FROM node:18-alpine AS production

# Instalar dependências do sistema
RUN apk add --no-cache \
    postgresql-client \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S sispat -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar dependências do estágio anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# Copiar arquivos de configuração
COPY --from=builder /app/public ./public

# Definir permissões
RUN chown -R sispat:nodejs /app
USER sispat

# Expor portas
EXPOSE 3001 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Comando de inicialização
CMD ["npm", "start"]
EOF

log "✅ Dockerfile criado"

# 4. Criar docker-compose.yml para produção
log "Criando docker-compose.yml para produção..."

cat > $PRODUCTION_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Banco de dados PostgreSQL
  postgres:
    image: postgres:13-alpine
    container_name: sispat-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: sispat_production
      POSTGRES_USER: sispat_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    networks:
      - sispat-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sispat_user -d sispat_production"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis para cache
  redis:
    image: redis:7-alpine
    container_name: sispat-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - sispat-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Aplicação SISPAT
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sispat-app
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: sispat_production
      DB_USER: sispat_user
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3001
    ports:
      - "3001:3001"
      - "5173:5173"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - sispat-network
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx como reverse proxy
  nginx:
    image: nginx:alpine
    container_name: sispat-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - sispat-network

volumes:
  postgres_data:
  redis_data:

networks:
  sispat-network:
    driver: bridge
EOF

log "✅ docker-compose.yml criado"

# 5. Criar arquivo de ambiente para Docker
log "Criando arquivo de ambiente para Docker..."

cat > $PRODUCTION_DIR/.env.docker << 'EOF'
# SISPAT - Variáveis de Ambiente para Docker
NODE_ENV=production

# Banco de Dados
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_HOST=postgres
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user

# Redis
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=CHANGE_THIS_JWT_SECRET
JWT_EXPIRES_IN=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@sispat.com

# Upload
UPLOAD_MAX_SIZE=10MB
UPLOAD_PATH=/app/uploads

# Logs
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# Segurança
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
SESSION_SECRET=CHANGE_THIS_SESSION_SECRET

# Monitoramento
MONITORING_ENABLED=true
MONITORING_PORT=3002
METRICS_ENABLED=true

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
EOF

log "✅ Arquivo de ambiente para Docker criado"

# 6. Criar configuração do Nginx para Docker
log "Criando configuração do Nginx para Docker..."

mkdir -p $PRODUCTION_DIR/nginx

cat > $PRODUCTION_DIR/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream sispat_backend {
        server app:3001;
    }

    upstream sispat_frontend {
        server app:5173;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Configuration
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin";

        # Gzip Compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_types
            text/plain
            text/css
            text/xml
            text/javascript
            application/json
            application/javascript
            application/xml+rss
            application/atom+xml
            image/svg+xml;

        # Frontend
        location / {
            proxy_pass http://sispat_frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API Backend
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://sispat_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket
        location /socket.io/ {
            proxy_pass http://sispat_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

log "✅ Configuração do Nginx para Docker criada"

# 7. Criar script de deploy com Docker
log "Criando script de deploy com Docker..."

cat > $PRODUCTION_DIR/scripts/docker-deploy.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Deploy com Docker
set -e

PRODUCTION_DIR="/opt/sispat"
LOG_FILE="/var/log/sispat/application/docker-deploy.log"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🐳 Iniciando deploy com Docker do SISPAT..."

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    log "ERRO: Docker não está rodando"
    exit 1
fi

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down

# Remover imagens antigas
log "Removendo imagens antigas..."
docker image prune -f

# Construir novas imagens
log "Construindo novas imagens..."
docker-compose build --no-cache

# Iniciar containers
log "Iniciando containers..."
docker-compose up -d

# Aguardar containers inicializarem
log "Aguardando containers inicializarem..."
sleep 30

# Verificar se os containers estão rodando
if ! docker-compose ps | grep -q "Up"; then
    log "ERRO: Containers não estão rodando"
    docker-compose logs
    exit 1
fi

# Verificar saúde da aplicação
log "Verificando saúde da aplicação..."
if ! curl -f -s http://localhost:3001/api/health > /dev/null; then
    log "ERRO: API não está respondendo"
    docker-compose logs app
    exit 1
fi

# Verificar logs
log "Verificando logs..."
docker-compose logs --tail=50

log "✅ Deploy com Docker concluído com sucesso!"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/docker-deploy.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/docker-deploy.sh

log "✅ Script de deploy com Docker criado"

# 8. Criar script de backup para Docker
log "Criando script de backup para Docker..."

cat > $PRODUCTION_DIR/scripts/docker-backup.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Backup para Docker
set -e

PRODUCTION_DIR="/opt/sispat"
BACKUP_DIR="$PRODUCTION_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/sispat/application/docker-backup.log"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🐳 Iniciando backup com Docker do SISPAT..."

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do banco de dados
log "Fazendo backup do banco de dados..."
docker-compose exec -T postgres pg_dump -U sispat_user -d sispat_production > $BACKUP_DIR/database/sispat_$DATE.sql

# Comprimir backup
gzip $BACKUP_DIR/database/sispat_$DATE.sql
log "Backup do banco de dados concluído: sispat_$DATE.sql.gz"

# Backup dos volumes
log "Fazendo backup dos volumes..."
docker run --rm -v sispat_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_data_$DATE.tar.gz -C /data .
docker run --rm -v sispat_redis_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/redis_data_$DATE.tar.gz -C /data .

# Backup dos arquivos de upload
log "Fazendo backup dos arquivos de upload..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz $PRODUCTION_DIR/uploads/

# Limpar backups antigos (manter apenas 30 dias)
log "Limpando backups antigos..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

log "✅ Backup com Docker concluído com sucesso!"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/docker-backup.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/docker-backup.sh

log "✅ Script de backup para Docker criado"

# 9. Criar script de monitoramento para Docker
log "Criando script de monitoramento para Docker..."

cat > $PRODUCTION_DIR/scripts/docker-monitor.sh << 'EOF'
#!/bin/bash

# SISPAT - Script de Monitoramento para Docker
LOG_FILE="/var/log/sispat/application/docker-monitor.log"
ALERT_EMAIL="admin@sispat.com"

# Função para log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para enviar alerta
send_alert() {
    local message="$1"
    echo "$message" | mail -s "SISPAT Docker Alert" $ALERT_EMAIL
    log "ALERTA ENVIADO: $message"
}

# Verificar se os containers estão rodando
if ! docker-compose ps | grep -q "Up"; then
    send_alert "Alguns containers não estão rodando!"
    docker-compose ps
fi

# Verificar uso de recursos
MEMORY_USAGE=$(docker stats --no-stream --format "table {{.MemPerc}}" | tail -n +2 | sed 's/%//' | awk '{sum+=$1} END {print sum}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    send_alert "Uso de memória alto: ${MEMORY_USAGE}%"
fi

# Verificar uso de disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    send_alert "Uso de disco alto: ${DISK_USAGE}%"
fi

# Verificar saúde da aplicação
if ! curl -f -s http://localhost:3001/api/health > /dev/null; then
    send_alert "API não está respondendo!"
fi

log "Monitoramento Docker executado com sucesso"
EOF

# Tornar script executável
chmod +x $PRODUCTION_DIR/scripts/docker-monitor.sh
chown $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR/scripts/docker-monitor.sh

log "✅ Script de monitoramento para Docker criado"

# 10. Configurar permissões
log "Configurando permissões..."

# Definir permissões para o usuário sispat
chown -R $SERVICE_USER:$SERVICE_USER $PRODUCTION_DIR
chmod +x $PRODUCTION_DIR/scripts/*.sh

log "✅ Permissões configuradas"

# 11. Exibir resumo final
log "🎉 Deploy com Docker configurado com sucesso!"
log ""
log "📋 Resumo da configuração:"
log "   • Docker: Instalado e configurado"
log "   • Docker Compose: Instalado e configurado"
log "   • Imagens: Configuradas para produção"
log "   • Volumes: Configurados para persistência"
log "   • Rede: Configurada para comunicação"
log ""
log "🔧 Recursos configurados:"
log "   • PostgreSQL: Container com volume persistente"
log "   • Redis: Container para cache"
log "   • Aplicação: Container com build otimizado"
log "   • Nginx: Container como reverse proxy"
log "   • Health Checks: Configurados para todos os serviços"
log ""
log "📁 Scripts disponíveis:"
log "   • Deploy: $PRODUCTION_DIR/scripts/docker-deploy.sh"
log "   • Backup: $PRODUCTION_DIR/scripts/docker-backup.sh"
log "   • Monitor: $PRODUCTION_DIR/scripts/docker-monitor.sh"
log ""
log "⚠️  Próximos passos:"
log "   1. Configurar variáveis de ambiente em .env.docker"
log "   2. Executar deploy inicial: docker-compose up -d"
log "   3. Configurar SSL para Nginx"
log "   4. Testar todos os serviços"
log "   5. Configurar backup automático"
log ""
log "✅ Deploy com Docker pronto para uso!"
