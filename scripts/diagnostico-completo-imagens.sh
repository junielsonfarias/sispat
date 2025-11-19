#!/bin/bash

# Script de diagnóstico completo para problemas de imagens
# Uso: ./scripts/diagnostico-completo-imagens.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 Diagnóstico Completo de Imagens${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 1. Verificar estrutura de diretórios
echo -e "${BLUE}1. Verificando estrutura de diretórios...${NC}"
UPLOADS_DIR="/var/www/sispat/backend/uploads"
if [ -d "$UPLOADS_DIR" ]; then
    echo -e "${GREEN}✅ Diretório uploads existe: $UPLOADS_DIR${NC}"
    echo -e "   Permissões: $(stat -c "%a %U:%G" "$UPLOADS_DIR")"
else
    echo -e "${RED}❌ Diretório uploads não existe!${NC}"
    exit 1
fi

# 2. Verificar arquivos recentes
echo ""
echo -e "${BLUE}2. Verificando arquivos recentes (últimos 10)...${NC}"
ls -lht "$UPLOADS_DIR" | head -11 | tail -10

# 3. Verificar permissões dos arquivos
echo ""
echo -e "${BLUE}3. Verificando permissões dos arquivos...${NC}"
WRONG_PERMS=$(find "$UPLOADS_DIR" -type f ! -user www-data 2>/dev/null | wc -l)
if [ "$WRONG_PERMS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WRONG_PERMS arquivos com permissões incorretas${NC}"
    echo -e "${YELLOW}   Exemplos:${NC}"
    find "$UPLOADS_DIR" -type f ! -user www-data 2>/dev/null | head -5 | while read file; do
        echo -e "   - $(stat -c "%U:%G %a" "$file") $file"
    done
else
    echo -e "${GREEN}✅ Todas as permissões estão corretas${NC}"
fi

# 4. Verificar backend rodando
echo ""
echo -e "${BLUE}4. Verificando backend...${NC}"
if pm2 list | grep -q "sispat-backend.*online"; then
    echo -e "${GREEN}✅ Backend está rodando${NC}"
    BACKEND_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="sispat-backend") | .pm2_env.status' 2>/dev/null || echo "unknown")
    echo -e "   Status: $BACKEND_STATUS"
else
    echo -e "${RED}❌ Backend não está rodando!${NC}"
fi

# 5. Verificar código compilado
echo ""
echo -e "${BLUE}5. Verificando código compilado do backend...${NC}"
DIST_FILE="/var/www/sispat/backend/dist/index.js"
if [ -f "$DIST_FILE" ]; then
    echo -e "${GREEN}✅ Backend compilado existe${NC}"
    # Verificar se tem a normalização de fotos
    if grep -q "Normalizar fotos" "$DIST_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ Código de normalização encontrado${NC}"
    else
        echo -e "${YELLOW}⚠️  Código de normalização não encontrado (pode precisar recompilar)${NC}"
    fi
else
    echo -e "${RED}❌ Backend não compilado!${NC}"
fi

# 6. Verificar logs do backend
echo ""
echo -e "${BLUE}6. Verificando logs recentes do backend...${NC}"
pm2 logs sispat-backend --lines 20 --nostream 2>/dev/null | grep -i "foto\|upload\|image\|error" | tail -10 || echo "   Nenhum log relevante encontrado"

# 7. Testar acesso HTTP a um arquivo
echo ""
echo -e "${BLUE}7. Testando acesso HTTP a arquivos...${NC}"
RECENT_FILE=$(ls -t "$UPLOADS_DIR" | grep -E "\.(jpg|jpeg|png|gif|webp)$" | head -1)
if [ -n "$RECENT_FILE" ]; then
    FILE_PATH="$UPLOADS_DIR/$RECENT_FILE"
    echo -e "   Arquivo de teste: $RECENT_FILE"
    
    # Verificar se arquivo existe
    if [ -f "$FILE_PATH" ]; then
        echo -e "   ${GREEN}✅ Arquivo existe no servidor${NC}"
        echo -e "   Permissões: $(stat -c "%U:%G %a" "$FILE_PATH")"
        
        # Testar acesso via HTTP
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://sispat.vps-kinghost.net/uploads/$RECENT_FILE" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "   ${GREEN}✅ Arquivo acessível via HTTP (200)${NC}"
        else
            echo -e "   ${RED}❌ Arquivo NÃO acessível via HTTP (código: $HTTP_CODE)${NC}"
            echo -e "   ${YELLOW}   URL testada: https://sispat.vps-kinghost.net/uploads/$RECENT_FILE${NC}"
        fi
    else
        echo -e "   ${RED}❌ Arquivo não existe!${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Nenhum arquivo de imagem recente encontrado${NC}"
fi

# 8. Verificar configuração Nginx
echo ""
echo -e "${BLUE}8. Verificando configuração Nginx...${NC}"
if grep -q "location /uploads" /etc/nginx/sites-enabled/* 2>/dev/null; then
    echo -e "${GREEN}✅ Configuração /uploads encontrada no Nginx${NC}"
    grep -A 5 "location /uploads" /etc/nginx/sites-enabled/* 2>/dev/null | head -6
else
    echo -e "${RED}❌ Configuração /uploads não encontrada no Nginx!${NC}"
fi

# 9. Verificar banco de dados (exemplo de foto)
echo ""
echo -e "${BLUE}9. Verificando dados no banco...${NC}"
echo -e "${YELLOW}   (Verificando formato das fotos no banco)${NC}"
# Tentar buscar um exemplo do banco
DB_CHECK=$(cd /var/www/sispat/backend && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.patrimonio.findFirst({
  where: { fotos: { isEmpty: false } },
  select: { id: true, numero_patrimonio: true, fotos: true }
}).then(p => {
  if (p) {
    console.log('Patrimônio encontrado:', p.numero_patrimonio);
    console.log('Fotos:', JSON.stringify(p.fotos));
    console.log('Tipo da primeira foto:', typeof p.fotos[0]);
  } else {
    console.log('Nenhum patrimônio com fotos encontrado');
  }
  prisma.\$disconnect();
}).catch(e => {
  console.log('Erro:', e.message);
  prisma.\$disconnect();
});
" 2>/dev/null || echo "   Não foi possível verificar banco de dados")

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  💡 Próximos Passos${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "Se as imagens ainda não aparecem:"
echo ""
echo "1. Corrigir permissões:"
echo "   sudo chown -R www-data:www-data $UPLOADS_DIR"
echo "   sudo find $UPLOADS_DIR -type f -exec chmod 644 {} \\;"
echo "   sudo find $UPLOADS_DIR -type d -exec chmod 755 {} \\;"
echo ""
echo "2. Recompilar backend:"
echo "   cd /var/www/sispat/backend"
echo "   npm run build"
echo "   pm2 restart sispat-backend"
echo ""
echo "3. Verificar logs em tempo real:"
echo "   pm2 logs sispat-backend"
echo ""
echo "4. Testar upload de nova imagem e verificar:"
echo "   - Se arquivo é criado em $UPLOADS_DIR"
echo "   - Se permissões estão corretas (www-data:www-data)"
echo "   - Se URL é acessível via HTTP"

