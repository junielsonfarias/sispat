import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testando carregamento de variáveis de ambiente...');
console.log('📁 Diretório atual:', __dirname);
console.log('📁 Diretório raiz:', join(__dirname, '..'));

// Tentar carregar .env da raiz
dotenv.config({ path: join(__dirname, '.env') });

console.log('✅ Variáveis carregadas:');
console.log('  - DB_HOST:', process.env.DB_HOST);
console.log('  - DB_PORT:', process.env.DB_PORT);
console.log('  - DB_NAME:', process.env.DB_NAME);
console.log('  - DB_USER:', process.env.DB_USER);
console.log('  - DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

// Verificar se as variáveis estão definidas
if (
  process.env.DB_HOST &&
  process.env.DB_PORT &&
  process.env.DB_NAME &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD
) {
  console.log('✅ Todas as variáveis do banco estão definidas');
} else {
  console.log('❌ Algumas variáveis do banco estão faltando');
}
