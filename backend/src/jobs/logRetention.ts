import { prisma } from '../index'
import { logInfo, logError } from '../config/logger'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Job para arquivar logs antigos
 * Recomendação: Executar diariamente via cron
 */

interface LogRetentionConfig {
  retentionDays: number // Dias para manter logs ativos
  archivePath: string // Caminho para arquivar logs
  batchSize: number // Tamanho do lote para processar
}

const defaultConfig: LogRetentionConfig = {
  retentionDays: 365, // 1 ano
  archivePath: path.join(__dirname, '../../archives/logs'),
  batchSize: 1000,
}

/**
 * Arquivar logs antigos
 */
export async function archiveOldLogs(
  config: Partial<LogRetentionConfig> = {}
): Promise<{
  archived: number
  deleted: number
  errors: number
}> {
  const finalConfig = { ...defaultConfig, ...config }
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - finalConfig.retentionDays)

  logInfo('🗄️ Iniciando arquivamento de logs', {
    cutoffDate: cutoffDate.toISOString(),
    retentionDays: finalConfig.retentionDays,
  })

  let archivedCount = 0
  let deletedCount = 0
  let errorCount = 0

  try {
    // Criar diretório de arquivos se não existir
    if (!fs.existsSync(finalConfig.archivePath)) {
      fs.mkdirSync(finalConfig.archivePath, { recursive: true })
    }

    // Buscar logs antigos em lotes
    let hasMore = true
    while (hasMore) {
      const oldLogs = await prisma.activityLog.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
        take: finalConfig.batchSize,
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })

      if (oldLogs.length === 0) {
        hasMore = false
        break
      }

      // Arquivar em arquivo JSON
      const archiveFileName = `activitylogs_${new Date().toISOString().split('T')[0]}_batch_${archivedCount}.json`
      const archiveFilePath = path.join(finalConfig.archivePath, archiveFileName)

      try {
        fs.writeFileSync(archiveFilePath, JSON.stringify(oldLogs, null, 2))
        archivedCount += oldLogs.length

        // Deletar logs arquivados do banco
        const idsToDelete = oldLogs.map((log) => log.id)
        const deleteResult = await prisma.activityLog.deleteMany({
          where: {
            id: {
              in: idsToDelete,
            },
          },
        })

        deletedCount += deleteResult.count

        logInfo(`✅ Lote arquivado: ${oldLogs.length} logs`, {
          archiveFile: archiveFileName,
        })
      } catch (error) {
        logError('❌ Erro ao arquivar lote', error as Error, {
          batchSize: oldLogs.length,
        })
        errorCount += oldLogs.length
      }
    }

    logInfo('✅ Arquivamento de logs concluído', {
      archived: archivedCount,
      deleted: deletedCount,
      errors: errorCount,
    })

    return { archived: archivedCount, deleted: deletedCount, errors: errorCount }
  } catch (error) {
    logError('❌ Erro crítico no arquivamento de logs', error as Error)
    return { archived: archivedCount, deleted: deletedCount, errors: errorCount }
  }
}

/**
 * Deletar logs arquivados muito antigos (> 5 anos)
 */
export async function cleanupOldArchives(yearsToKeep: number = 5): Promise<number> {
  const archivePath = defaultConfig.archivePath
  
  if (!fs.existsSync(archivePath)) {
    return 0
  }

  const cutoffDate = new Date()
  cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsToKeep)
  
  const files = fs.readdirSync(archivePath)
  let deletedCount = 0

  for (const file of files) {
    if (!file.endsWith('.json')) continue

    const filePath = path.join(archivePath, file)
    const stats = fs.statSync(filePath)

    if (stats.mtime < cutoffDate) {
      try {
        fs.unlinkSync(filePath)
        deletedCount++
        logInfo(`🗑️ Arquivo antigo deletado: ${file}`)
      } catch (error) {
        logError(`❌ Erro ao deletar arquivo: ${file}`, error as Error)
      }
    }
  }

  return deletedCount
}

/**
 * Estatísticas de logs
 */
export async function getLogStatistics(): Promise<{
  total: number
  byAction: Record<string, number>
  byUser: Record<string, number>
  oldestLog: Date | null
  newestLog: Date | null
}> {
  const total = await prisma.activityLog.count()

  const byActionRaw = await prisma.activityLog.groupBy({
    by: ['action'],
    _count: true,
  })

  const byAction: Record<string, number> = {}
  byActionRaw.forEach((item) => {
    byAction[item.action] = item._count
  })

  const oldest = await prisma.activityLog.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  })

  const newest = await prisma.activityLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  return {
    total,
    byAction,
    byUser: {},
    oldestLog: oldest?.createdAt || null,
    newestLog: newest?.createdAt || null,
  }
}

/**
 * Endpoint para executar manualmente (via CLI ou API)
 */
if (require.main === module) {
  archiveOldLogs()
    .then((result) => {
      console.log('✅ Arquivamento concluído:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro:', error)
      process.exit(1)
    })
}

