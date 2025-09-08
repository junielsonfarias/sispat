#!/usr/bin/env node

/**
 * Script de monitoramento de memória para SISPAT
 * Monitora processos Node.js e sugere limpezas quando necessário
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const MAX_MEMORY_MB = 500; // Limite máximo de memória em MB
const MAX_PROCESSES = 5; // Limite máximo de processos Node.js
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
 * Obter informações dos processos Node.js
 */
function getNodeProcesses() {
  return new Promise((resolve, reject) => {
    exec(
      'tasklist /FI "IMAGENAME eq node.exe" /FO CSV',
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n').slice(1); // Remove header
        const processes = [];

        for (const line of lines) {
          if (line.trim()) {
            const parts = line.split(',').map(part => part.replace(/"/g, ''));
            if (parts.length >= 5) {
              processes.push({
                name: parts[0],
                pid: parts[1],
                session: parts[2],
                sessionNumber: parts[3],
                memory: parts[4],
              });
            }
          }
        }

        resolve(processes);
      }
    );
  });
}

/**
 * Calcular total de memória em MB
 */
function calculateTotalMemory(processes) {
  let totalKB = 0;

  for (const process of processes) {
    const memoryStr = process.memory.replace(/[^\d]/g, '');
    const memoryKB = parseInt(memoryStr) || 0;
    totalKB += memoryKB;
  }

  return Math.round(totalKB / 1024); // Converter para MB
}

/**
 * Sugerir limpeza de processos
 */
function suggestCleanup(processes, totalMemoryMB) {
  const suggestions = [];

  if (processes.length > MAX_PROCESSES) {
    suggestions.push(
      `⚠️  Muitos processos Node.js (${processes.length}/${MAX_PROCESSES})`
    );
  }

  if (totalMemoryMB > MAX_MEMORY_MB) {
    suggestions.push(
      `⚠️  Alto consumo de memória (${totalMemoryMB}MB/${MAX_MEMORY_MB}MB)`
    );
  }

  if (suggestions.length > 0) {
    log('🚨 ALERTAS DE PERFORMANCE:');
    suggestions.forEach(suggestion => log(suggestion));
    log(
      '💡 Sugestão: Execute "node scripts/cleanup-memory.js" para limpeza automática'
    );
  }

  return suggestions.length > 0;
}

/**
 * Função principal
 */
async function monitorMemory() {
  try {
    log('🔍 Iniciando monitoramento de memória...');

    const processes = await getNodeProcesses();
    const totalMemoryMB = calculateTotalMemory(processes);

    log(`📊 Status atual:`);
    log(`   - Processos Node.js: ${processes.length}`);
    log(`   - Memória total: ${totalMemoryMB}MB`);

    // Mostrar processos individuais
    if (processes.length > 0) {
      log('📋 Processos ativos:');
      processes.forEach(process => {
        const memoryMB = Math.round(
          parseInt(process.memory.replace(/[^\d]/g, '')) / 1024
        );
        log(`   - PID ${process.pid}: ${memoryMB}MB`);
      });
    }

    // Verificar se precisa de limpeza
    const needsCleanup = suggestCleanup(processes, totalMemoryMB);

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
