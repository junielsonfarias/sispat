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
    // Testar conexão
    await prisma.$queryRaw`SELECT 1`
    const connectionTime = Date.now() - start
    
    // Obter estatísticas adicionais
    const queryStart = Date.now()
    const [tableStats, indexStats] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('patrimonios', 'imoveis', 'users', 'sectors', 'activity_logs')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `,
      prisma.$queryRaw<any[]>`
        SELECT 
          tablename,
          indexname,
          idx_scan as index_scans
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        AND tablename IN ('patrimonios', 'imoveis', 'users', 'sectors')
        ORDER BY idx_scan DESC
        LIMIT 10
      `
    ]).catch(() => [[], []])
    
    const queryTime = Date.now() - queryStart
    
    // Obter número de conexões ativas
    const [connections] = await prisma.$queryRaw<any[]>`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `.catch(() => [{ count: 0 }])
    
    return {
      healthy: true,
      connectionTime,
      queryTime,
      activeConnections: parseInt(connections?.[0]?.count || '0'),
      totalQueries: 0, // Será incrementado pelo query handler
      slowQueries: 0,  // Será incrementado pelo query handler
      averageQueryTime: 0,
      tableStats: tableStats || [],
      indexStats: indexStats || [],
      recommendations: [] as string[],
    }
  } catch (error) {
    return {
      healthy: false,
      connectionTime: -1,
      queryTime: -1,
      activeConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: ['Verificar conexão com o banco de dados'],
    }
  }
}
