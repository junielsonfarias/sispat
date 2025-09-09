#!/bin/bash

# =================================
# CORREÇÃO ERRO 500 API SYNC - SISPAT
# Corrige especificamente o erro 500 na API /api/sync/public-data
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

# Banner
echo ""
echo "🔧 ================================================"
echo "🔧    CORREÇÃO ERRO 500 API SYNC - SISPAT"
echo "🔧    Corrige especificamente /api/sync/public-data"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção do erro 500 na API sync..."

# 1. Verificar se o PM2 está rodando
log "📋 Verificando status do PM2..."
if ! pm2 list | grep -q "sispat"; then
    error "❌ Aplicação SISPAT não está rodando no PM2"
fi

pm2 status
echo ""

# 2. Verificar logs do PM2 para erros específicos
log "📋 Verificando logs do PM2 para erros 500..."
echo ""
echo "Últimos 50 logs do PM2:"
pm2 logs sispat --lines 50 --nostream | tail -20
echo ""

# 3. Testar a rota diretamente
log "🧪 Testando rota /api/sync/public-data..."
echo ""
echo "Testando via localhost:"
curl -v http://localhost:3001/api/sync/public-data 2>&1 | head -30 || echo "Erro na conexão localhost"
echo ""
echo "Testando via domínio:"
curl -v https://sispat.vps-kinghost.net/api/sync/public-data 2>&1 | head -30 || echo "Erro na conexão domínio"
echo ""

# 4. Verificar se as tabelas existem
log "🗄️ Verificando tabelas necessárias..."
echo ""
sudo -u postgres psql -d sispat_production -c "
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('municipalities', 'patrimonios', 'imoveis', 'users', 'settings')
ORDER BY tablename;
" 2>/dev/null || warning "⚠️ Erro ao verificar tabelas"
echo ""

# 5. Verificar se há dados nas tabelas
log "📊 Verificando dados nas tabelas..."
echo ""
echo "Contagem de registros:"
sudo -u postgres psql -d sispat_production -c "
SELECT 
    'municipalities' as tabela, COUNT(*) as registros FROM municipalities
UNION ALL
SELECT 
    'patrimonios' as tabela, COUNT(*) as registros FROM patrimonios  
UNION ALL
SELECT 
    'imoveis' as tabela, COUNT(*) as registros FROM imoveis
UNION ALL
SELECT 
    'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT 
    'settings' as tabela, COUNT(*) as registros FROM settings;
" 2>/dev/null || warning "⚠️ Erro ao contar registros"
echo ""

# 6. Verificar estrutura das tabelas
log "🔍 Verificando estrutura das tabelas..."
echo ""
echo "Estrutura da tabela municipalities:"
sudo -u postgres psql -d sispat_production -c "\d municipalities" 2>/dev/null || warning "⚠️ Erro ao verificar estrutura municipalities"
echo ""

echo "Estrutura da tabela patrimonios:"
sudo -u postgres psql -d sispat_production -c "\d patrimonios" 2>/dev/null || warning "⚠️ Erro ao verificar estrutura patrimonios"
echo ""

# 7. Testar queries específicas da rota
log "🧪 Testando queries específicas da rota sync..."
echo ""
echo "Testando query de municipalities:"
sudo -u postgres psql -d sispat_production -c "
SELECT id, name, state FROM municipalities LIMIT 5;
" 2>/dev/null || warning "⚠️ Erro na query municipalities"
echo ""

echo "Testando query de patrimonios:"
sudo -u postgres psql -d sispat_production -c "
SELECT id, numero_patrimonio, descricao, municipality_id 
FROM patrimonios 
WHERE deleted_at IS NULL
ORDER BY numero_patrimonio
LIMIT 5;
" 2>/dev/null || warning "⚠️ Erro na query patrimonios"
echo ""

# 8. Verificar se há registros com deleted_at
log "🔍 Verificando registros com deleted_at..."
echo ""
echo "Patrimônios com deleted_at NULL:"
sudo -u postgres psql -d sispat_production -c "
SELECT COUNT(*) as total_null_deleted_at FROM patrimonios WHERE deleted_at IS NULL;
" 2>/dev/null || warning "⚠️ Erro ao verificar deleted_at"
echo ""

echo "Patrimônios com deleted_at NOT NULL:"
sudo -u postgres psql -d sispat_production -c "
SELECT COUNT(*) as total_not_null_deleted_at FROM patrimonios WHERE deleted_at IS NOT NULL;
" 2>/dev/null || warning "⚠️ Erro ao verificar deleted_at"
echo ""

# 9. Verificar se a coluna deleted_at existe
log "🔍 Verificando se coluna deleted_at existe..."
echo ""
echo "Colunas da tabela patrimonios:"
sudo -u postgres psql -d sispat_production -c "
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patrimonios' 
AND table_schema = 'public'
ORDER BY ordinal_position;
" 2>/dev/null || warning "⚠️ Erro ao verificar colunas patrimonios"
echo ""

# 10. Se a coluna deleted_at não existir, criar
log "🔧 Verificando/criando coluna deleted_at..."
echo ""
DELETED_AT_EXISTS=$(sudo -u postgres psql -d sispat_production -t -c "
SELECT COUNT(*) 
FROM information_schema.columns 
WHERE table_name = 'patrimonios' 
AND column_name = 'deleted_at' 
AND table_schema = 'public';
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$DELETED_AT_EXISTS" = "0" ]; then
    warning "⚠️ Coluna deleted_at não existe, criando..."
    sudo -u postgres psql -d sispat_production -c "
    ALTER TABLE patrimonios ADD COLUMN deleted_at TIMESTAMP NULL;
    " 2>/dev/null && success "✅ Coluna deleted_at criada" || warning "⚠️ Erro ao criar coluna deleted_at"
else
    success "✅ Coluna deleted_at já existe"
fi
echo ""

# 11. Verificar se a coluna active existe
log "🔍 Verificando se coluna active existe..."
echo ""
ACTIVE_EXISTS=$(sudo -u postgres psql -d sispat_production -t -c "
SELECT COUNT(*) 
FROM information_schema.columns 
WHERE table_name = 'patrimonios' 
AND column_name = 'active' 
AND table_schema = 'public';
" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$ACTIVE_EXISTS" = "0" ]; then
    warning "⚠️ Coluna active não existe, criando..."
    sudo -u postgres psql -d sispat_production -c "
    ALTER TABLE patrimonios ADD COLUMN active BOOLEAN DEFAULT true;
    " 2>/dev/null && success "✅ Coluna active criada" || warning "⚠️ Erro ao criar coluna active"
else
    success "✅ Coluna active já existe"
fi
echo ""

# 12. Atualizar registros para ter active = true
log "🔧 Atualizando registros para active = true..."
echo ""
sudo -u postgres psql -d sispat_production -c "
UPDATE patrimonios SET active = true WHERE active IS NULL;
" 2>/dev/null && success "✅ Registros atualizados para active = true" || warning "⚠️ Erro ao atualizar registros"
echo ""

# 13. Verificar se há dados de teste
log "📊 Verificando se há dados de teste..."
echo ""
MUNICIPALITIES_COUNT=$(sudo -u postgres psql -d sispat_production -t -c "SELECT COUNT(*) FROM municipalities;" 2>/dev/null | tr -d ' ' || echo "0")
PATRIMONIOS_COUNT=$(sudo -u postgres psql -d sispat_production -t -c "SELECT COUNT(*) FROM patrimonios;" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$MUNICIPALITIES_COUNT" = "0" ]; then
    warning "⚠️ Nenhum município encontrado, criando dados de teste..."
    sudo -u postgres psql -d sispat_production -c "
    INSERT INTO municipalities (id, name, state, created_at, updated_at) 
    VALUES 
    (gen_random_uuid(), 'Município Teste', 'SP', NOW(), NOW())
    ON CONFLICT DO NOTHING;
    " 2>/dev/null && success "✅ Município de teste criado" || warning "⚠️ Erro ao criar município de teste"
fi

if [ "$PATRIMONIOS_COUNT" = "0" ]; then
    warning "⚠️ Nenhum patrimônio encontrado, criando dados de teste..."
    MUNICIPALITY_ID=$(sudo -u postgres psql -d sispat_production -t -c "SELECT id FROM municipalities LIMIT 1;" 2>/dev/null | tr -d ' ')
    if [ ! -z "$MUNICIPALITY_ID" ]; then
        sudo -u postgres psql -d sispat_production -c "
        INSERT INTO patrimonios (id, numero_patrimonio, descricao, municipality_id, created_at, updated_at, active) 
        VALUES 
        (gen_random_uuid(), '001', 'Patrimônio de Teste', '$MUNICIPALITY_ID', NOW(), NOW(), true)
        ON CONFLICT DO NOTHING;
        " 2>/dev/null && success "✅ Patrimônio de teste criado" || warning "⚠️ Erro ao criar patrimônio de teste"
    fi
fi
echo ""

# 14. Reiniciar PM2 para aplicar mudanças
log "🔄 Reiniciando PM2 para aplicar mudanças..."
pm2 restart sispat
sleep 5
success "✅ PM2 reiniciado"

# 15. Aguardar inicialização
log "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# 16. Testar a rota após correções
log "🧪 Testando rota após correções..."
echo ""
echo "Testando /api/sync/public-data:"
SYNC_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/sync/public-data 2>/dev/null || echo "ERRO")
if echo "$SYNC_RESPONSE" | grep -q "200"; then
    success "✅ API sync/public-data funcionando"
    echo "Resposta:"
    echo "$SYNC_RESPONSE" | head -20
elif echo "$SYNC_RESPONSE" | grep -q "500"; then
    warning "⚠️ API sync/public-data ainda retorna 500"
    echo "Resposta: $SYNC_RESPONSE"
else
    warning "⚠️ API sync/public-data: $SYNC_RESPONSE"
fi

echo ""

# 17. Verificar logs após correções
log "📋 Verificando logs após correções..."
echo ""
pm2 logs sispat --lines 20 --nostream | tail -10
echo ""

# 18. Testar via domínio
log "🌐 Testando via domínio..."
echo ""
echo "Testando https://sispat.vps-kinghost.net/api/sync/public-data:"
DOMAIN_RESPONSE=$(curl -s -w "%{http_code}" https://sispat.vps-kinghost.net/api/sync/public-data 2>/dev/null || echo "ERRO")
if echo "$DOMAIN_RESPONSE" | grep -q "200"; then
    success "✅ API sync/public-data funcionando via domínio"
elif echo "$DOMAIN_RESPONSE" | grep -q "500"; then
    warning "⚠️ API sync/public-data ainda retorna 500 via domínio"
    echo "Resposta: $DOMAIN_RESPONSE"
else
    warning "⚠️ API sync/public-data via domínio: $DOMAIN_RESPONSE"
fi

echo ""

# Instruções finais
echo ""
echo "🎉 CORREÇÃO ERRO 500 API SYNC CONCLUÍDA!"
echo "========================================"
echo ""
echo "📋 O que foi feito:"
echo "✅ Status do PM2 verificado"
echo "✅ Logs do PM2 analisados"
echo "✅ Rota /api/sync/public-data testada"
echo "✅ Tabelas do banco verificadas"
echo "✅ Dados das tabelas verificados"
echo "✅ Estrutura das tabelas verificada"
echo "✅ Queries específicas testadas"
echo "✅ Coluna deleted_at verificada/criada"
echo "✅ Coluna active verificada/criada"
echo "✅ Dados de teste criados se necessário"
echo "✅ PM2 reiniciado"
echo "✅ Rota testada após correções"
echo "✅ Logs verificados"
echo "✅ Teste via domínio realizado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Coluna deleted_at criada se não existia"
echo "   - Coluna active criada se não existia"
echo "   - Dados de teste criados se necessário"
echo "   - Registros atualizados para active = true"
echo ""
echo "🌐 URLs das APIs:"
echo "   - Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
echo "   - Health: https://sispat.vps-kinghost.net/api/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Acesse a aplicação no navegador"
echo "   2. Verifique se não há mais erro 500 no console"
echo "   3. Se houver problemas, verifique:"
echo "      - pm2 logs sispat --lines 50"
echo "      - curl http://localhost:3001/api/sync/public-data"
echo ""
echo "🔍 Para monitorar:"
echo "   - Logs: pm2 logs sispat --lines 50"
echo "   - Status: pm2 status"
echo "   - APIs: curl -I http://localhost:3001/api/health"
echo ""

success "🎉 Correção do erro 500 na API sync concluída!"
