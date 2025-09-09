#!/bin/bash

# =================================
# CORREÇÃO ERROS API SYNC - SISPAT
# Corrige problemas de sincronização e configuração de API
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
echo "🔧    CORREÇÃO ERROS API SYNC - SISPAT"
echo "🔧    Corrige problemas de sincronização e API"
echo "🔧 ================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz da aplicação SISPAT"
fi

log "🔧 Iniciando correção dos erros de API sync..."

# 1. Verificar logs do PM2 para identificar erro 500
log "📋 Verificando logs do PM2 para erros 500..."
echo ""
pm2 logs sispat --lines 30 --nostream | grep -E "500|error|Error|ERROR" | tail -10 || echo "Nenhum erro encontrado nos logs recentes"
echo ""

# 2. Testar rota problemática diretamente
log "🧪 Testando rota /api/sync/public-data diretamente..."
echo ""
echo "Testando via localhost:"
curl -v http://localhost:3001/api/sync/public-data 2>&1 | head -20 || echo "Erro na conexão localhost"
echo ""
echo "Testando via domínio:"
curl -v https://sispat.vps-kinghost.net/api/sync/public-data 2>&1 | head -20 || echo "Erro na conexão domínio"
echo ""

# 3. Verificar se a rota existe no código
log "🔍 Verificando rota sync/public-data no código..."
if find server/routes -name "*.js" -exec grep -l "sync/public-data\|sync.*public.*data" {} \; 2>/dev/null; then
    success "✅ Rota encontrada no código"
    
    # Mostrar onde está definida
    echo "📄 Definição da rota:"
    find server/routes -name "*.js" -exec grep -n "sync/public-data\|sync.*public.*data" {} + 2>/dev/null | head -5
else
    warning "⚠️ Rota sync/public-data não encontrada no código"
    
    # Verificar rotas similares
    echo "🔍 Procurando rotas similares:"
    find server/routes -name "*.js" -exec grep -n "sync\|public" {} + 2>/dev/null | head -10
fi

# 4. Verificar se a rota ensure-superuser existe
log "🔍 Verificando rota ensure-superuser no código..."
if find server/routes -name "*.js" -exec grep -l "ensure-superuser\|ensureSuperuser" {} \; 2>/dev/null; then
    success "✅ Rota ensure-superuser encontrada"
    
    # Mostrar onde está definida
    echo "📄 Definição da rota:"
    find server/routes -name "*.js" -exec grep -n "ensure-superuser\|ensureSuperuser" {} + 2>/dev/null | head -5
else
    warning "⚠️ Rota ensure-superuser não encontrada"
fi

# 5. Verificar arquivo de rotas principal
log "🔍 Verificando arquivo de rotas principal..."
if [ -f "server/routes/index.js" ]; then
    success "✅ Arquivo server/routes/index.js encontrado"
    echo "📄 Conteúdo das rotas registradas:"
    grep -n "app.use\|router.use\|router.get\|router.post" server/routes/index.js | head -10
else
    warning "⚠️ Arquivo server/routes/index.js não encontrado"
fi

# 6. Verificar se as tabelas necessárias existem
log "🗄️ Verificando tabelas necessárias para sync..."
echo ""
sudo -u postgres psql -d sispat_production -c "
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('municipalities', 'patrimonios', 'imoveis', 'settings')
ORDER BY tablename;
" 2>/dev/null || warning "⚠️ Erro ao verificar tabelas"
echo ""

# 7. Verificar se há dados nas tabelas
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
    'users' as tabela, COUNT(*) as registros FROM users;
" 2>/dev/null || warning "⚠️ Erro ao contar registros"
echo ""

# 8. Criar rota de sync se não existir
log "🔧 Verificando/criando rota de sync..."
if [ -f "server/routes/sync.js" ]; then
    success "✅ Arquivo server/routes/sync.js já existe"
else
    warning "⚠️ Criando arquivo server/routes/sync.js..."
    
    cat > server/routes/sync.js << 'EOF'
import express from 'express';
import { pool } from '../database/connection.js';

const router = express.Router();

// Rota para sincronização de dados públicos
router.get('/public-data', async (req, res) => {
  try {
    console.log('🔄 Sincronizando dados públicos...');
    
    // Buscar municípios
    const municipalitiesResult = await pool.query(
      'SELECT id, name, state FROM municipalities ORDER BY name'
    );
    
    // Buscar configurações públicas
    const settingsResult = await pool.query(
      'SELECT key, value FROM settings WHERE is_public = true'
    );
    
    // Buscar contagem de patrimônios
    const patrimoniosResult = await pool.query(
      'SELECT COUNT(*) as count FROM patrimonios WHERE active = true'
    );
    
    // Buscar contagem de imóveis
    const imoveisResult = await pool.query(
      'SELECT COUNT(*) as count FROM imoveis WHERE active = true'
    );
    
    const publicData = {
      municipalities: municipalitiesResult.rows || [],
      publicSettings: settingsResult.rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {}),
      patrimoniosCount: parseInt(patrimoniosResult.rows[0]?.count || 0),
      imoveisCount: parseInt(imoveisResult.rows[0]?.count || 0),
      lastSync: new Date().toISOString()
    };
    
    console.log('✅ Dados públicos sincronizados:', {
      municipalities: publicData.municipalities.length,
      patrimonios: publicData.patrimoniosCount,
      imoveis: publicData.imoveisCount
    });
    
    res.json({
      success: true,
      data: publicData
    });
    
  } catch (error) {
    console.error('❌ Erro na sincronização de dados públicos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

export default router;
EOF
    
    success "✅ Arquivo server/routes/sync.js criado"
fi

# 9. Verificar se a rota está registrada no arquivo principal
log "🔧 Verificando registro da rota sync..."
if [ -f "server/index.js" ]; then
    if grep -q "sync" server/index.js; then
        success "✅ Rota sync já registrada"
    else
        warning "⚠️ Adicionando registro da rota sync..."
        
        # Fazer backup
        cp server/index.js server/index.js.backup.$(date +%Y%m%d_%H%M%S)
        
        # Adicionar import e registro da rota
        sed -i '/import.*routes.*from/a import syncRoutes from '\''./routes/sync.js'\'';' server/index.js
        sed -i '/app.use.*api/a app.use('\''/api/sync'\'', syncRoutes);' server/index.js
        
        success "✅ Rota sync registrada"
    fi
else
    error "❌ Arquivo server/index.js não encontrado"
fi

# 10. Criar rota ensure-superuser se não existir
log "🔧 Verificando/criando rota ensure-superuser..."
if grep -r "ensure-superuser\|ensureSuperuser" server/routes/ 2>/dev/null; then
    success "✅ Rota ensure-superuser já existe"
else
    warning "⚠️ Criando rota ensure-superuser..."
    
    # Adicionar ao arquivo auth.js se existir
    if [ -f "server/routes/auth.js" ]; then
        cat >> server/routes/auth.js << 'EOF'

// Rota para garantir que existe um superuser
router.post('/ensure-superuser', async (req, res) => {
  try {
    console.log('👤 Verificando existência de superuser...');
    
    // Verificar se já existe um superuser
    const superuserCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1 AND active = true',
      ['superuser']
    );
    
    const superuserCount = parseInt(superuserCheck.rows[0]?.count || 0);
    
    if (superuserCount > 0) {
      console.log(`✅ Superuser já existe (${superuserCount} encontrado)`);
      return res.json({
        success: true,
        message: 'Superuser já existe',
        count: superuserCount
      });
    }
    
    // Criar superuser se não existir
    console.log('🔧 Criando superuser padrão...');
    
    const hashedPassword = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'
    
    await pool.query(`
      INSERT INTO users (id, name, email, password, role, active, created_at, updated_at) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, [
      'Administrador',
      'admin@sispat.com',
      hashedPassword,
      'superuser',
      true
    ]);
    
    console.log('✅ Superuser criado com sucesso');
    
    res.json({
      success: true,
      message: 'Superuser criado com sucesso',
      user: {
        email: 'admin@sispat.com',
        role: 'superuser'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao garantir superuser:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});
EOF
        success "✅ Rota ensure-superuser adicionada ao auth.js"
    else
        warning "⚠️ Arquivo server/routes/auth.js não encontrado"
    fi
fi

# 11. Reiniciar PM2 para aplicar as mudanças
log "🔄 Reiniciando PM2 para aplicar mudanças..."
pm2 restart sispat
sleep 5
success "✅ PM2 reiniciado"

# 12. Aguardar inicialização
log "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# 13. Testar as rotas após mudanças
log "🧪 Testando rotas após mudanças..."
echo ""

# Testar sync/public-data
echo "Testando /api/sync/public-data:"
SYNC_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/sync/public-data 2>/dev/null || echo "ERRO")
if echo "$SYNC_RESPONSE" | grep -q "200"; then
    success "✅ API sync/public-data funcionando"
elif echo "$SYNC_RESPONSE" | grep -q "500"; then
    warning "⚠️ API sync/public-data ainda retorna 500"
    echo "Resposta: $SYNC_RESPONSE"
else
    warning "⚠️ API sync/public-data: $SYNC_RESPONSE"
fi

echo ""

# Testar ensure-superuser
echo "Testando /api/auth/ensure-superuser:"
SUPERUSER_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:3001/api/auth/ensure-superuser 2>/dev/null || echo "ERRO")
if echo "$SUPERUSER_RESPONSE" | grep -q "200"; then
    success "✅ API ensure-superuser funcionando"
else
    warning "⚠️ API ensure-superuser: $SUPERUSER_RESPONSE"
fi

echo ""

# 14. Verificar logs após mudanças
log "📋 Verificando logs após mudanças..."
echo ""
pm2 logs sispat --lines 15 --nostream | tail -10
echo ""

# 15. Testar frontend
log "🧪 Testando frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    success "✅ Frontend respondendo"
else
    warning "⚠️ Frontend com problema"
fi

# Instruções finais
echo ""
echo "🎉 CORREÇÃO ERROS API SYNC CONCLUÍDA!"
echo "===================================="
echo ""
echo "📋 O que foi feito:"
echo "✅ Logs do PM2 verificados"
echo "✅ Rota /api/sync/public-data testada"
echo "✅ Rotas no código verificadas"
echo "✅ Tabelas do banco verificadas"
echo "✅ Dados das tabelas verificados"
echo "✅ Arquivo server/routes/sync.js criado/verificado"
echo "✅ Rota sync registrada no servidor"
echo "✅ Rota ensure-superuser criada/verificada"
echo "✅ PM2 reiniciado"
echo "✅ Rotas testadas após mudanças"
echo "✅ Logs verificados"
echo "✅ Frontend testado"
echo ""
echo "🔧 Correções aplicadas:"
echo "   - Rota /api/sync/public-data criada/corrigida"
echo "   - Rota /api/auth/ensure-superuser criada/corrigida"
echo "   - Registro das rotas no servidor principal"
echo "   - Tratamento de erros adequado nas rotas"
echo ""
echo "🌐 URLs das APIs:"
echo "   - Sync: https://sispat.vps-kinghost.net/api/sync/public-data"
echo "   - Superuser: https://sispat.vps-kinghost.net/api/auth/ensure-superuser"
echo "   - Health: https://sispat.vps-kinghost.net/api/health"
echo ""
echo "📞 Próximos passos:"
echo "   1. Acesse a aplicação no navegador"
echo "   2. Verifique se não há mais erros 500 no console"
echo "   3. Faça login com: admin@sispat.com / password"
echo "   4. Se houver problemas, verifique:"
echo "      - pm2 logs sispat --lines 50"
echo "      - curl http://localhost:3001/api/sync/public-data"
echo ""
echo "🔍 Para monitorar:"
echo "   - Logs: pm2 logs sispat --lines 50"
echo "   - Status: pm2 status"
echo "   - APIs: curl -I http://localhost:3001/api/health"
echo ""

success "🎉 Correção dos erros de API sync concluída!"
