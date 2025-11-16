#!/bin/bash

# Script para aplicar correção de imagens em produção
# Uso: ./scripts/deploy-correcao-imagens.sh

set -e  # Parar em caso de erro

echo "🔧 Aplicando correção de imagens em produção..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Erro: Execute este script a partir do diretório raiz do projeto${NC}"
    exit 1
fi

# Fazer backup
echo -e "${YELLOW}📦 Fazendo backup do código atual...${NC}"
BACKUP_DIR="frontend.backup.$(date +%Y%m%d_%H%M%S)"
if [ -d "frontend" ]; then
    cp -r frontend "$BACKUP_DIR"
    echo -e "${GREEN}✅ Backup criado: $BACKUP_DIR${NC}"
else
    echo -e "${RED}❌ Diretório frontend não encontrado${NC}"
    exit 1
fi

# Atualizar código (se estiver usando Git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}🔄 Atualizando código via Git...${NC}"
    git pull origin main || git pull origin master || echo -e "${YELLOW}⚠️  Não foi possível fazer git pull${NC}"
else
    echo -e "${YELLOW}⚠️  Não é um repositório Git. Certifique-se de que os arquivos foram atualizados manualmente.${NC}"
fi

# Rebuild do frontend
echo -e "${YELLOW}🔨 Rebuild do frontend...${NC}"
cd frontend

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm install
fi

# Build
echo -e "${YELLOW}🏗️  Executando build de produção...${NC}"
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erro: Build falhou - diretório dist não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído com sucesso${NC}"
echo -e "${GREEN}✅ Arquivos em: $(pwd)/dist${NC}"

cd ..

# Verificar arquivos modificados
echo ""
echo -e "${YELLOW}📋 Verificando arquivos modificados...${NC}"
if grep -r "blob-" frontend/dist/assets/*.js 2>/dev/null | grep -q "invalid\|placeholder"; then
    echo -e "${GREEN}✅ Correção detectada nos arquivos compilados${NC}"
else
    echo -e "${YELLOW}⚠️  Não foi possível verificar se a correção está presente${NC}"
fi

# Instruções finais
echo ""
echo -e "${GREEN}✅ Correção aplicada com sucesso!${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "1. Reiniciar o serviço (se necessário):"
echo "   - PM2: pm2 restart sispat-frontend"
echo "   - Nginx: sudo systemctl reload nginx"
echo ""
echo "2. Limpar cache do navegador:"
echo "   - Ctrl+Shift+R (Windows/Linux)"
echo "   - Cmd+Shift+R (Mac)"
echo ""
echo "3. Testar:"
echo "   - Acessar um bem cadastrado com imagens"
echo "   - Verificar se as imagens aparecem ou placeholder é exibido"
echo "   - Verificar console do navegador (não deve haver erros 404)"
echo "   - Testar geração de PDF"
echo ""
echo -e "${GREEN}✨ Deploy concluído!${NC}"

