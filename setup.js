#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 SISPAT - Setup Inicial');
console.log('========================');

// Verificar se o arquivo .env existe
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Criando arquivo .env...');

  const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=sispat_jwt_secret_key_2024_very_secure_and_long
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# Email Configuration (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env criado com configurações padrão');
  console.log(
    '⚠️  IMPORTANTE: Configure as variáveis de ambiente no arquivo .env antes de continuar'
  );
  console.log('   Especialmente as configurações do banco de dados PostgreSQL');
  console.log('');
}

// Verificar se a pasta uploads existe
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  console.log('📁 Criando pasta uploads...');
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Pasta uploads criada');
}

// Verificar se o PostgreSQL está rodando
console.log('🔍 Verificando conexão com PostgreSQL...');
try {
  // Tentar executar um comando simples do PostgreSQL
  execSync('psql --version', { stdio: 'pipe' });
  console.log('✅ PostgreSQL encontrado');
} catch (error) {
  console.log('❌ PostgreSQL não encontrado ou não está no PATH');
  console.log(
    '   Por favor, instale o PostgreSQL e certifique-se de que está rodando'
  );
  console.log('   https://www.postgresql.org/download/');
  process.exit(1);
}

console.log('');
console.log('📋 Próximos passos:');
console.log(
  '1. Configure o arquivo .env com suas configurações do banco de dados'
);
console.log('2. Execute: pnpm run db:migrate');
console.log('3. Execute: pnpm run db:seed');
console.log('4. Execute: pnpm run dev');
console.log('');
console.log('🌐 O sistema estará disponível em:');
console.log('   Frontend: http://localhost:8080');
console.log('   Backend:  http://localhost:3001/api');
console.log('');
console.log('👤 Login inicial:');
console.log('   Email: junielsonfarias@gmail.com');
console.log('   Senha: Tiko6273@');
console.log('');

console.log('🎉 Setup concluído!');
