#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando backend...');

// Usar ts-node diretamente
const child = spawn('npx', ['ts-node', 'src/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('❌ Erro ao iniciar backend:', error);
});

child.on('close', (code) => {
  console.log(`Backend finalizado com código ${code}`);
});

// Capturar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Finalizando backend...');
  child.kill('SIGINT');
  process.exit(0);
});
