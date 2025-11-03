#!/bin/bash

# ============================================================================
# SCRIPT DE DEPLOY - CORREÇÕES DE SETORES E INVENTÁRIO
# Data: 14/10/2025
# Descrição: Atualiza o sistema com as correções de filtro de setores e
#            erro 400 ao criar inventário
# ============================================================================

set -e  # Parar em caso de erro

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}   DEPLOY DE CORREÇÕES - SISPAT 2.0${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ ERRO: Execute este script no diretório do projeto!${NC}"
    echo "Exemplo: cd /var/www/sispat && bash DEPLOY_PRODUCAO_CORRECOES.sh"
    exit 1
fi

echo -e "${YELLOW}📋 CORREÇÕES QUE SERÃO APLICADAS:${NC}"
echo "   1. ✅ Filtro de setores por role em Inventário"
echo "   2. ✅ Filtro de setores por role em Relatórios"
echo "   3. ✅ Filtro de setores por role em Dialog de Filtros"
echo "   4. ✅ Alinhamento frontend-backend para inventário"
echo "   5. ✅ Correção de erro 400 ao criar inventário"
echo ""

read -p "Deseja continuar? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}⚠️  Deploy cancelado pelo usuário${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}🔄 ETAPA 1/6: Fazendo backup do sistema atual${NC}"
echo -e "${BLUE}============================================================================${NC}"

BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
echo "Criando backup em: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"
cp -r dist "$BACKUP_DIR/dist_backup" 2>/dev/null || echo "⚠️  Sem dist para backup"
cp -r backend/dist "$BACKUP_DIR/backend_dist_backup" 2>/dev/null || echo "⚠️  Sem backend/dist para backup"

echo -e "${GREEN}✅ Backup criado em: $BACKUP_DIR${NC}"
echo ""

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}🔄 ETAPA 2/6: Atualizando código do repositório${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Fazer backup de arquivos de ambiente
cp .env .env.backup 2>/dev/null || echo "⚠️  Sem .env para backup"
cp backend/.env backend/.env.backup 2>/dev/null || echo "⚠️  Sem backend/.env para backup"

echo "Fazendo git pull..."
git fetch origin
git pull origin main

# Restaurar arquivos de ambiente
cp .env.backup .env 2>/dev/null || echo "⚠️  .env não restaurado"
cp backend/.env.backup backend/.env 2>/dev/null || echo "⚠️  backend/.env não restaurado"

echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}🔄 ETAPA 3/6: Compilando FRONTEND${NC}"
echo -e "${BLUE}============================================================================${NC}"

echo "Instalando dependências do frontend (se necessário)..."
npm install --legacy-peer-deps --production=false

echo ""
echo "Removendo build anterior..."
rm -rf dist

echo ""
echo "Compilando frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ ERRO: Build do frontend falhou! Restaurando backup...${NC}"
    cp -r "$BACKUP_DIR/dist_backup" dist 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Frontend compilado com sucesso${NC}"
echo ""

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}🔄 ETAPA 4/6: Compilando BACKEND${NC}"
echo -e "${BLUE}============================================================================${NC}"

cd backend

echo "Instalando dependências do backend (se necessário)..."
npm install --production=false

echo ""
echo "Removendo build anterior..."
rm -rf dist

echo ""
echo "Compilando backend..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ ERRO: Build do backend falhou! Restaurando backup...${NC}"
    cd ..
    cp -r "$BACKUP_DIR/backend_dist_backup" backend/dist 2>/dev/null || true
    exit 1
fi

cd ..

echo -e "${GREEN}✅ Backend compilado com sucesso${NC}"
echo ""

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}🔄 ETAPA 5/6: Reiniciando serviços${NC}"
echo -e "${BLUE}============================================================================${NC}"

echo "Reiniciando backend (PM2)..."
pm2 restart sispat-backend

echo ""
echo "Aguardando 3 segundos para o backend iniciar..."
sleep 3

echo ""
echo "Recarregando Nginx..."
sudo systemctl reload nginx

echo -e "${GREEN}✅ Serviços reiniciados${NC}"
echo ""

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}🔄 ETAPA 6/6: Verificando deploy${NC}"
echo -e "${BLUE}============================================================================${NC}"

echo "Status do PM2:"
pm2 list | grep sispat-backend

echo ""
echo "Status do Nginx:"
sudo systemctl status nginx --no-pager | head -5

echo ""
echo "Últimas 20 linhas do log do backend:"
pm2 logs sispat-backend --lines 20 --nostream

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}📝 PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1. TESTE COM USUÁRIO:"
echo "   - Login com usuário normal (não admin/supervisor)"
echo "   - Vá em 'Gerar Inventário'"
echo "   - ✅ Deve ver APENAS setores atribuídos"
echo "   - Vá em 'Gerar Relatório'"
echo "   - ✅ Deve ver APENAS setores atribuídos"
echo ""
echo "2. TESTE COM SUPERVISOR:"
echo "   - Login: supervisor@ssbv.com / Master6273@"
echo "   - Vá em 'Gerar Inventário'"
echo "   - ✅ Deve ver TODOS os setores"
echo "   - Vá em 'Gerar Relatório'"
echo "   - ✅ Deve ver TODOS os setores"
echo ""
echo "3. TESTE CRIAR INVENTÁRIO:"
echo "   - Preencha o formulário e clique em 'Criar'"
echo "   - ✅ NÃO deve dar erro 400"
echo "   - ✅ Inventário deve ser criado com sucesso"
echo ""
echo -e "${YELLOW}🔍 MONITORAR LOGS:${NC}"
echo "   pm2 logs sispat-backend --lines 50"
echo ""
echo -e "${YELLOW}📊 BACKUP CRIADO EM:${NC}"
echo "   $BACKUP_DIR"
echo ""
echo -e "${GREEN}🎉 Sistema atualizado e pronto para uso!${NC}"
echo ""

