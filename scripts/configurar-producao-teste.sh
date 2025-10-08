#!/bin/bash

# ===========================================
# SISPAT 2.0 - CONFIGURAÇÃO RÁPIDA PRODUÇÃO
# ===========================================
# Este script mantém as senhas de desenvolvimento
# para facilitar testes em produção
# ===========================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log "=== SISPAT 2.0 - CONFIGURAÇÃO RÁPIDA PARA PRODUÇÃO DE TESTE ==="

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do SISPAT"
fi

# Solicitar domínio
echo ""
read -p "Digite seu domínio (ex: sispat.prefeitura.com.br): " DOMAIN
if [ -z "$DOMAIN" ]; then
    error "Domínio é obrigatório"
fi

# Solicitar senha do banco (opcional)
echo ""
read -p "Digite a senha do PostgreSQL [padrão: sispat_password_123]: " DB_PASSWORD
DB_PASSWORD=${DB_PASSWORD:-sispat_password_123}

# Solicitar JWT secret (opcional)
echo ""
read -p "Gerar JWT secret automaticamente? [S/n]: " GENERATE_JWT
GENERATE_JWT=${GENERATE_JWT:-S}

if [[ "$GENERATE_JWT" =~ ^[Ss]$ ]]; then
    JWT_SECRET=$(openssl rand -hex 64)
    log "JWT Secret gerado automaticamente"
else
    read -p "Digite o JWT secret: " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET="sispat_jwt_secret_key_for_production_testing_2025"
        warning "Usando JWT secret padrão (não recomendado para produção real)"
    fi
fi

log "Configurando ambiente de produção..."

# =======================
# CONFIGURAR FRONTEND
# =======================
log "Configurando frontend..."

cat > .env << EOF
# ===========================================
# SISPAT 2.0 - PRODUÇÃO (TESTE)
# ===========================================

# Frontend Configuration
VITE_API_URL=https://api.${DOMAIN}
VITE_USE_BACKEND=true
VITE_APP_NAME=SISPAT 2.0
VITE_APP_VERSION=2.0.0
VITE_APP_ENV=production

# Build Configuration
VITE_BUILD_OPTIMIZE=true
VITE_BUILD_COMPRESS=true
VITE_BUILD_ANALYZE=false

# Security
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_LOGGING=false
EOF

success "Frontend configurado: https://${DOMAIN}"

# =======================
# CONFIGURAR BACKEND
# =======================
log "Configurando backend..."

cat > backend/.env << EOF
# ===========================================
# SISPAT 2.0 BACKEND - PRODUÇÃO (TESTE)
# ===========================================

# Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://sispat_user:${DB_PASSWORD}@localhost:5432/sispat_prod"
DATABASE_SSL=false
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# JWT Configuration
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# CORS Configuration
FRONTEND_URL="https://${DOMAIN}"
CORS_ORIGIN="https://${DOMAIN}"
CORS_CREDENTIALS=true

# Security Configuration
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
HELMET_ENABLED=true

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif,application/pdf"
UPLOAD_PATH="./uploads"

# Logging Configuration
LOG_LEVEL=info
LOG_FILE="./logs/app.log"
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoring
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL=30000

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_PATH="./backups"

# ===========================================
# CREDENCIAIS PADRÃO (DESENVOLVIMENTO/TESTE)
# ===========================================
# ATENÇÃO: Alterar para produção real!
# 
# Superuser: junielsonfarias@gmail.com / Tiko6273@
# Admin:     admin@ssbv.com / password123
# Outros:    ver CREDENCIAIS_PRODUCAO.md
EOF

success "Backend configurado: https://api.${DOMAIN}"

# =======================
# CONFIGURAR NGINX
# =======================
log "Configurando Nginx..."

sudo cp nginx/conf.d/sispat.conf /etc/nginx/sites-available/sispat

# Substituir domínio na configuração
sudo sed -i "s/sispat.seudominio.com/${DOMAIN}/g" /etc/nginx/sites-available/sispat
sudo sed -i "s/api.sispat.seudominio.com/api.${DOMAIN}/g" /etc/nginx/sites-available/sispat

# Ativar site
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
if sudo nginx -t; then
    success "Nginx configurado com sucesso"
else
    error "Erro na configuração do Nginx"
fi

# =======================
# CRIAR BANCO DE DADOS
# =======================
log "Configurando PostgreSQL..."

sudo -u postgres psql << EOF
-- Criar usuário se não existir
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'sispat_user') THEN
    CREATE USER sispat_user WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

-- Criar banco se não existir
SELECT 'CREATE DATABASE sispat_prod OWNER sispat_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sispat_prod')\gexec

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE sispat_prod TO sispat_user;
EOF

success "Banco de dados configurado"

# =======================
# RESUMO
# =======================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║          CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!              ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 RESUMO DA CONFIGURAÇÃO:${NC}"
echo ""
echo -e "  🌐 Domínio:         ${GREEN}${DOMAIN}${NC}"
echo -e "  🌐 API:             ${GREEN}api.${DOMAIN}${NC}"
echo -e "  🗃️  Banco:           ${GREEN}sispat_prod${NC}"
echo -e "  🔑 Usuário DB:      ${GREEN}sispat_user${NC}"
echo -e "  🔐 Senha DB:        ${YELLOW}${DB_PASSWORD}${NC}"
echo ""
echo -e "${BLUE}👥 CREDENCIAIS DE ACESSO:${NC}"
echo ""
echo -e "  📧 Superuser:"
echo -e "     Email: ${GREEN}junielsonfarias@gmail.com${NC}"
echo -e "     Senha: ${YELLOW}Tiko6273@${NC}"
echo ""
echo -e "  📧 Admin (Recomendado):"
echo -e "     Email: ${GREEN}admin@ssbv.com${NC}"
echo -e "     Senha: ${YELLOW}password123${NC}"
echo ""
echo -e "${BLUE}🚀 PRÓXIMOS PASSOS:${NC}"
echo ""
echo "  1. Build do projeto:"
echo -e "     ${YELLOW}pnpm run build:prod${NC}"
echo -e "     ${YELLOW}cd backend && npm run build${NC}"
echo ""
echo "  2. Executar migrações:"
echo -e "     ${YELLOW}cd backend && npm run prisma:migrate:prod${NC}"
echo ""
echo "  3. Popular banco (criar usuários):"
echo -e "     ${YELLOW}npm run prisma:seed${NC}"
echo ""
echo "  4. Iniciar backend:"
echo -e "     ${YELLOW}pm2 start dist/index.js --name sispat-backend${NC}"
echo -e "     ${YELLOW}pm2 save && pm2 startup${NC}"
echo ""
echo "  5. Reiniciar Nginx:"
echo -e "     ${YELLOW}sudo systemctl restart nginx${NC}"
echo ""
echo "  6. Configurar SSL:"
echo -e "     ${YELLOW}sudo certbot --nginx -d ${DOMAIN} -d api.${DOMAIN}${NC}"
echo ""
echo "  7. Acessar sistema:"
echo -e "     ${GREEN}https://${DOMAIN}/login${NC}"
echo ""
echo -e "${YELLOW}⚠️  ATENÇÃO: Este setup usa senhas de desenvolvimento!${NC}"
echo -e "${YELLOW}   Para produção real, altere TODAS as senhas!${NC}"
echo ""
success "Configuração salva!"
echo ""
