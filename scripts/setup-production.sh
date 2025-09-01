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
else
    error "Sistema operacional não suportado: $OSTYPE"
fi

# 2. Verificar dependências do sistema
log "🔍 Verificando dependências do sistema..."

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log "✅ Node.js encontrado: $NODE_VERSION"
else
    error "Node.js não encontrado. Instale Node.js 18+ primeiro."
fi

# Verificar pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    success "✅ pnpm encontrado: $PNPM_VERSION"
else
    error "pnpm não encontrado. Execute: npm install -g pnpm@8"
fi

# Verificar PM2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    success "✅ PM2 encontrado: $PM2_VERSION"
else
    error "PM2 não encontrado. Execute: npm install -g pm2"
fi

# 3. Configurar variáveis de ambiente
log "⚙️ Configurando variáveis de ambiente..."

# Verificar se .env.production existe
if [ ! -f ".env.production" ]; then
    log "📝 Criando arquivo .env.production..."
    
    # Criar arquivo .env.production com configurações padrão
    cat > .env.production << 'EOF'
# =======================================
# VARIÁVEIS DE AMBIENTE - PRODUÇÃO
# SISPAT - Sistema de Patrimônio
# =======================================

# ===== APLICAÇÃO =====
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
VERSION=1.0.0

# ===== BANCO DE DADOS =====
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_production
DB_USER=sispat_user
DB_PASSWORD=CHANGE_ME_STRONG_DB_PASSWORD
DATABASE_URL=postgresql://sispat_user:CHANGE_ME_STRONG_DB_PASSWORD@localhost:5432/sispat_production

# ===== REDIS =====
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=CHANGE_ME_STRONG_REDIS_PASSWORD
REDIS_HOST=localhost
REDIS_PORT=6379

# ===== AUTENTICAÇÃO =====
JWT_SECRET=CHANGE_ME_STRONG_JWT_SECRET_32_CHARS_MIN
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ===== CORS =====
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# ===== LOGS =====
LOG_LEVEL=info
LOG_FILE=logs/app.log

# ===== MONITORAMENTO =====
ENABLE_METRICS=true
METRICS_PORT=9090

# ===== SEGURANÇA =====
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
ENABLE_HELMET=true
ENABLE_CORS=true
EOF
    
    success "Arquivo .env.production criado"
    
    warning "⚠️ IMPORTANTE: Edite o arquivo .env.production com suas configurações reais!"
    warning "⚠️ Especialmente: DB_PASSWORD, REDIS_PASSWORD, JWT_SECRET"
    
    # Perguntar se quer editar agora
    read -p "Deseja editar o arquivo .env.production agora? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v nano &> /dev/null; then
            nano .env.production
        elif command -v vim &> /dev/null; then
            vim .env.production
        else
            log "Editor não encontrado. Edite manualmente o arquivo .env.production"
        fi
    fi
else
    success "Arquivo .env.production já existe"
fi

# 4. Configurar credenciais de segurança
log "🔐 Configurando credenciais de segurança..."

# Gerar JWT_SECRET se não existir
if ! grep -q "CHANGE_ME_STRONG_JWT_SECRET" .env.production; then
    success "JWT_SECRET já configurado"
else
    # Gerar JWT_SECRET aleatório
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/CHANGE_ME_STRONG_JWT_SECRET_32_CHARS_MIN/$JWT_SECRET/g" .env.production
    success "JWT_SECRET gerado automaticamente"
fi

# 5. Verificar e configurar banco de dados
log "🗄️ Verificando configuração do banco de dados..."

# Verificar se PostgreSQL está rodando
if systemctl is-active --quiet postgresql; then
    success "PostgreSQL está rodando"
else
    warning "⚠️ PostgreSQL não está rodando. Inicie o serviço:"
    echo "sudo systemctl start postgresql"
    echo "sudo systemctl enable postgresql"
fi

# 6. Verificar e configurar Redis
log "🔴 Verificando configuração do Redis..."

# Verificar se Redis está rodando
if systemctl is-active --quiet redis-server; then
    success "Redis está rodando"
else
    warning "⚠️ Redis não está rodando. Inicie o serviço:"
    echo "sudo systemctl start redis-server"
    echo "sudo systemctl enable redis-server"
fi

# 7. Configurar diretórios de logs
log "📝 Configurando diretórios de logs..."
mkdir -p logs
mkdir -p uploads
chmod 755 logs uploads
success "Diretórios de logs criados"

# 8. Configurar PM2
log "⚙️ Configurando PM2..."

# Verificar se ecosystem.config.js existe
if [ -f "ecosystem.config.js" ]; then
    success "Arquivo de configuração PM2 encontrado"
else
    error "Arquivo ecosystem.config.js não encontrado"
fi

# 9. Configurar firewall básico
log "🔥 Configurando firewall básico..."

# Verificar se UFW está disponível
if command -v ufw &> /dev/null; then
    # Verificar status do UFW
    UFW_STATUS=$(ufw status | grep "Status")
    if [[ $UFW_STATUS == *"inactive"* ]]; then
        warning "⚠️ UFW está inativo. Configure as regras:"
        echo "sudo ufw allow ssh"
        echo "sudo ufw allow 80"
        echo "sudo ufw allow 443"
        echo "sudo ufw allow 3001"
        echo "sudo ufw enable"
    else
        success "UFW está ativo"
    fi
else
    warning "⚠️ UFW não encontrado. Configure o firewall manualmente."
fi

# 10. Configurar backup automático
log "💾 Configurando backup automático..."

# Criar diretório de backup
mkdir -p backups
chmod 755 backups

# Criar script de backup básico
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup do banco de dados
if command -v pg_dump &> /dev/null; then
    pg_dump -h localhost -U sispat_user -d sispat_production > "$BACKUP_DIR/db_backup_$DATE.sql"
    echo "Backup do banco criado: db_backup_$DATE.sql"
fi

# Backup dos arquivos
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" --exclude=node_modules --exclude=backups .
echo "Backup da aplicação criado: app_backup_$DATE.tar.gz"

# Manter apenas últimos 7 backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup concluído: $DATE"
EOF

chmod +x scripts/backup.sh
success "Script de backup criado"

# 11. Resolver problema do pnpm-lock.yaml
log "🔧 Resolvendo problema do pnpm-lock.yaml..."

# Verificar se há problema com o lockfile
if [ -f "pnpm-lock.yaml" ]; then
    log "📦 Tentando resolver incompatibilidade do lockfile..."
    
    # Fazer backup do lockfile atual
    cp pnpm-lock.yaml pnpm-lock.yaml.backup
    
    # Tentar instalar com --force
    if pnpm install --force; then
        success "Dependências instaladas com sucesso"
        rm pnpm-lock.yaml.backup
    else
        warning "⚠️ Falha na instalação. Restaurando lockfile original..."
        mv pnpm-lock.yaml.backup pnpm-lock.yaml
        
        # Tentar com npm como fallback
        log "🔄 Tentando com npm como fallback..."
        if npm install; then
            success "Dependências instaladas com npm"
        else
            error "Falha na instalação das dependências"
        fi
    fi
else
    warning "⚠️ pnpm-lock.yaml não encontrado"
fi

# 12. Configuração final
log "🎯 Configuração final..."

# Verificar se tudo está configurado
if [ -f ".env.production" ] && [ -f "ecosystem.config.js" ]; then
    success "✅ Configuração básica concluída!"
    
    echo ""
    echo "🚀 PRÓXIMOS PASSOS:"
    echo "1. Edite o arquivo .env.production com suas configurações reais"
    echo "2. Configure o banco de dados PostgreSQL"
    echo "3. Configure o Redis"
    echo "4. Execute: ./scripts/deploy-production-simple.sh"
    echo ""
    echo "📋 COMANDOS ÚTEIS:"
    echo "- Ver status: pm2 status"
    echo "- Ver logs: pm2 logs"
    echo "- Backup: ./scripts/backup.sh"
    echo ""
    
else
    error "❌ Configuração incompleta. Verifique os arquivos necessários."
fi

log "🎉 Script de configuração concluído!"
success "Ambiente de produção configurado com sucesso!"
