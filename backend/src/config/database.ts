import { PrismaClient } from '@prisma/client'

/**
 * Instância singleton do Prisma Client com connection pooling otimizado
 * 
 * Features:
 * - Connection pooling automático
 * - Slow query logging (queries > 1s)
 * - Alertas para queries muito lentas (> 3s)
 * - Graceful disconnect
 */

// Query event handler para logging de queries lentas
const queryEventHandler = (e: any) => {
  const duration = e.duration
  
  if (duration > 1000) {
    console.warn(`⚠️  Slow query detected (${duration}ms):`, e.query)
  }
  
  if (duration > 3000) {
    console.error(`🚨 Very slow query (${duration}ms):`, e.query)
    
    // Alertar no Sentry se configurado
    // TEMPORARIAMENTE DESABILITADO
    // if (process.env.SENTRY_DSN) {
    //   import('./sentry').then(({ captureMessage }) => {
    //     captureMessage(
    //       `Database query muito lento: ${duration}ms`,
    //       'warning'
    //     )
    //   })
    // }
  }
}

// Criar instância do Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn']
    : ['query', 'error', 'warn'],
})

// Registrar event handler para queries
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query' as any, queryEventHandler)
}

// Graceful shutdown
process.on('beforeExit', async () => {
  console.log('🔌 Desconectando do banco de dados...')
  await prisma.$disconnect()
})

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

// Handle SIGTERM
process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

/**
 * Testa a conexão com o banco de dados
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error)
    return false
  }
}

/**
 * Obtém estatísticas de performance do banco
 */
export const getDatabaseStats = async () => {
  const start = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start
    
    return {
      healthy: true,
      responseTimeMs: responseTime,
    }
  } catch (error) {
    return {
      healthy: false,
      responseTimeMs: -1,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
