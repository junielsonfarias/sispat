#!/usr/bin/env node

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
    usage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
  };
}

function getProcessInfo() {
  const memUsage = process.memoryUsage();
  return {
    rss: formatBytes(memUsage.rss),
    heapTotal: formatBytes(memUsage.heapTotal),
    heapUsed: formatBytes(memUsage.heapUsed),
    external: formatBytes(memUsage.external),
  };
}

console.log('📊 DIAGNÓSTICO DE MEMÓRIA - SISPAT');
console.log('=====================================');
console.log('');

console.log('🖥️ Sistema:');
const sysMem = getMemoryInfo();
console.log(`  Total: ${sysMem.total}`);
console.log(`  Usado: ${sysMem.used} (${sysMem.usage})`);
console.log(`  Livre: ${sysMem.free}`);
console.log('');

console.log('⚙️ Processo Node.js:');
const procMem = getProcessInfo();
console.log(`  RSS: ${procMem.rss}`);
console.log(`  Heap Total: ${procMem.heapTotal}`);
console.log(`  Heap Usado: ${procMem.heapUsed}`);
console.log(`  External: ${procMem.external}`);
console.log('');

// Verificar se há vazamentos de memória
const heapUsed = process.memoryUsage().heapUsed;
if (heapUsed > 200 * 1024 * 1024) {
  // 200MB
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
