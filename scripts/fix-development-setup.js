#!/usr/bin/env node

/**
 * Script para corrigir configuração de desenvolvimento
 * Desabilita banco de dados e configura modo de desenvolvimento
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Corrigindo configuração de desenvolvimento...');

// Ler arquivo .env
const envPath = path.join(projectRoot, '.env');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('❌ Erro ao ler arquivo .env:', error.message);
  process.exit(1);
}

// Modificar configurações
let modified = false;

// Desabilitar banco de dados
if (envContent.includes('DISABLE_DATABASE=false')) {
  envContent = envContent.replace(
    'DISABLE_DATABASE=false',
    'DISABLE_DATABASE=true'
  );
  modified = true;
  console.log('✅ Banco de dados desabilitado para desenvolvimento');
}

// Configurar SSL como false para desenvolvimento
if (envContent.includes('DB_SSL_REJECT_UNAUTHORIZED=false')) {
  // Já está correto
  console.log('✅ SSL já configurado como false');
} else {
  // Adicionar configuração SSL
  envContent += '\n# SSL Configuration\nDB_SSL_REJECT_UNAUTHORIZED=false\n';
  modified = true;
  console.log('✅ Configuração SSL adicionada');
}

// Salvar arquivo modificado
if (modified) {
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Arquivo .env atualizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao salvar arquivo .env:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️ Nenhuma modificação necessária');
}

console.log('\n🎉 Configuração de desenvolvimento corrigida!');
console.log('💡 Agora você pode executar: npm run dev');
console.log(
  '⚠️ O sistema funcionará sem banco de dados (modo desenvolvimento)'
);
