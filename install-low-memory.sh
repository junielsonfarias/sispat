#!/bin/bash

# ============================================
# SISPAT 2.0 - INSTALAÇÃO OTIMIZADA
# ============================================
# Para servidores com 2GB RAM ou menos
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "============================================="
echo "  SISPAT 2.0 - INSTALAÇÃO OTIMIZADA"
echo "  Para servidores com pouca memória"
echo "============================================="
echo ""

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Este script deve ser executado como root${NC}"
    exit 1
fi

# ============================================
# 1. VERIFICAR RECURSOS
# ============================================

echo -e "${BLUE}[1/10]${NC} Verificando recursos do servidor..."

TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
TOTAL_SWAP=$(free -m | awk '/^Swap:/{print $2}')

echo "  RAM Total: ${TOTAL_RAM}MB"
echo "  Swap Total: ${TOTAL_SWAP}MB"

if [ "$TOTAL_RAM" -lt 2000 ]; then
    echo -e "${RED}⚠️  RAM insuficiente! Mínimo: 2GB${NC}"
    echo "Recomenda-se upgrade do servidor"
fi

# ============================================
# 2. CRIAR/AUMENTAR SWAP
# ============================================

echo -e "${BLUE}[2/10]${NC} Configurando swap..."

if [ "$TOTAL_SWAP" -lt 2000 ]; then
    echo "  Criando arquivo de swap de 2GB..."
    
    # Remover swap antigo se existir
    swapoff /swapfile 2>/dev/null || true
    rm -f /swapfile
    
    # Criar novo swap
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Tornar permanente
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    
    echo -e "${GREEN}✅ Swap de 2GB criado${NC}"
else
    echo -e "${GREEN}✅ Swap já configurado${NC}"
fi

# ============================================
# 3. LIMITAR MEMÓRIA DO NODE
# ============================================

echo -e "${BLUE}[3/10]${NC} Configurando limite de memória do Node..."

export NODE_OPTIONS="--max-old-space-size=1024"
echo "export NODE_OPTIONS=\"--max-old-space-size=1024\"" >> ~/.bashrc

echo -e "${GREEN}✅ Limite configurado: 1024MB${NC}"

# ============================================
# 4. INSTALAR DEPENDÊNCIAS BÁSICAS
# ============================================

echo -e "${BLUE}[4/10]${NC} Atualizando sistema e instalando dependências..."

apt update -qq
apt install -y curl wget git build-essential nginx postgresql-client jq bc > /dev/null 2>&1

echo -e "${GREEN}✅ Dependências básicas instaladas${NC}"

# ============================================
# 5. CLONAR REPOSITÓRIO (SE NECESSÁRIO)
# ============================================

APP_DIR="/var/www/sispat"

echo -e "${BLUE}[5/10]${NC} Verificando repositório..."

if [ ! -d "$APP_DIR" ]; then
    echo "  Clonando repositório..."
    git clone https://github.com/junielsonfarias/sispat.git "$APP_DIR"
    echo -e "${GREEN}✅ Repositório clonado${NC}"
else
    echo -e "${GREEN}✅ Repositório já existe${NC}"
fi

cd "$APP_DIR"

# ============================================
# 6. INSTALAR PNPM
# ============================================

echo -e "${BLUE}[6/10]${NC} Instalando pnpm..."

if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm > /dev/null 2>&1
    echo -e "${GREEN}✅ pnpm instalado${NC}"
else
    echo -e "${GREEN}✅ pnpm já instalado${NC}"
fi

# ============================================
# 7. INSTALAR DEPENDÊNCIAS DO FRONTEND
# ============================================

echo -e "${BLUE}[7/10]${NC} Instalando dependências do frontend..."
echo -e "${YELLOW}  ⏱️  Isso pode demorar 3-5 minutos...${NC}"

cd "$APP_DIR"

# Instalar com limite de memória e sem optional
NODE_OPTIONS="--max-old-space-size=1024" pnpm install --prod --no-optional --prefer-offline 2>&1 | grep -v "^Progress" || true

echo -e "${GREEN}✅ Dependências do frontend instaladas${NC}"

# ============================================
# 8. BUILD DO FRONTEND
# ============================================

echo -e "${BLUE}[8/10]${NC} Compilando frontend..."
echo -e "${YELLOW}  ⏱️  Isso pode demorar 5-10 minutos...${NC}"
echo -e "${YELLOW}  ☕ Esta é a hora do café!${NC}"

# Criar arquivo temporário de config otimizado
cat > vite.config.prod.ts <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    minify: 'esbuild',  // Mais rápido que terser
    sourcemap: false,   // Sem sourcemaps para economizar memória
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Code splitting mínimo para economizar memória
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
EOF

# Build com memória limitada e sem minificação pesada
NODE_OPTIONS="--max-old-space-size=1024" pnpm exec vite build --config vite.config.prod.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend compilado com sucesso${NC}"
    rm vite.config.prod.ts
else
    echo -e "${RED}❌ Falha na compilação do frontend${NC}"
    echo ""
    echo "SOLUÇÃO ALTERNATIVA:"
    echo "1. Faça o build no seu computador local"
    echo "2. Copie a pasta dist/ para o servidor"
    echo "3. Continue a instalação"
    exit 1
fi

# ============================================
# 9. BUILD DO BACKEND
# ============================================

echo -e "${BLUE}[9/10]${NC} Compilando backend..."

cd "$APP_DIR/backend"

NODE_OPTIONS="--max-old-space-size=512" pnpm exec tsc

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend compilado com sucesso${NC}"
else
    echo -e "${RED}❌ Falha na compilação do backend${NC}"
    exit 1
fi

# ============================================
# 10. CONFIGURAR E INICIAR
# ============================================

echo -e "${BLUE}[10/10]${NC} Iniciando aplicação..."

# Gerar Prisma Client
pnpm exec prisma generate

# Aplicar migrations (se banco já configurado)
if [ -n "$DATABASE_URL" ]; then
    pnpm exec prisma migrate deploy || echo "⚠️  Migrations podem precisar de configuração manual"
fi

# Iniciar com PM2
pm2 start ecosystem.config.js --env production || pm2 restart sispat-backend

echo ""
echo "============================================="
echo -e "${GREEN}✅ INSTALAÇÃO CONCLUÍDA!${NC}"
echo "============================================="
echo ""
echo "Próximos passos:"
echo "1. Configure o Nginx (ver GUIA_DEPLOY_PRODUCAO.md)"
echo "2. Configure o SSL (certbot)"
echo "3. Execute os testes: ./scripts/test-deploy.sh"
echo ""

exit 0

