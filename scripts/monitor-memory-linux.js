#!/usr/bin/env node

/**
 * Script de monitoramento de memória para SISPAT - Versão Linux/VPS
 * Monitora processos Node.js e sugere limpezas quando necessário
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const MAX_MEMORY_MB = 1000; // Limite máximo de memória em MB para VPS
const MAX_PROCESSES = 10; // Limite máximo de processos Node.js
const LOG_FILE = path.join(__dirname, '../logs/memory-monitor.log');

/**
 * Log com timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  console.log(logMessage.trim());

  // Salvar no arquivo de log
  fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * Obter informações dos processos Node.js (Linux)
 */
function getNodeProcesses() {
  return new Promise((resolve, reject) => {
    exec('ps aux | grep node | grep -v grep', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const lines = stdout.split('\n').filter(line => line.trim());
      const processes = [];

      for (const line of lines) {
        if (line.trim()) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 11) {
            processes.push({
              user: parts[0],
              pid: parts[1],
              cpu: parts[2],
              mem: parts[3],
              vsz: parts[4],
              rss: parts[5],
              tty: parts[6],
              stat: parts[7],
              start: parts[8],
              time: parts[9],
              command: parts.slice(10).join(' '),
            });
          }
        }
      }

      resolve(processes);
    });
  });
}

/**
 * Obter uso de memória do sistema
 */
function getSystemMemory() {
  return new Promise((resolve, reject) => {
    exec('free -m', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const lines = stdout.split('\n');
      const memLine = lines[1].split(/\s+/);
      const swapLine = lines[2].split(/\s+/);

      resolve({
        total: parseInt(memLine[1]),
        used: parseInt(memLine[2]),
        free: parseInt(memLine[3]),
        shared: parseInt(memLine[4]),
        cache: parseInt(memLine[5]),
        available: parseInt(memLine[6]),
        swapTotal: parseInt(swapLine[1]),
        swapUsed: parseInt(swapLine[2]),
        swapFree: parseInt(swapLine[3]),
      });
    });
  });
}

/**
 * Obter informações de CPU
 */
function getCpuInfo() {
  return new Promise((resolve, reject) => {
    exec('top -bn1 | grep "Cpu(s)"', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const match = stdout.match(/(\d+\.\d+)%us/);
      const cpuUsage = match ? parseFloat(match[1]) : 0;

      resolve({ usage: cpuUsage });
    });
  });
}

/**
 * Obter informações de disco
 */
function getDiskInfo() {
  return new Promise((resolve, reject) => {
    exec('df -h /', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const lines = stdout.split('\n');
      const diskLine = lines[1].split(/\s+/);

      resolve({
        filesystem: diskLine[0],
        size: diskLine[1],
        used: diskLine[2],
        available: diskLine[3],
        usePercent: diskLine[4],
        mounted: diskLine[5],
      });
    });
  });
}

/**
 * Calcular total de memória em MB
 */
function calculateTotalMemory(processes) {
  let totalMB = 0;

  for (const process of processes) {
    const memPercent = parseFloat(process.mem) || 0;
    // Estimativa baseada na porcentagem de memória
    totalMB += memPercent * 0.1; // Aproximação
  }

  return Math.round(totalMB);
}

/**
 * Sugerir limpeza de processos
 */
function suggestCleanup(processes, totalMemoryMB, systemMem) {
  const suggestions = [];

  if (processes.length > MAX_PROCESSES) {
    suggestions.push(
      `⚠️  Muitos processos Node.js (${processes.length}/${MAX_PROCESSES})`
    );
  }

  if (totalMemoryMB > MAX_MEMORY_MB) {
    suggestions.push(
      `⚠️  Alto consumo de memória Node.js (${totalMemoryMB}MB/${MAX_MEMORY_MB}MB)`
    );
  }

  if (systemMem.used / systemMem.total > 0.8) {
    suggestions.push(
      `⚠️  Alto uso de memória do sistema (${Math.round((systemMem.used / systemMem.total) * 100)}%)`
    );
  }

  if (systemMem.swapUsed > 0) {
    suggestions.push(`⚠️  Sistema usando swap (${systemMem.swapUsed}MB)`);
  }

  if (suggestions.length > 0) {
    log('🚨 ALERTAS DE PERFORMANCE:');
    suggestions.forEach(suggestion => log(suggestion));
    log(
      '💡 Sugestão: Execute "node scripts/cleanup-memory-linux.js" para limpeza automática'
    );
  }

  return suggestions.length > 0;
}

/**
 * Função principal
 */
async function monitorMemory() {
  try {
    log('🔍 Iniciando monitoramento de memória (Linux/VPS)...');

    const processes = await getNodeProcesses();
    const totalMemoryMB = calculateTotalMemory(processes);
    const systemMem = await getSystemMemory();
    const cpuInfo = await getCpuInfo();
    const diskInfo = await getDiskInfo();

    log(`📊 Status do sistema:`);
    log(`   - Processos Node.js: ${processes.length}`);
    log(`   - Memória Node.js: ${totalMemoryMB}MB`);
    log(`   - Memória total: ${systemMem.total}MB`);
    log(
      `   - Memória usada: ${systemMem.used}MB (${Math.round((systemMem.used / systemMem.total) * 100)}%)`
    );
    log(`   - Memória disponível: ${systemMem.available}MB`);
    log(`   - CPU: ${cpuInfo.usage}%`);
    log(
      `   - Disco: ${diskInfo.used}/${diskInfo.size} (${diskInfo.usePercent})`
    );

    // Mostrar processos individuais
    if (processes.length > 0) {
      log('📋 Processos Node.js ativos:');
      processes.forEach(process => {
        log(
          `   - PID ${process.pid}: ${process.mem}% mem, ${process.cpu}% CPU - ${process.command.substring(0, 50)}...`
        );
      });
    }

    // Verificar se precisa de limpeza
    const needsCleanup = suggestCleanup(processes, totalMemoryMB, systemMem);

    if (!needsCleanup) {
      log('✅ Sistema otimizado - sem necessidade de limpeza');
    }

    log('🏁 Monitoramento concluído');
  } catch (error) {
    log(`❌ Erro no monitoramento: ${error.message}`);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  monitorMemory();
}

export { calculateTotalMemory, getNodeProcesses, monitorMemory };
