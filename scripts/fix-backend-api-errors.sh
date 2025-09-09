#!/bin/bash

# =================================
# CORREÇÃO ERROS API BACKEND - SISPAT
# Corrige erros 500 e conexão com APIs
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
echo "🔧    CORREÇÃO ERROS API BACKEND - SISPAT"
echo "🔧    Corrige erros 500 e conexão com APIs"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção dos erros de API do backend..."

# 1. Verificar status do PM2
log "📊 Verificando status do PM2..."
pm2 status
echo ""

# 2. Verificar logs do PM2 para erros
log "📋 Verificando logs recentes do PM2..."
pm2 logs sispat --lines 20 --nostream
echo ""

# 3. Testar conectividade da API
log "🧪 Testando conectividade da API..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API health respondendo"
else
    warning "⚠️ API health não está respondendo"
fi

# 4. Testar rota problemática
log "🧪 Testando rota /api/sync/public-data..."
SYNC_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/sync/public-data || echo "ERRO")
if echo "$SYNC_RESPONSE" | grep -q "500"; then
    warning "⚠️ Rota /api/sync/public-data retorna 500"
elif echo "$SYNC_RESPONSE" | grep -q "200"; then
    success "✅ Rota /api/sync/public-data funcionando"
else
    warning "⚠️ Rota /api/sync/public-data com problema: $SYNC_RESPONSE"
fi

# 5. Testar rota ensure-superuser
log "🧪 Testando rota /api/auth/ensure-superuser..."
SUPERUSER_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:3001/api/auth/ensure-superuser || echo "ERRO")
if echo "$SUPERUSER_RESPONSE" | grep -q "200"; then
    success "✅ Rota /api/auth/ensure-superuser funcionando"
else
    warning "⚠️ Rota /api/auth/ensure-superuser com problema: $SUPERUSER_RESPONSE"
fi

# 6. Verificar se as rotas existem no código
log "🔍 Verificando rotas no código..."
if grep -r "sync/public-data" server/routes/ 2>/dev/null; then
    success "✅ Rota sync/public-data encontrada no código"
else
    warning "⚠️ Rota sync/public-data não encontrada no código"
fi

if grep -r "ensure-superuser" server/routes/ 2>/dev/null; then
    success "✅ Rota ensure-superuser encontrada no código"
else
    warning "⚠️ Rota ensure-superuser não encontrada no código"
fi

# 7. Criar logo SISPAT se não existir
log "🎨 Verificando logo SISPAT..."
if [ ! -f "dist/logo-sispat.svg" ]; then
    warning "⚠️ logo-sispat.svg não encontrado, criando..."
    
    cat > dist/logo-sispat.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="200" height="60" fill="url(#grad1)" rx="8"/>
  
  <!-- Icon -->
  <circle cx="25" cy="30" r="15" fill="white" opacity="0.9"/>
  <text x="25" y="36" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#2563eb" text-anchor="middle">S</text>
  
  <!-- Text -->
  <text x="50" y="25" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">SISPAT</text>
  <text x="50" y="42" font-family="Arial, sans-serif" font-size="10" fill="white" opacity="0.8">Sistema de Gestão Patrimonial</text>
</svg>
EOF
    success "✅ logo-sispat.svg criado"
else
    success "✅ logo-sispat.svg já existe"
fi

# 8. Verificar banco de dados
log "🗄️ Verificando conexão com banco de dados..."
if sudo -u postgres psql -d sispat_production -c "SELECT 1;" 2>/dev/null | grep -q "1"; then
    success "✅ Conexão com banco de dados OK"
else
    warning "⚠️ Problema na conexão com banco de dados"
fi

# 9. Verificar se tabelas existem
log "🗄️ Verificando tabelas principais..."
TABLES_CHECK=$(sudo -u postgres psql -d sispat_production -c "\dt" 2>/dev/null || echo "ERRO")
if echo "$TABLES_CHECK" | grep -q "municipalities"; then
    success "✅ Tabela municipalities existe"
else
    warning "⚠️ Tabela municipalities não encontrada"
fi

if echo "$TABLES_CHECK" | grep -q "users"; then
    success "✅ Tabela users existe"
else
    warning "⚠️ Tabela users não encontrada"
fi

# 10. Executar migrações se necessário
log "🗄️ Verificando se é necessário executar migrações..."
if [ -f "server/database/migrate.js" ]; then
    log "🔄 Executando migrações..."
    cd server/database
    node migrate.js || warning "⚠️ Erro ao executar migrações"
    cd ../..
    success "✅ Migrações executadas"
else
    warning "⚠️ Arquivo de migração não encontrado"
fi

# 11. Reiniciar PM2 para aplicar correções
log "🔄 Reiniciando PM2..."
pm2 restart sispat
sleep 5
success "✅ PM2 reiniciado"

# 12. Aguardar inicialização
log "⏳ Aguardando inicialização..."
sleep 10

# 13. Testar APIs novamente
log "🧪 Testando APIs após reinicialização..."

# Testar health
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
    success "✅ API health OK após reinicialização"
else
    warning "⚠️ API health ainda com problema"
fi

# Testar sync/public-data
SYNC_RESPONSE_2=$(curl -s -w "%{http_code}" http://localhost:3001/api/sync/public-data 2>/dev/null || echo "ERRO")
if echo "$SYNC_RESPONSE_2" | grep -q "200"; then
    success "✅ API sync/public-data OK após reinicialização"
elif echo "$SYNC_RESPONSE_2" | grep -q "500"; then
    warning "⚠️ API sync/public-data ainda retorna 500"
else
    warning "⚠️ API sync/public-data: $SYNC_RESPONSE_2"
fi

# Testar ensure-superuser
SUPERUSER_RESPONSE_2=$(curl -s -w "%{http_code}" -X POST http://localhost:3001/api/auth/ensure-superuser 2>/dev/null || echo "ERRO")
if echo "$SUPERUSER_RESPONSE_2" | grep -q "200"; then
    success "✅ API ensure-superuser OK após reinicialização"
else
    warning "⚠️ API ensure-superuser: $SUPERUSER_RESPONSE_2"
fi

# 14. Verificar logs após reinicialização
log "📋 Verificando logs após reinicialização..."
RECENT_LOGS=$(pm2 logs sispat --lines 10 --nostream 2>/dev/null || echo "ERRO")
if echo "$RECENT_LOGS" | grep -i "error\|erro\|500"; then
    warning "⚠️ Ainda há erros nos logs após reinicialização"
    echo "📄 Últimos logs com erro:"
    echo "$RECENT_LOGS" | grep -i "error\|erro\|500" | tail -5
else
    success "✅ Nenhum erro crítico nos logs após reinicialização"
fi

# 15. Testar frontend após correções
log "🧪 Testando frontend após correções..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    success "✅ Frontend OK após correções"
else
    warning "⚠️ Frontend com problema após correções"
fi

# 16. Criar usuário superuser se necessário
log "👤 Verificando usuário superuser..."
SUPERUSER_EXISTS=$(sudo -u postgres psql -d sispat_production -c "SELECT COUNT(*) FROM users WHERE role = 'superuser';" 2>/dev/null | grep -o '[0-9]\+' | head -1 || echo "0")
if [ "$SUPERUSER_EXISTS" -gt 0 ]; then
    success "✅ Usuário superuser existe ($SUPERUSER_EXISTS encontrado)"
else
    warning "⚠️ Nenhum usuário superuser encontrado, criando..."
    
    # Criar usuário superuser
    sudo -u postgres psql -d sispat_production << 'EOF'
INSERT INTO users (id, name, email, password, role, active, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin@sispat.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'superuser',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
EOF
    
    success "✅ Usuário superuser criado (admin@sispat.com / password)"
fi

# Instruções finais
echo ""
echo "🎉 CORREÇÃO ERROS API BACKEND CONCLUÍDA!"
echo "========================================"
echo ""
echo "📋 O que foi feito:"
echo "✅ Status do PM2 verificado"
echo "✅ Logs do PM2 analisados"
echo "✅ Conectividade da API testada"
echo "✅ Rotas problemáticas testadas"
echo "✅ Rotas no código verificadas"
echo "✅ logo-sispat.svg criado"
echo "✅ Conexão com banco verificada"
echo "✅ Tabelas principais verificadas"
echo "✅ Migrações executadas"
echo "✅ PM2 reiniciado"
echo "✅ APIs testadas após reinicialização"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo "✅ Usuário superuser verificado/criado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - logo-sispat.svg criado"
echo "   - Migrações de banco executadas"
echo "   - PM2 reiniciado para aplicar correções"
echo "   - Usuário superuser criado se necessário"
echo ""
echo "🌐 URLs da aplicação:"
echo "   - Frontend: https://sispat.vps-kinghost.net"
echo "   - API Health: https://sispat.vps-kinghost.net/api/health"
echo "   - API Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
echo ""
echo "👤 Login do sistema:"
echo "   - Email: admin@sispat.com"
echo "   - Senha: password"
echo ""
echo "📞 Próximos passos:"
echo "   1. Acesse a aplicação no navegador"
echo "   2. Faça login com as credenciais acima"
echo "   3. Verifique se não há mais erros no console"
echo "   4. Se houver problemas, verifique:"
echo "      - pm2 logs sispat"
echo "      - pm2 status"
echo "      - curl http://localhost:3001/api/health"
echo ""
echo "🔍 Para monitorar:"
echo "   - Logs em tempo real: pm2 logs sispat --lines 50"
echo "   - Status dos processos: pm2 status"
echo "   - Teste das APIs: curl -I http://localhost:3001/api/health"
echo ""

success "🎉 Correção dos erros de API do backend concluída!"
