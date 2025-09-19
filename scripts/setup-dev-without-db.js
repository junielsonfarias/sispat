import fs from 'fs';

console.log(
  '🔧 Configurando ambiente de desenvolvimento sem banco de dados...'
);

// Criar arquivo .env
const envContent = `NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Banco de Dados PostgreSQL (desabilitado para desenvolvimento)
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

# Desabilitar banco de dados para desenvolvimento
DISABLE_DATABASE=true
`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ Arquivo .env criado');
} catch (error) {
  console.error('❌ Erro ao criar arquivo .env:', error.message);
  process.exit(1);
}

// Criar diretório de logs
try {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
    console.log('✅ Diretório de logs criado');
  }
} catch (error) {
  console.error('❌ Erro ao criar diretório de logs:', error.message);
}

console.log('');
console.log('🎉 Configuração concluída!');
console.log('');
console.log('📋 Próximos passos:');
console.log('1. Instale o PostgreSQL se quiser usar o banco de dados');
console.log(
  '2. Execute: npm run dev (para iniciar o servidor de desenvolvimento)'
);
console.log('3. Acesse: http://localhost:8080 (frontend)');
console.log('4. Acesse: http://localhost:3001/api/health (backend)');
console.log('');
console.log('⚠️ Nota: O banco de dados está desabilitado. Para habilitar:');
console.log('   - Instale o PostgreSQL');
console.log('   - Execute: bash scripts/fix-database-connection.sh');
console.log('   - Remova a linha DISABLE_DATABASE=true do arquivo .env');
console.log('');
