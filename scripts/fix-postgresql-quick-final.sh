#!/bin/bash

# =================================
# CORREÇÃO RÁPIDA POSTGRESQL - SISPAT
# Execute este script na VPS para corrigir PostgreSQL
# =================================

echo "🔧 CORREÇÃO RÁPIDA POSTGRESQL - SISPAT..."
echo "=========================================="

# 1. Corrigir usuário PostgreSQL
echo "🗄️ Corrigindo usuário PostgreSQL..."
sudo -u postgres psql << 'EOF'
-- Parar conexões ativas
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'sispat_production';

-- Remover usuário e banco existentes
DROP DATABASE IF EXISTS sispat_production;
DROP USER IF EXISTS sispat_user;

-- Criar usuário com senha correta
CREATE USER sispat_user WITH PASSWORD 'sispat123456';

-- Criar banco de dados
CREATE DATABASE sispat_production OWNER sispat_user;

-- Conceder todas as permissões
GRANT ALL PRIVILEGES ON DATABASE sispat_production TO sispat_user;
ALTER USER sispat_user CREATEDB;

-- Conectar ao banco e configurar permissões
\c sispat_production

-- Conceder permissões no schema public
GRANT ALL ON SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sispat_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO sispat_user;

-- Configurar permissões para futuras tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sispat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO sispat_user;

-- Verificar configuração
\du
\l
\q
EOF

echo "✅ Usuário PostgreSQL corrigido"

# 2. Atualizar arquivo .env.production
echo "📋 Atualizando arquivo .env.production..."
if [ -f ".env.production" ]; then
    sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=sispat123456/' .env.production
    sed -i 's/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/sispat_user:sispat123456@localhost:5432\/sispat_production/' .env.production
    echo "✅ Arquivo .env.production atualizado"
else
    echo "❌ Arquivo .env.production não encontrado"
fi

# 3. Reiniciar backend
echo "🔄 Reiniciando backend..."
if command -v pm2 &> /dev/null; then
    pm2 restart sispat-backend
    echo "✅ Backend reiniciado"
else
    echo "⚠️ PM2 não encontrado"
fi

# 4. Testar conexão
echo "🔌 Testando conexão..."
sleep 5
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend funcionando!"
else
    echo "⚠️ Backend pode não estar funcionando"
fi

echo ""
echo "🎉 CORREÇÃO CONCLUÍDA!"
echo "✅ SISPAT deve estar funcionando agora!"
echo ""
echo "🌐 Teste: http://localhost:3001/api/health"
echo "📊 Status: pm2 status"
echo "📋 Logs: pm2 logs"
