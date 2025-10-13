// ⚠️ DEPRECATED: Este arquivo será substituído pelo novo database.ts
// Mantido apenas para compatibilidade temporária
// Use: import { prisma } from '../config/database' nos novos arquivos

import { PrismaClient } from '@prisma/client'

// Inicializar Prisma Client
// ✅ Logs reduzidos em produção para melhor performance e segurança
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error']  // Apenas erros em produção
    : ['query', 'info', 'warn', 'error'],  // Todos em desenvolvimento
})

// ⚠️ Migração para o novo sistema:
// O arquivo config/database.ts possui connection pooling otimizado e monitoring
// Gradualmente migrar imports para o novo arquivo

