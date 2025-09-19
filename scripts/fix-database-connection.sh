#!/bin/bash

# Script de correção de conexão com banco de dados
set -e

echo "🔧 Iniciando correção de conexão com banco de dados..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto SISPAT"
    exit 1
fi

# 1. Verificar se PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "⚠️ PostgreSQL não encontrado. Instalando..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install postgresql
    fi
else
    echo "✅ PostgreSQL já está instalado"
fi

# 2. Verificar se PostgreSQL está rodando
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "⚠️ PostgreSQL não está rodando. Iniciando..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    fi
    sleep 5
else
    echo "✅ PostgreSQL está rodando"
fi

# 3. Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env..."
    cat > .env << 'EOF'
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_development
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sispat_development
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
DB_SSL_REJECT_UNAUTHORIZED=false

# JWT e Segurança
JWT_SECRET=dev_jwt_secret_key_2025_min_32_chars_long_development
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080

# Frontend
VITE_PORT=8080
VITE_API_TARGET=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
VITE_BACKEND_URL=http://localhost:3001
VITE_DOMAIN=http://localhost:8080
EOF
    echo "✅ Arquivo .env criado"
else
    echo "✅ Arquivo .env já existe"
fi

# 4. Criar banco de dados se não existir
echo "🗄️ Verificando banco de dados..."

# Detectar usuário PostgreSQL
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PG_USER="postgres"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PG_USER=$(whoami)
else
    PG_USER="postgres"
fi

# Criar banco de dados
if ! psql -h localhost -U $PG_USER -lqt | cut -d \| -f 1 | grep -qw sispat_development; then
    echo "📝 Criando banco de dados sispat_development..."
    createdb -h localhost -U $PG_USER sispat_development
    echo "✅ Banco de dados criado"
else
    echo "✅ Banco de dados já existe"
fi

# 5. Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo "✅ Dependências instaladas"
else
    echo "✅ Dependências já instaladas"
fi

# 6. Executar migrações
echo "🔄 Executando migrações do banco de dados..."
if [ -f "server/database/migrate.js" ]; then
    node server/database/migrate.js
    echo "✅ Migrações executadas"
else
    echo "⚠️ Arquivo de migração não encontrado"
fi

# 7. Testar conexão
echo "🧪 Testando conexão com banco de dados..."
if node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sispat_development',
  user: 'postgres',
  password: 'postgres'
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro na conexão:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conexão com banco de dados funcionando!');
    console.log('📅 Data/hora do servidor:', res.rows[0].now);
    pool.end();
  }
});
"; then
    echo "✅ Conexão com banco de dados testada com sucesso"
else
    echo "❌ Falha ao testar conexão com banco de dados"
    exit 1
fi

echo ""
echo "🎉 Correção de conexão com banco de dados concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Execute: npm run dev (para iniciar o servidor de desenvolvimento)"
echo "2. Acesse: http://localhost:8080 (frontend)"
echo "3. Acesse: http://localhost:3001/api/health (backend)"
echo ""
echo "🔑 Credenciais padrão:"
echo "   Email: junielsonfarias@gmail.com"
echo "   Senha: Tiko6273@"
echo ""