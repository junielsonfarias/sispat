#!/bin/bash

# Script para corrigir problema de cache do frontend

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔧 CORRIGINDO CACHE DO FRONTEND${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Verificar se o frontend está compilado
echo -e "${YELLOW}1️⃣ Verificando build do frontend...${NC}"
cd /var/www/sispat

if [ ! -d "dist" ]; then
    echo -e "${RED}   ❌ Diretório dist não encontrado${NC}"
    echo -e "${YELLOW}   Compilando frontend...${NC}"
    npm run build
else
    echo -e "${GREEN}   ✅ Diretório dist encontrado${NC}"
fi
echo ""

# 2. Recompilar frontend para garantir que está atualizado
echo -e "${YELLOW}2️⃣ Recompilando frontend...${NC}"
npm run build || {
    echo -e "${RED}   ❌ Erro ao compilar frontend${NC}"
    exit 1
}
echo -e "${GREEN}   ✅ Frontend recompilado${NC}"
echo ""

# 3. Limpar cache do Nginx
echo -e "${YELLOW}3️⃣ Limpando cache do Nginx...${NC}"
rm -rf /var/cache/nginx/* 2>/dev/null || true
echo -e "${GREEN}   ✅ Cache do Nginx limpo${NC}"
echo ""

# 4. Recarregar Nginx
echo -e "${YELLOW}4️⃣ Recarregando Nginx...${NC}"
systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || systemctl restart nginx
echo -e "${GREEN}   ✅ Nginx recarregado${NC}"
echo ""

# 5. Verificar arquivos de Service Worker
echo -e "${YELLOW}5️⃣ Verificando Service Workers...${NC}"
if find dist -name "*service-worker*" -o -name "*sw.js" 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}   ⚠️  Service Workers encontrados no build${NC}"
    find dist -name "*service-worker*" -o -name "*sw.js" 2>/dev/null
    echo -e "${YELLOW}   💡 Usuários precisam desregistrar Service Workers no navegador${NC}"
else
    echo -e "${GREEN}   ✅ Nenhum Service Worker encontrado${NC}"
fi
echo ""

# 6. Adicionar headers no-cache ao index.html
echo -e "${YELLOW}6️⃣ Verificando headers de cache no Nginx...${NC}"
if grep -q "location ~* \.html$" /etc/nginx/sites-available/sispat 2>/dev/null; then
    echo -e "${GREEN}   ✅ Headers de cache já configurados${NC}"
else
    echo -e "${YELLOW}   ⚠️  Headers de cache não encontrados para HTML${NC}"
    echo -e "${YELLOW}   💡 Considere adicionar configuração de no-cache para HTML${NC}"
fi
echo ""

# 7. Verificar timestamp dos arquivos
echo -e "${YELLOW}7️⃣ Verificando timestamp dos arquivos...${NC}"
if [ -f "dist/index.html" ]; then
    echo -e "   index.html: $(stat -c %y dist/index.html 2>/dev/null || stat -f %Sm dist/index.html 2>/dev/null || echo 'data não disponível')"
fi
echo ""

# 8. Resumo
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 RESUMO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ Ações executadas:${NC}"
echo -e "   • Frontend recompilado"
echo -e "   • Cache do Nginx limpo"
echo -e "   • Nginx recarregado"
echo ""
echo -e "${YELLOW}⚠️  AÇÃO NECESSÁRIA NO NAVEGADOR:${NC}"
echo ""
echo -e "${BLUE}Opção 1: Limpar cache completamente${NC}"
echo -e "   1. Abra DevTools (F12)"
echo -e "   2. Application → Storage → Clear site data"
echo -e "   3. Marque todas as opções"
echo -e "   4. Clique em 'Clear site data'"
echo -e "   5. Feche e abra o navegador novamente"
echo ""
echo -e "${BLUE}Opção 2: Desregistrar Service Workers${NC}"
echo -e "   1. Abra DevTools (F12)"
echo -e "   2. Application → Service Workers"
echo -e "   3. Clique em 'Unregister' em todos os Service Workers"
echo -e "   4. Recarregue a página (Ctrl+Shift+R)"
echo ""
echo -e "${BLUE}Opção 3: Testar em janela anônima${NC}"
echo -e "   1. Abra uma janela anônima/privada (Ctrl+Shift+N)"
echo -e "   2. Acesse: https://sispat.vps-kinghost.net/admin/metrics"
echo -e "   3. Se funcionar, confirma que é problema de cache"
echo ""
echo -e "${BLUE}Opção 4: Hard Refresh${NC}"
echo -e "   • Windows/Linux: Ctrl+Shift+R ou Ctrl+F5"
echo -e "   • Mac: Cmd+Shift+R"
echo ""

