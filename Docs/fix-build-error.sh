#!/bin/bash

# ===========================================
# 🔧 SISPAT 2.0 - CORREÇÃO DE ERRO DE BUILD
# ===========================================
# Use este script se o install.sh falhou
# durante a compilação do frontend ou backend
# ===========================================

set -e

# Cores para interface
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

INSTALL_DIR="/var/www/sispat"

# Funções de interface
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗ ERRO:${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║         🔧  CORREÇÃO DE ERRO DE BUILD - SISPAT 2.0  🔧            ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root. Use: sudo bash fix-build-error.sh"
fi

show_banner

echo -e "${CYAN}Este script vai tentar corrigir problemas de build do SISPAT 2.0${NC}"
echo ""
echo -e "${YELLOW}O que será feito:${NC}"
echo "  1. Limpar node_modules e cache"
echo "  2. Reinstalar dependências corretamente"
echo "  3. Verificar se Vite e TypeScript estão instalados"
echo "  4. Fazer build do frontend e backend"
echo ""
read -p "Pressione ENTER para continuar ou CTRL+C para cancelar..."

# Verificar se diretório existe
if [ ! -d "$INSTALL_DIR" ]; then
    error "Diretório $INSTALL_DIR não encontrado. Execute install.sh primeiro."
fi

# ========================================
# FRONTEND
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           CORRIGINDO FRONTEND                     ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

cd "$INSTALL_DIR"

log "[1/5] Limpando cache e node_modules do frontend..."
rm -rf node_modules package-lock.json
rm -rf ~/.npm
success "Limpo"

log "[2/5] Instalando dependências do frontend..."
npm install --legacy-peer-deps 2>&1 | grep -v "npm WARN" | tail -20
success "Dependências instaladas"

log "[3/5] Verificando se Vite foi instalado..."
if [ -f "node_modules/.bin/vite" ]; then
    success "Vite encontrado: $(node_modules/.bin/vite --version)"
else
    warning "Vite não encontrado! Tentando reinstalar com --force..."
    npm install vite --force
    
    if [ -f "node_modules/.bin/vite" ]; then
        success "Vite instalado com sucesso"
    else
        error "Não foi possível instalar Vite"
    fi
fi

log "[4/5] Compilando frontend..."
echo -e "${YELLOW}Aguarde, pode levar 5-10 minutos...${NC}"
npm run build 2>&1 | tail -20

log "[5/5] Verificando se build foi gerado..."
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
    local js_count=$(find dist/assets -name "*.js" 2>/dev/null | wc -l)
    success "Frontend compilado com sucesso! ($js_count arquivos JS)"
else
    error "Frontend não foi compilado corretamente"
fi

# ========================================
# BACKEND
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           CORRIGINDO BACKEND                      ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

cd "$INSTALL_DIR/backend"

log "[1/5] Limpando cache e node_modules do backend..."
rm -rf node_modules package-lock.json
success "Limpo"

log "[2/5] Instalando dependências do backend..."
npm install 2>&1 | grep -v "npm WARN" | tail -20
success "Dependências instaladas"

log "[3/5] Verificando se TypeScript foi instalado..."
if [ -f "node_modules/.bin/tsc" ]; then
    local ts_version=$(node_modules/.bin/tsc --version)
    success "TypeScript encontrado: $ts_version"
else
    warning "TypeScript não encontrado! Tentando reinstalar..."
    npm install typescript --save-dev
    
    if [ -f "node_modules/.bin/tsc" ]; then
        success "TypeScript instalado com sucesso"
    else
        error "Não foi possível instalar TypeScript"
    fi
fi

log "[4/5] Compilando backend..."
echo -e "${YELLOW}Aguarde, pode levar 2-3 minutos...${NC}"
npm run build 2>&1 | tail -20

log "[5/5] Verificando se build foi gerado..."
if [ -f "dist/index.js" ]; then
    local js_count=$(find dist -name "*.js" 2>/dev/null | wc -l)
    success "Backend compilado com sucesso! ($js_count arquivos JS)"
else
    error "Backend não foi compilado corretamente"
fi

# ========================================
# CONFIGURAÇÃO DO BANCO
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       CONFIGURANDO BANCO DE DADOS                 ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

cd /var/www/sispat/backend

log "Gerando Prisma Client..."
npx prisma generate 2>&1 | tail -5
success "Prisma Client gerado"

log "Executando migrations..."
npx prisma migrate deploy 2>&1 | tail -5
success "Migrations executadas"

log "Criando tabela ficha_templates e concedendo permissões..."
sudo -u postgres psql -d sispat_prod > /dev/null 2>&1 << 'SQLEOF'
CREATE TABLE IF NOT EXISTS "ficha_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "layout" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "municipality_id" TEXT NOT NULL,
    CONSTRAINT "ficha_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ficha_templates_municipality_id_idx" ON "ficha_templates"("municipality_id");
CREATE INDEX IF NOT EXISTS "ficha_templates_is_default_idx" ON "ficha_templates"("is_default");
CREATE INDEX IF NOT EXISTS "ficha_templates_type_idx" ON "ficha_templates"("type");
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ficha_templates_municipality_id_fkey') THEN
        ALTER TABLE "ficha_templates" ADD CONSTRAINT "ficha_templates_municipality_id_fkey" 
            FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
GRANT ALL PRIVILEGES ON SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sispat_user;
SQLEOF
success "Tabela criada e permissões concedidas"

log "Executando seed do banco..."
npm run prisma:seed 2>&1 | tail -10
success "Seed executado"

# ========================================
# INICIAR APLICAÇÃO
# ========================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       INICIANDO APLICAÇÃO                         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

log "Parando processos antigos..."
pm2 delete sispat-backend 2>/dev/null || true
success "Processos limpos"

log "Iniciando SISPAT Backend..."
pm2 start dist/index.js --name sispat-backend
pm2 save
success "Aplicação iniciada"

log "Configurando Nginx..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/sispat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
success "Nginx configurado"

# ========================================
# FINALIZAÇÃO
# ========================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       ✅ CORREÇÃO CONCLUÍDA COM SUCESSO!         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}✅ Verificações finais:${NC}"
echo ""
pm2 status
echo ""
curl -s http://localhost:3000/api/health | head -1
echo ""

echo -e "${GREEN}Pronto! Seu SISPAT 2.0 está funcionando!${NC}"
echo ""
echo -e "${CYAN}Acesse: ${WHITE}http://$(hostname -f)${NC}"
echo -e "${CYAN}Email: ${WHITE}admin@sistema.com${NC}"
echo -e "${CYAN}Senha: ${WHITE}(a senha que você configurou)${NC}"
echo ""

