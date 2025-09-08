#!/usr/bin/env node

/**
 * Script de limpeza automática de memória para SISPAT - Versão Linux/VPS
 * Remove processos Node.js desnecessários mantendo apenas os essenciais
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const LOG_FILE = path.join(__dirname, '../logs/memory-cleanup.log');

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
 * Obter processos Node.js essenciais (que estão usando portas)
 */
function getEssentialProcesses() {
  return new Promise((resolve, reject) => {
    exec('netstat -tlnp | grep -E ":(3001|8080)"', (error, stdout, stderr) => {
      if (error) {
        resolve([]); // Se não encontrar, retorna array vazio
        return;
      }

      const essentialPids = new Set();
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (line.includes(':3001') || line.includes(':8080')) {
          const match = line.match(/\d+\/(\w+)/);
          if (match) {
            const pid = match[1];
            if (pid && !isNaN(pid)) {
              essentialPids.add(pid);
            }
          }
        }
      }

      resolve(Array.from(essentialPids));
    });
  });
}

/**
 * Obter todos os processos Node.js
 */
function getAllNodeProcesses() {
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
 * Finalizar processo por PID
 */
function killProcess(pid) {
  return new Promise((resolve, reject) => {
    exec(`kill -9 ${pid}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Limpar cache do sistema
 */
function clearSystemCache() {
  return new Promise((resolve, reject) => {
    exec(
      'sync && echo 3 > /proc/sys/vm/drop_caches',
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      }
    );
  });
}

/**
 * Limpar logs antigos
 */
function cleanOldLogs() {
  return new Promise((resolve, reject) => {
    const logDir = path.join(__dirname, '../logs');
    const command = `find ${logDir} -name "*.log" -mtime +7 -delete`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Função principal de limpeza
 */
async function cleanupMemory() {
  try {
    log('🧹 Iniciando limpeza de memória (Linux/VPS)...');

    // Obter processos essenciais
    const essentialPids = await getEssentialProcesses();
    log(`🔒 Processos essenciais detectados: ${essentialPids.join(', ')}`);

    // Obter todos os processos Node.js
    const allProcesses = await getAllNodeProcesses();
    log(`📊 Total de processos Node.js: ${allProcesses.length}`);

    // Identificar processos para remoção
    const processesToKill = allProcesses.filter(
      process => !essentialPids.includes(process.pid)
    );

    if (processesToKill.length === 0) {
      log('✅ Nenhum processo desnecessário encontrado');
    } else {
      log(`🎯 Processos para remoção: ${processesToKill.length}`);

      // Finalizar processos
      let killedCount = 0;
      for (const process of processesToKill) {
        try {
          await killProcess(process.pid);
          log(
            `✅ Processo ${process.pid} finalizado (${process.mem}% mem liberada)`
          );
          killedCount++;
        } catch (error) {
          log(`❌ Erro ao finalizar processo ${process.pid}: ${error.message}`);
        }
      }

      log(
        `🏁 Limpeza de processos concluída: ${killedCount}/${processesToKill.length} processos finalizados`
      );
    }

    // Limpar cache do sistema
    try {
      await clearSystemCache();
      log('✅ Cache do sistema limpo');
    } catch (error) {
      log(`⚠️  Erro ao limpar cache do sistema: ${error.message}`);
    }

    // Limpar logs antigos
    try {
      await cleanOldLogs();
      log('✅ Logs antigos removidos');
    } catch (error) {
      log(`⚠️  Erro ao limpar logs antigos: ${error.message}`);
    }

    log('🏁 Limpeza completa concluída');
  } catch (error) {
    log(`❌ Erro na limpeza: ${error.message}`);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupMemory();
}

export { cleanupMemory, getEssentialProcesses, getAllNodeProcesses };
