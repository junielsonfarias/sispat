#!/usr/bin/env node

/**
 * Script para iniciar desenvolvimento do SISPAT
 * Configura ambiente e inicia frontend e backend
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Iniciando SISPAT em modo desenvolvimento...\n');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: msg => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: msg =>
    console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

// Verificar se .env existe
const envPath = path.join(projectRoot, '.env');
if (!fs.existsSync(envPath)) {
  log.error('Arquivo .env não encontrado!');
  log.info('Copiando env.example para .env...');

  try {
    const envExample = fs.readFileSync(
      path.join(projectRoot, 'env.example'),
      'utf8'
    );
    fs.writeFileSync(envPath, envExample);
    log.success('Arquivo .env criado!');
  } catch (error) {
    log.error(`Erro ao criar .env: ${error.message}`);
    process.exit(1);
  }
}

// Verificar configuração de desenvolvimento
log.header('🔧 Verificando configuração...');

try {
  const envContent = fs.readFileSync(envPath, 'utf8');

  if (!envContent.includes('DISABLE_DATABASE=true')) {
    log.warning('Banco de dados não está desabilitado para desenvolvimento');
    log.info('Executando correção automática...');

    // Executar script de correção
    const { execSync } = require('child_process');
    execSync('node scripts/fix-development-setup.js', { stdio: 'inherit' });
    log.success('Configuração corrigida!');
  } else {
    log.success('Configuração de desenvolvimento OK');
  }
} catch (error) {
  log.error(`Erro ao verificar configuração: ${error.message}`);
}

// Função para iniciar processo
function startProcess(command, args, name, color) {
  log.header(`🚀 Iniciando ${name}...`);

  const process = spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });

  process.on('error', error => {
    log.error(`Erro ao iniciar ${name}: ${error.message}`);
  });

  process.on('exit', code => {
    if (code !== 0) {
      log.error(`${name} finalizado com código ${code}`);
    }
  });

  return process;
}

// Iniciar backend
log.header('🎯 Iniciando Backend...');
const backend = startProcess(
  'npm',
  ['run', 'dev:backend'],
  'Backend',
  colors.blue
);

// Aguardar um pouco para o backend inicializar
setTimeout(() => {
  log.header('🎯 Iniciando Frontend...');
  const frontend = startProcess(
    'npm',
    ['run', 'dev:frontend'],
    'Frontend',
    colors.green
  );

  // Mostrar informações de acesso
  setTimeout(() => {
    log.header('🎉 SISPAT Iniciado com Sucesso!');
    console.log(`\n${colors.cyan}📋 INFORMAÇÕES DE ACESSO:${colors.reset}`);
    console.log(
      `🌐 Frontend: ${colors.yellow}http://localhost:8080${colors.reset}`
    );
    console.log(
      `🔧 Backend:  ${colors.yellow}http://localhost:3001${colors.reset}`
    );
    console.log(
      `📊 API:      ${colors.yellow}http://localhost:3001/api${colors.reset}`
    );

    console.log(`\n${colors.cyan}🔑 LOGIN PADRÃO:${colors.reset}`);
    console.log(`📧 Email: ${colors.yellow}admin@sispat.com${colors.reset}`);
    console.log(`🔒 Senha: ${colors.yellow}admin123${colors.reset}`);

    console.log(`\n${colors.cyan}🛠️  COMANDOS ÚTEIS:${colors.reset}`);
    console.log(
      `📊 Status: ${colors.yellow}netstat -an | findstr :3001${colors.reset}`
    );
    console.log(
      `🔍 Logs:   ${colors.yellow}Get-Content logs/error.log -Tail 10${colors.reset}`
    );
    console.log(
      `🔄 Restart: ${colors.yellow}Ctrl+C e execute novamente${colors.reset}`
    );

    console.log(
      `\n${colors.green}✅ Sistema funcionando em modo desenvolvimento (sem banco de dados)${colors.reset}`
    );
    console.log(
      `${colors.blue}💡 Para usar com banco de dados, configure PostgreSQL e altere DISABLE_DATABASE=false${colors.reset}\n`
    );
  }, 3000);
}, 2000);

// Tratar interrupção
process.on('SIGINT', () => {
  log.warning('\n🛑 Parando SISPAT...');
  backend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.warning('\n🛑 Parando SISPAT...');
  backend.kill();
  process.exit(0);
});
