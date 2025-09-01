#!/bin/bash

# =================================
# SCRIPT DE CONFIGURAÇÃO PARA PRODUÇÃO
# SISPAT - Sistema de Patrimônio
# =================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Função para sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Função para input do usuário
input() {
    echo -e "${BLUE}[INPUT]${NC} $1"
    read -r response
    echo "$response"
}

log "🔧 Configurando ambiente de produção para SISPAT..."

# 1. Verificar sistema operacional
log "📋 Verificando sistema operacional..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    success "Sistema Linux detectado"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    success "Sistema macOS detectado"
else
    warning "Sistema operacional não suportado: $OSTYPE"
fi

# 2. Verificar dependências
log "🔍 Verificando dependências do sistema..."

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log "✅ Node.js encontrado: $NODE_VERSION"
    
    # Verificar versão mínima
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        error "Node.js 18+ é necessário. Versão atual: $NODE_VERSION"
    fi
else
    error "Node.js não encontrado. Instale Node.js 18+ primeiro."
fi

# pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    success "✅ pnpm encontrado: $PNPM_VERSION"
else
    log "📦 Instalando pnpm..."
    npm install -g pnpm
    success "pnpm instalado"
fi

# PM2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    success "✅ PM2 encontrado: $PM2_VERSION"
else
    log "📦 Instalando PM2..."
    npm install -g pm2
    success "PM2 instalado"
fi

# 3. Configurar variáveis de ambiente
log "⚙️ Configurando variáveis de ambiente..."

# Verificar se arquivo de produção existe
if [ ! -f ".env.production" ]; then
    log "📝 Criando arquivo .env.production..."
    cp env.production.example .env.production
    success "Arquivo .env.production criado"
fi

# Solicitar configurações do usuário
log "🔐 Configurando credenciais de segurança..."

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "CHANGE_ME_STRONG_JWT_SECRET_32_CHARS_MIN")
sed -i.bak "s/CHANGE_ME_STRONG_JWT_SECRET_32_CHARS_MIN/$JWT_SECRET/g" .env.production

# Database Password
DB_PASSWORD=$(input "Digite a senha para o banco de dados PostgreSQL: ")
sed -i.bak "s/CHANGE_ME_STRONG_DB_PASSWORD/$DB_PASSWORD/g" .env.production

# Redis Password
REDIS_PASSWORD=$(openssl rand -base64 16 2>/dev/null || echo "CHANGE_ME_STRONG_REDIS_PASSWORD")
sed -i.bak "s/CHANGE_ME_STRONG_REDIS_PASSWORD/$REDIS_PASSWORD/g" .env.production

# CSRF Secret
CSRF_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "CHANGE_ME_STRONG_CSRF_SECRET")
sed -i.bak "s/CHANGE_ME_STRONG_CSRF_SECRET/$CSRF_SECRET/g" .env.production

# Encryption Key
ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || echo "CHANGE_ME_STRONG_ENCRYPTION_KEY")
sed -i.bak "s/CHANGE_ME_STRONG_ENCRYPTION_KEY/$ENCRYPTION_KEY/g" .env.production

# Domain
DOMAIN=$(input "Digite o domínio da aplicação (ex: sispat.exemplo.com): ")
sed -i.bak "s/seudominio.com/$DOMAIN/g" .env.production

# Email
EMAIL=$(input "Digite o email para alertas: ")
sed -i.bak "s/admin@seudominio.com/$EMAIL/g" .env.production

# Limpar arquivos de backup
rm -f .env.production.bak

success "Variáveis de ambiente configuradas"

# 4. Configurar banco de dados
log "🗄️ Configurando banco de dados..."

# Verificar se PostgreSQL está rodando
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        success "PostgreSQL está rodando"
    else
        warning "PostgreSQL não está rodando. Inicie o serviço primeiro."
    fi
else
    warning "PostgreSQL não encontrado. Instale PostgreSQL primeiro."
fi

# 5. Configurar Redis
log "🔴 Configurando Redis..."

# Verificar se Redis está rodando
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        success "Redis está rodando"
    else
        warning "Redis não está rodando. Inicie o serviço primeiro."
    fi
else
    warning "Redis não encontrado. Instale Redis primeiro."
fi

# 6. Criar diretórios necessários
log "📁 Criando diretórios necessários..."
mkdir -p logs uploads backups
success "Diretórios criados"

# 7. Configurar permissões
log "🔐 Configurando permissões..."
chmod 755 logs uploads backups
success "Permissões configuradas"

# 8. Instalar dependências
log "📦 Instalando dependências..."
pnpm install --prod --frozen-lockfile
success "Dependências instaladas"

# 9. Testar build
log "🔨 Testando build da aplicação..."
pnpm run build
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    success "Build testado com sucesso"
else
    error "Build falhou"
fi

# 10. Configurar PM2
log "⚙️ Configurando PM2..."
pm2 startup
success "PM2 configurado para inicialização automática"

# 11. Configurar firewall (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    log "🔥 Configurando firewall..."
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw allow 3001/tcp  # Backend
        ufw allow 8080/tcp  # Frontend
        success "Firewall configurado"
    else
        warning "UFW não encontrado. Configure o firewall manualmente."
    fi
fi

# 12. Configurar SSL (opcional)
log "🔒 Configuração SSL..."
SSL_CHOICE=$(input "Deseja configurar SSL com Let's Encrypt? (s/n): ")
if [[ "$SSL_CHOICE" =~ ^[Ss]$ ]]; then
    if command -v certbot &> /dev/null; then
        success "Certbot encontrado. Configure SSL com: certbot --nginx -d $DOMAIN"
    else
        warning "Certbot não encontrado. Instale com: sudo apt install certbot python3-certbot-nginx"
    fi
fi

# 13. Configurar backup automático
log "💾 Configurando backup automático..."
BACKUP_CHOICE=$(input "Deseja configurar backup automático? (s/n): ")
if [[ "$BACKUP_CHOICE" =~ ^[Ss]$ ]]; then
    # Criar script de backup
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash
# Script de backup automático
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup do banco
pg_dump -h localhost -U sispat_user sispat_production > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" uploads/

# Limpar backups antigos (mais de 30 dias)
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup concluído: $TIMESTAMP"
EOF
    
    chmod +x scripts/backup.sh
    
    # Adicionar ao crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./scripts/backup.sh") | crontab -
    success "Backup automático configurado"
fi

# 14. Configurar monitoramento
log "📊 Configurando monitoramento..."
MONITORING_CHOICE=$(input "Deseja configurar monitoramento com Prometheus/Grafana? (s/n): ")
if [[ "$MONITORING_CHOICE" =~ ^[Ss]$ ]]; then
    success "Use docker-compose.production.yml para iniciar monitoramento"
fi

# 15. Finalização
log "🎉 Configuração de produção concluída!"
log ""
log "📋 RESUMO DA CONFIGURAÇÃO:"
log "   ✅ Variáveis de ambiente configuradas"
log "   ✅ Dependências instaladas"
log "   ✅ Build testado"
log "   ✅ PM2 configurado"
log "   ✅ Diretórios criados"
log "   ✅ Firewall configurado (Linux)"
log ""
log "🚀 PRÓXIMOS PASSOS:"
log "   1. Configure o banco de dados PostgreSQL"
log "   2. Configure o Redis"
log "   3. Execute: ./scripts/deploy-production.sh"
log "   4. Configure SSL se necessário"
log "   5. Configure monitoramento se necessário"
log ""
log "📁 Arquivos de configuração:"
log "   - .env.production (variáveis de ambiente)"
log "   - ecosystem.config.cjs (configuração PM2)"
log "   - docker-compose.production.yml (Docker)"
log ""
log "🔗 URLs de acesso:"
log "   - Frontend: http://localhost:8080"
log "   - Backend: http://localhost:3001"
log "   - Health Check: http://localhost:3001/api/health"

success "Configuração de produção concluída com sucesso!"
