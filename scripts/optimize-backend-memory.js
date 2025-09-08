#!/usr/bin/env node

/**
 * Script para otimização de memória do backend SISPAT
 * Resolve problemas de uso alto de memória e taxa de erro
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Iniciando otimização de memória do backend...');

// 1. Verificar configurações do PM2
const ecosystemPath = path.join(process.cwd(), 'ecosystem.config.cjs');
if (fs.existsSync(ecosystemPath)) {
  console.log('📋 Verificando configuração do PM2...');

  let ecosystemContent = fs.readFileSync(ecosystemPath, 'utf8');

  // Adicionar configurações de otimização de memória
  const memoryOptimizations = `
    // Configurações de otimização de memória
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=512 --optimize-for-size',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
  `;

  // Verificar se as otimizações já existem
  if (!ecosystemContent.includes('max_memory_restart')) {
    ecosystemContent = ecosystemContent.replace(
      /(min_uptime: ['"]10s['"],)/,
      `$1${memoryOptimizations}`
    );

    fs.writeFileSync(ecosystemPath, ecosystemContent);
    console.log('✅ Configurações de memória adicionadas ao PM2');
  } else {
    console.log('✅ Configurações de memória já existem');
  }
} else {
  console.log('⚠️ Arquivo ecosystem.config.cjs não encontrado');
}

// 2. Criar script de limpeza de memória
const memoryCleanupScript = `#!/bin/bash
# Script de limpeza de memória para SISPAT

echo "🧹 Iniciando limpeza de memória..."

# Limpar cache do Node.js
if command -v pm2 &> /dev/null; then
  echo "📊 Status atual do PM2:"
  pm2 list
  
  echo "🔄 Reiniciando aplicação com limpeza de memória..."
  pm2 restart all --update-env
  
  echo "⏳ Aguardando estabilização..."
  sleep 10
  
  echo "📊 Status após limpeza:"
  pm2 list
else
  echo "⚠️ PM2 não encontrado"
fi

# Limpar cache do sistema (Linux)
if command -v sync &> /dev/null; then
  echo "💾 Sincronizando cache do sistema..."
  sync
  echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo "⚠️ Não foi possível limpar cache do sistema"
fi

echo "✅ Limpeza de memória concluída!"
`;

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'cleanup-memory.sh'),
  memoryCleanupScript
);
fs.chmodSync(path.join(process.cwd(), 'scripts', 'cleanup-memory.sh'), '755');

console.log('✅ Script de limpeza de memória criado');

// 3. Criar configuração de monitoramento
const monitoringConfig = `{
  "apps": [
    {
      "name": "sispat-backend",
      "script": "server/index.js",
      "instances": 1,
      "exec_mode": "fork",
      "max_memory_restart": "512M",
      "node_args": "--max-old-space-size=512 --optimize-for-size",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3001
      },
      "log_file": "./logs/combined.log",
      "out_file": "./logs/out.log",
      "error_file": "./logs/err.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "min_uptime": "10s",
      "max_restarts": 10,
      "restart_delay": 4000,
      "autorestart": true,
      "watch": false,
      "ignore_watch": ["node_modules", "logs", "uploads", "backups"],
      "source_map_support": false,
      "kill_timeout": 5000,
      "wait_ready": true,
      "listen_timeout": 10000
    }
  ]
}`;

fs.writeFileSync(
  path.join(process.cwd(), 'ecosystem.optimized.cjs'),
  monitoringConfig
);
console.log(
  '✅ Configuração otimizada do PM2 criada (ecosystem.optimized.cjs)'
);

// 4. Criar script de diagnóstico de memória
const diagnosticScript = `#!/usr/bin/env node

/**
 * Script de diagnóstico de memória para SISPAT
 */

import os from 'os';

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function getMemoryInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    total: formatBytes(totalMem),
    used: formatBytes(usedMem),
    free: formatBytes(freeMem),
    usage: ((usedMem / totalMem) * 100).toFixed(2) + '%'
  };
}

function getProcessInfo() {
  const memUsage = process.memoryUsage();
  return {
    rss: formatBytes(memUsage.rss),
    heapTotal: formatBytes(memUsage.heapTotal),
    heapUsed: formatBytes(memUsage.heapUsed),
    external: formatBytes(memUsage.external)
  };
}

console.log('📊 DIAGNÓSTICO DE MEMÓRIA - SISPAT');
console.log('=====================================');
console.log('');

console.log('🖥️ Sistema:');
const sysMem = getMemoryInfo();
console.log(\`  Total: \${sysMem.total}\`);
console.log(\`  Usado: \${sysMem.used} (\${sysMem.usage})\`);
console.log(\`  Livre: \${sysMem.free}\`);
console.log('');

console.log('⚙️ Processo Node.js:');
const procMem = getProcessInfo();
console.log(\`  RSS: \${procMem.rss}\`);
console.log(\`  Heap Total: \${procMem.heapTotal}\`);
console.log(\`  Heap Usado: \${procMem.heapUsed}\`);
console.log(\`  External: \${procMem.external}\`);
console.log('');

// Verificar se há vazamentos de memória
const heapUsed = process.memoryUsage().heapUsed;
if (heapUsed > 200 * 1024 * 1024) { // 200MB
  console.log('⚠️ ALERTA: Uso de heap alto detectado!');
  console.log('💡 Recomendações:');
  console.log('   - Reiniciar a aplicação');
  console.log('   - Verificar vazamentos de memória');
  console.log('   - Otimizar queries de banco de dados');
} else {
  console.log('✅ Uso de memória dentro do normal');
}

console.log('');
console.log('🔄 Para limpar memória, execute: ./scripts/cleanup-memory.sh');
`;

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'diagnose-memory.js'),
  diagnosticScript
);
fs.chmodSync(path.join(process.cwd(), 'scripts', 'diagnose-memory.js'), '755');

console.log('✅ Script de diagnóstico de memória criado');

// 5. Criar script de otimização de banco de dados
const dbOptimizationScript = `#!/bin/bash
# Script de otimização de banco de dados para SISPAT

echo "🗄️ Iniciando otimização do banco de dados..."

# Verificar se PostgreSQL está rodando
if ! systemctl is-active --quiet postgresql; then
  echo "❌ PostgreSQL não está rodando"
  exit 1
fi

echo "📊 Estatísticas do banco antes da otimização:"
sudo -u postgres psql -d sispat_production -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
ORDER BY n_dead_tup DESC 
LIMIT 10;
"

echo "🧹 Executando VACUUM ANALYZE..."
sudo -u postgres psql -d sispat_production -c "VACUUM ANALYZE;"

echo "📊 Estatísticas do banco após otimização:"
sudo -u postgres psql -d sispat_production -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
ORDER BY n_dead_tup DESC 
LIMIT 10;
"

echo "✅ Otimização do banco de dados concluída!"
`;

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'optimize-database.sh'),
  dbOptimizationScript
);
fs.chmodSync(
  path.join(process.cwd(), 'scripts', 'optimize-database.sh'),
  '755'
);

console.log('✅ Script de otimização de banco de dados criado');

console.log('');
console.log('🎉 OTIMIZAÇÃO DE MEMÓRIA CONCLUÍDA!');
console.log('=====================================');
console.log('');
console.log('📋 Scripts criados:');
console.log('  - scripts/cleanup-memory.sh (limpeza de memória)');
console.log('  - scripts/diagnose-memory.js (diagnóstico)');
console.log('  - scripts/optimize-database.sh (otimização do banco)');
console.log('  - ecosystem.optimized.cjs (configuração otimizada)');
console.log('');
console.log('🚀 Próximos passos:');
console.log('  1. Execute: node scripts/diagnose-memory.js');
console.log('  2. Se necessário: ./scripts/cleanup-memory.sh');
console.log('  3. Para otimizar banco: ./scripts/optimize-database.sh');
console.log('  4. Use ecosystem.optimized.cjs para produção');
console.log('');
console.log('💡 Dicas de monitoramento:');
console.log('  - Monitore logs: pm2 logs');
console.log('  - Status: pm2 status');
console.log('  - Reinicie se uso > 80%: pm2 restart all');
