#!/bin/bash

# ===========================================
# SISPAT - Script de Configuração de Produção
# ===========================================
# Data: 09/09/2025
# Versão: 0.0.193
# Descrição: Configuração automática do ambiente de produção

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root"
fi

log "🚀 Iniciando configuração de produção do SISPAT..."

# ===========================================
# 1. VERIFICAÇÕES INICIAIS
# ===========================================
log "📋 Verificando pré-requisitos..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado. Instale Node.js 18+ primeiro."
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js versão 18+ é necessária. Versão atual: $(node --version)"
fi

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    log "📦 Instalando pnpm..."
    npm install -g pnpm
fi

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    error "PostgreSQL não está instalado. Instale PostgreSQL 13+ primeiro."
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    log "📦 Instalando PM2..."
    npm install -g pm2
fi

log "✅ Pré-requisitos verificados com sucesso!"

# ===========================================
# 2. CONFIGURAÇÃO DO SISTEMA
# ===========================================
log "🔧 Configurando sistema..."

# Criar diretórios necessários
log "📁 Criando diretórios..."
sudo mkdir -p /var/www/sispat
sudo mkdir -p /var/log/sispat
sudo mkdir -p /var/backups/sispat
sudo mkdir -p /etc/ssl/certs
sudo mkdir -p /etc/ssl/private

# Definir permissões
sudo chown -R $USER:$USER /var/www/sispat
sudo chown -R $USER:$USER /var/log/sispat
sudo chown -R $USER:$USER /var/backups/sispat

log "✅ Diretórios criados com sucesso!"

# ===========================================
# 3. CONFIGURAÇÃO DO BANCO DE DADOS
# ===========================================
log "🗄️ Configurando banco de dados..."

# Ler configurações do .env
if [ ! -f ".env.production" ]; then
    error "Arquivo .env.production não encontrado!"
fi

source .env.production

# Criar usuário e banco de dados
log "👤 Criando usuário do banco de dados..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || warn "Usuário $DB_USER já existe"

log "🗄️ Criando banco de dados..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || warn "Banco $DB_NAME já existe"

log "🔑 Concedendo permissões..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"

log "✅ Banco de dados configurado com sucesso!"

# ===========================================
# 4. INSTALAÇÃO DE DEPENDÊNCIAS
# ===========================================
log "📦 Instalando dependências..."

# Instalar dependências do projeto
pnpm install --production

log "✅ Dependências instaladas com sucesso!"

# ===========================================
# 5. BUILD DE PRODUÇÃO
# ===========================================
log "🏗️ Fazendo build de produção..."

# Build do frontend
pnpm run build

log "✅ Build de produção concluído!"

# ===========================================
# 6. CONFIGURAÇÃO DO NGINX
# ===========================================
log "🌐 Configurando Nginx..."

# Criar configuração do Nginx
sudo tee /etc/nginx/sites-available/sispat > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN $SUBDOMAIN.$DOMAIN;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN $SUBDOMAIN.$DOMAIN;
    
    # Configurações SSL
    ssl_certificate $SSL_CERT_PATH;
    ssl_certificate_key $SSL_KEY_PATH;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Configurações de upload
    client_max_body_size 10M;
    
    # Proxy para o backend
    location /api {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Servir arquivos estáticos
    location / {
        root /var/www/sispat/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Logs
    access_log /var/log/nginx/sispat_access.log;
    error_log /var/log/nginx/sispat_error.log;
}
EOF

# Habilitar site
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

log "✅ Nginx configurado com sucesso!"

# ===========================================
# 7. CONFIGURAÇÃO DO PM2
# ===========================================
log "⚙️ Configurando PM2..."

# Parar processos existentes
pm2 delete sispat 2>/dev/null || true

# Iniciar aplicação
pm2 start ecosystem.config.cjs --env production

# Salvar configuração
pm2 save

# Configurar startup
pm2 startup

log "✅ PM2 configurado com sucesso!"

# ===========================================
# 8. CONFIGURAÇÃO DO FIREWALL
# ===========================================
log "🔥 Configurando firewall..."

# Configurar UFW
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3001

log "✅ Firewall configurado com sucesso!"

# ===========================================
# 9. CONFIGURAÇÃO DE BACKUP
# ===========================================
log "💾 Configurando backup automático..."

# Criar script de backup
sudo tee /usr/local/bin/sispat-backup > /dev/null <<EOF
#!/bin/bash
BACKUP_DIR="/var/backups/sispat"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="sispat_backup_\$DATE.sql"

# Criar backup do banco
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > \$BACKUP_DIR/\$BACKUP_FILE

# Comprimir backup
gzip \$BACKUP_DIR/\$BACKUP_FILE

# Remover backups antigos (manter últimos 30 dias)
find \$BACKUP_DIR -name "sispat_backup_*.sql.gz" -mtime +30 -delete

echo "Backup criado: \$BACKUP_FILE.gz"
EOF

sudo chmod +x /usr/local/bin/sispat-backup

# Configurar cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/sispat-backup") | crontab -

log "✅ Backup automático configurado!"

# ===========================================
# 10. CONFIGURAÇÃO DE MONITORAMENTO
# ===========================================
log "📊 Configurando monitoramento..."

# Criar script de health check
sudo tee /usr/local/bin/sispat-health > /dev/null <<EOF
#!/bin/bash
# Health check do SISPAT

# Verificar se a aplicação está rodando
if ! pm2 list | grep -q "sispat.*online"; then
    echo "❌ Aplicação não está rodando"
    exit 1
fi

# Verificar se o banco está acessível
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
    echo "❌ Banco de dados não está acessível"
    exit 1
fi

# Verificar se a API está respondendo
if ! curl -f -s http://localhost:$PORT/api/health > /dev/null; then
    echo "❌ API não está respondendo"
    exit 1
fi

echo "✅ Sistema funcionando corretamente"
exit 0
EOF

sudo chmod +x /usr/local/bin/sispat-health

log "✅ Monitoramento configurado!"

# ===========================================
# 11. CONFIGURAÇÃO DE LOGS
# ===========================================
log "📝 Configurando logs..."

# Configurar logrotate
sudo tee /etc/logrotate.d/sispat > /dev/null <<EOF
/var/log/sispat/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

log "✅ Logs configurados!"

# ===========================================
# 12. FINALIZAÇÃO
# ===========================================
log "🎉 Configuração de produção concluída!"

echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  SISPAT - CONFIGURAÇÃO CONCLUÍDA${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "${GREEN}✅ Sistema configurado com sucesso!${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo -e "1. Configure o SSL/TLS com Let's Encrypt:"
echo -e "   ${BLUE}sudo certbot --nginx -d $DOMAIN${NC}"
echo ""
echo -e "2. Reinicie os serviços:"
echo -e "   ${BLUE}sudo systemctl restart nginx${NC}"
echo -e "   ${BLUE}pm2 restart sispat${NC}"
echo ""
echo -e "3. Verifique o status:"
echo -e "   ${BLUE}pm2 status${NC}"
echo -e "   ${BLUE}sudo systemctl status nginx${NC}"
echo ""
echo -e "4. Acesse o sistema:"
echo -e "   ${BLUE}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo -e "- Altere as senhas padrão no arquivo .env.production"
echo -e "- Configure o SSL/TLS antes de usar em produção"
echo -e "- Monitore os logs regularmente"
echo ""
echo -e "${GREEN}🚀 SISPAT está pronto para produção!${NC}"