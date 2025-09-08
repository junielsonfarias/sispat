#!/usr/bin/env node

/**
 * Script de limpeza automática de memória para SISPAT
 * Remove processos Node.js desnecessários mantendo apenas os essenciais
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const ESSENTIAL_PROCESSES = []; // PIDs dos processos essenciais (serão detectados automaticamente)
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
    exec('netstat -ano | findstr ":3001 :8080"', (error, stdout, stderr) => {
      if (error) {
        resolve([]); // Se não encontrar, retorna array vazio
        return;
      }

      const essentialPids = new Set();
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (line.includes(':3001') || line.includes(':8080')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
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
 * Finalizar processo por PID
 */
function killProcess(pid) {
  return new Promise((resolve, reject) => {
    exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
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
    log('🧹 Iniciando limpeza de memória...');

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
      return;
    }

    log(`🎯 Processos para remoção: ${processesToKill.length}`);

    // Calcular memória que será liberada
    let totalMemoryToFree = 0;
    processesToKill.forEach(process => {
      const memoryStr = process.memory.replace(/[^\d]/g, '');
      const memoryKB = parseInt(memoryStr) || 0;
      totalMemoryToFree += memoryKB;
    });

    const memoryToFreeMB = Math.round(totalMemoryToFree / 1024);
    log(`💾 Memória a ser liberada: ${memoryToFreeMB}MB`);

    // Finalizar processos
    let killedCount = 0;
    for (const process of processesToKill) {
      try {
        await killProcess(process.pid);
        const memoryMB = Math.round(
          parseInt(process.memory.replace(/[^\d]/g, '')) / 1024
        );
        log(`✅ Processo ${process.pid} finalizado (${memoryMB}MB liberados)`);
        killedCount++;
      } catch (error) {
        log(`❌ Erro ao finalizar processo ${process.pid}: ${error.message}`);
      }
    }

    log(
      `🏁 Limpeza concluída: ${killedCount}/${processesToKill.length} processos finalizados`
    );
    log(`💾 Total de memória liberada: ${memoryToFreeMB}MB`);
  } catch (error) {
    log(`❌ Erro na limpeza: ${error.message}`);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupMemory();
}

export { cleanupMemory, getAllNodeProcesses, getEssentialProcesses };
