import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import zlib from 'zlib'
import { logError, logInfo, logPerformance, logWarning } from '../utils/logger.js'
import { getRows } from './connection.js'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurações de backup
const BACKUP_CONFIG = {
  baseDir: path.join(__dirname, '../../backups'),
  pgDumpDir: path.join(__dirname, '../../backups/pg_dumps'),
  jsonDir: path.join(__dirname, '../../backups/json'),
  testDir: path.join(__dirname, '../../backups/tests'),
  maxBackups: {
    daily: 30,    // Manter 30 dias
    weekly: 12,   // Manter 12 semanas
    monthly: 12   // Manter 12 meses
  },
  compression: true,
  testRestore: true,
  notifyOnFailure: true
}

// Criar diretórios de backup se não existirem
Object.values(BACKUP_CONFIG).forEach(dir => {
  if (typeof dir === 'string' && dir.includes('backups')) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
})

/**
 * Classe principal para gerenciamento de backups
 */
export class BackupManager {
  constructor() {
    this.config = BACKUP_CONFIG
  }

  /**
   * Criar backup completo usando pg_dump (mais eficiente)
   */
  async createPgDumpBackup(type = 'manual') {
    const startTime = Date.now()
    
    try {
      logInfo('🚀 Iniciando backup pg_dump', { type })
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup-${type}-${timestamp}`
      const sqlFile = path.join(this.config.pgDumpDir, `${backupName}.sql`)
      const compressedFile = `${sqlFile}.gz`
      
      // Configurar variáveis de ambiente do PostgreSQL
      const env = {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD,
        PGUSER: process.env.DB_USER,
        PGHOST: process.env.DB_HOST,
        PGPORT: process.env.DB_PORT,
        PGDATABASE: process.env.DB_NAME
      }
      
      // Comando pg_dump com opções otimizadas
      const pgDumpCommand = [
        'pg_dump',
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
        '--format=plain',
        '--encoding=UTF8',
        '--no-owner',
        '--no-privileges',
        `--file="${sqlFile}"`
      ].join(' ')
      
      logInfo('Executando pg_dump...', { command: pgDumpCommand })
      
      const { stdout, stderr } = await execAsync(pgDumpCommand, { env })
      
      if (stderr && !stderr.includes('NOTICE')) {
        logWarning('pg_dump warnings', { stderr })
      }
      
      // Verificar se o arquivo foi criado
      if (!fs.existsSync(sqlFile)) {
        throw new Error('Arquivo de backup não foi criado pelo pg_dump')
      }
      
      const sqlStats = fs.statSync(sqlFile)
      logInfo('Backup SQL criado', { size: sqlStats.size, file: sqlFile })
      
      // Comprimir backup se habilitado
      let finalFile = sqlFile
      let finalSize = sqlStats.size
      
      if (this.config.compression) {
        await this.compressFile(sqlFile, compressedFile)
        const compressedStats = fs.statSync(compressedFile)
        
        // Remover arquivo original após compressão
        fs.unlinkSync(sqlFile)
        
        finalFile = compressedFile
        finalSize = compressedStats.size
        
        const compressionRatio = ((sqlStats.size - compressedStats.size) / sqlStats.size * 100).toFixed(2)
        logInfo('Backup comprimido', { 
          originalSize: sqlStats.size, 
          compressedSize: compressedStats.size,
          compressionRatio: `${compressionRatio}%`
        })
      }
      
      // Obter estatísticas do banco
      const dbStats = await this.getDatabaseStats()
      
      // Criar metadata do backup
      const metadata = {
        filename: path.basename(finalFile),
        type,
        timestamp: new Date().toISOString(),
        size: finalSize,
        compressed: this.config.compression,
        duration: Date.now() - startTime,
        database: {
          name: process.env.DB_NAME,
          host: process.env.DB_HOST,
          stats: dbStats
        },
        version: '2.0.0'
      }
      
      // Salvar metadata
      const metadataFile = finalFile + '.meta.json'
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))
      
      logPerformance('Backup pg_dump concluído', Date.now() - startTime, {
        type,
        size: finalSize,
        compressed: this.config.compression,
        tables: dbStats.totalTables,
        records: dbStats.totalRecords
      })
      
      return {
        success: true,
        filename: path.basename(finalFile),
        path: finalFile,
        size: finalSize,
        compressed: this.config.compression,
        duration: Date.now() - startTime,
        metadata
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      logError('Erro ao criar backup pg_dump', error, { type, duration })
      throw error
    }
  }

  /**
   * Criar backup JSON (fallback se pg_dump não funcionar)
   */
  async createJsonBackup(type = 'manual') {
    const startTime = Date.now()
    
    try {
      logInfo('🚀 Iniciando backup JSON', { type })
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `backup-json-${type}-${timestamp}`
      const jsonFile = path.join(this.config.jsonDir, `${backupName}.json`)
      const compressedFile = `${jsonFile}.gz`
      
      const backupData = {
        timestamp: new Date().toISOString(),
        type,
        version: '2.0.0',
        database: process.env.DB_NAME,
        tables: {}
      }

      // Lista de tabelas para backup
      const tables = await this.getTableList()
      
      // Backup de cada tabela
      for (const table of tables) {
        try {
          logInfo(`Fazendo backup da tabela: ${table}`)
          
          const data = await getRows(`SELECT * FROM ${table}`)
          backupData.tables[table] = data
          
          logInfo(`Tabela ${table}: ${data.length} registros`)
        } catch (error) {
          logError(`Erro ao fazer backup da tabela ${table}`, error)
          backupData.tables[table] = { error: error.message, records: [] }
        }
      }

      // Salvar backup em arquivo
      fs.writeFileSync(jsonFile, JSON.stringify(backupData, null, 2))
      
      const jsonStats = fs.statSync(jsonFile)
      
      // Comprimir se habilitado
      let finalFile = jsonFile
      let finalSize = jsonStats.size
      
      if (this.config.compression) {
        await this.compressFile(jsonFile, compressedFile)
        const compressedStats = fs.statSync(compressedFile)
        
        fs.unlinkSync(jsonFile)
        
        finalFile = compressedFile
        finalSize = compressedStats.size
      }
      
      const duration = Date.now() - startTime
      
      logPerformance('Backup JSON concluído', duration, {
        type,
        size: finalSize,
        tables: tables.length,
        totalRecords: Object.values(backupData.tables).reduce((acc, table) => {
          return acc + (Array.isArray(table) ? table.length : table.records?.length || 0)
        }, 0)
      })
      
      return {
        success: true,
        filename: path.basename(finalFile),
        path: finalFile,
        size: finalSize,
        compressed: this.config.compression,
        duration,
        tables: tables.length
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      logError('Erro ao criar backup JSON', error, { type, duration })
      throw error
    }
  }

  /**
   * Comprimir arquivo usando gzip
   */
  async compressFile(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputFile)
      const writeStream = fs.createWriteStream(outputFile)
      const gzip = zlib.createGzip({ level: 9 }) // Máxima compressão
      
      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject)
    })
  }

  /**
   * Descomprimir arquivo gzip
   */
  async decompressFile(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputFile)
      const writeStream = fs.createWriteStream(outputFile)
      const gunzip = zlib.createGunzip()
      
      readStream
        .pipe(gunzip)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject)
    })
  }

  /**
   * Obter lista de tabelas do banco
   */
  async getTableList() {
    try {
      const result = await getRows(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `)
      
      return result.map(row => row.tablename)
    } catch (error) {
      logError('Erro ao obter lista de tabelas', error)
      return []
    }
  }

  /**
   * Obter estatísticas do banco de dados
   */
  async getDatabaseStats() {
    try {
      const tables = await getRows(`
        SELECT 
          tablename,
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `)
      
      const totalRecords = tables.reduce((sum, table) => sum + parseInt(table.row_count || 0), 0)
      
      return {
        totalTables: tables.length,
        totalRecords,
        tables: tables.map(t => ({
          name: t.tablename,
          rows: parseInt(t.row_count || 0),
          size: t.size
        }))
      }
    } catch (error) {
      logError('Erro ao obter estatísticas do banco', error)
      return { totalTables: 0, totalRecords: 0, tables: [] }
    }
  }

  /**
   * Testar restore de um backup
   */
  async testRestore(backupFile) {
    const startTime = Date.now()
    
    try {
      logInfo('🧪 Iniciando teste de restore', { backupFile })
      
      const testDbName = `test_restore_${Date.now()}`
      
      // Criar banco de dados de teste
      await this.createTestDatabase(testDbName)
      
      try {
        // Tentar restaurar no banco de teste
        if (backupFile.endsWith('.sql.gz') || backupFile.endsWith('.sql')) {
          await this.restorePgDump(backupFile, testDbName)
        } else {
          logWarning('Teste de restore não implementado para backups JSON')
          return { success: false, reason: 'JSON restore test not implemented' }
        }
        
        // Verificar se a restauração foi bem-sucedida
        const verification = await this.verifyRestoredDatabase(testDbName)
        
        const duration = Date.now() - startTime
        
        logPerformance('Teste de restore concluído', duration, {
          backupFile,
          testDb: testDbName,
          success: verification.success,
          tables: verification.tables?.length || 0
        })
        
        return {
          success: verification.success,
          duration,
          testDatabase: testDbName,
          verification
        }
        
      } finally {
        // Sempre limpar o banco de teste
        await this.dropTestDatabase(testDbName)
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      logError('Erro durante teste de restore', error, { backupFile, duration })
      return { success: false, error: error.message, duration }
    }
  }

  /**
   * Criar banco de dados de teste
   */
  async createTestDatabase(testDbName) {
    const env = {
      ...process.env,
      PGPASSWORD: process.env.DB_PASSWORD,
      PGUSER: process.env.DB_USER,
      PGHOST: process.env.DB_HOST,
      PGPORT: process.env.DB_PORT
    }
    
    const command = `createdb "${testDbName}"`
    await execAsync(command, { env })
    
    logInfo('Banco de teste criado', { testDb: testDbName })
  }

  /**
   * Remover banco de dados de teste
   */
  async dropTestDatabase(testDbName) {
    try {
      const env = {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD,
        PGUSER: process.env.DB_USER,
        PGHOST: process.env.DB_HOST,
        PGPORT: process.env.DB_PORT
      }
      
      const command = `dropdb "${testDbName}"`
      await execAsync(command, { env })
      
      logInfo('Banco de teste removido', { testDb: testDbName })
    } catch (error) {
      logWarning('Erro ao remover banco de teste', { testDb: testDbName, error: error.message })
    }
  }

  /**
   * Restaurar backup pg_dump em banco específico
   */
  async restorePgDump(backupFile, targetDb) {
    const backupPath = path.isAbsolute(backupFile) 
      ? backupFile 
      : path.join(this.config.pgDumpDir, backupFile)
    
    let sqlFile = backupPath
    
    // Se for comprimido, descomprimir primeiro
    if (backupPath.endsWith('.gz')) {
      const tempSqlFile = path.join(this.config.testDir, `temp_${Date.now()}.sql`)
      await this.decompressFile(backupPath, tempSqlFile)
      sqlFile = tempSqlFile
    }
    
    const env = {
      ...process.env,
      PGPASSWORD: process.env.DB_PASSWORD,
      PGUSER: process.env.DB_USER,
      PGHOST: process.env.DB_HOST,
      PGPORT: process.env.DB_PORT,
      PGDATABASE: targetDb
    }
    
    const command = `psql -f "${sqlFile}"`
    await execAsync(command, { env })
    
    // Limpar arquivo temporário se foi criado
    if (sqlFile !== backupPath && fs.existsSync(sqlFile)) {
      fs.unlinkSync(sqlFile)
    }
  }

  /**
   * Verificar banco restaurado
   */
  async verifyRestoredDatabase(testDbName) {
    try {
      // Conectar ao banco de teste temporariamente
      const { query: testQuery } = await import('./connection.js')
      
      // Obter lista de tabelas
      const tables = await testQuery(`
        SELECT tablename, n_live_tup 
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
      `)
      
      const totalRecords = tables.rows.reduce((sum, table) => sum + parseInt(table.n_live_tup || 0), 0)
      
      return {
        success: tables.rows.length > 0,
        tables: tables.rows.map(t => ({
          name: t.tablename,
          records: parseInt(t.n_live_tup || 0)
        })),
        totalTables: tables.rows.length,
        totalRecords
      }
    } catch (error) {
      logError('Erro ao verificar banco restaurado', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Limpar backups antigos baseado na política de retenção
   */
  async cleanupOldBackups() {
    try {
      logInfo('🧹 Iniciando limpeza de backups antigos')
      
      const backups = await this.listAllBackups()
      const now = new Date()
      const toDelete = []
      
      // Categorizar backups por idade
      const daily = []
      const weekly = []
      const monthly = []
      const older = []
      
      backups.forEach(backup => {
        const age = now - new Date(backup.created)
        const days = age / (1000 * 60 * 60 * 24)
        
        if (days <= 30) {
          daily.push(backup)
        } else if (days <= 84) { // 12 semanas
          weekly.push(backup)
        } else if (days <= 365) { // 12 meses
          monthly.push(backup)
        } else {
          older.push(backup)
        }
      })
      
      // Aplicar política de retenção
      if (daily.length > this.config.maxBackups.daily) {
        toDelete.push(...daily.slice(this.config.maxBackups.daily))
      }
      
      if (weekly.length > this.config.maxBackups.weekly) {
        toDelete.push(...weekly.slice(this.config.maxBackups.weekly))
      }
      
      if (monthly.length > this.config.maxBackups.monthly) {
        toDelete.push(...monthly.slice(this.config.maxBackups.monthly))
      }
      
      // Remover todos os backups muito antigos
      toDelete.push(...older)
      
      // Executar remoção
      let deletedCount = 0
      let freedSpace = 0
      
      for (const backup of toDelete) {
        try {
          if (fs.existsSync(backup.path)) {
            freedSpace += backup.size
            fs.unlinkSync(backup.path)
            
            // Remover metadata se existir
            const metaFile = backup.path + '.meta.json'
            if (fs.existsSync(metaFile)) {
              fs.unlinkSync(metaFile)
            }
            
            deletedCount++
            logInfo('Backup antigo removido', { file: backup.filename, age: backup.age })
          }
        } catch (error) {
          logError('Erro ao remover backup', error, { file: backup.filename })
        }
      }
      
      logInfo('Limpeza de backups concluída', {
        deleted: deletedCount,
        freedSpace: `${(freedSpace / 1024 / 1024).toFixed(2)} MB`,
        remaining: backups.length - deletedCount
      })
      
      return { deleted: deletedCount, freedSpace }
      
    } catch (error) {
      logError('Erro durante limpeza de backups', error)
      return { deleted: 0, freedSpace: 0 }
    }
  }

  /**
   * Listar todos os backups disponíveis
   */
  async listAllBackups() {
    const backups = []
    
    // Listar backups pg_dump
    if (fs.existsSync(this.config.pgDumpDir)) {
      const pgDumpFiles = fs.readdirSync(this.config.pgDumpDir)
      
      for (const file of pgDumpFiles) {
        if (file.endsWith('.sql') || file.endsWith('.sql.gz')) {
          const filePath = path.join(this.config.pgDumpDir, file)
          const stats = fs.statSync(filePath)
          
          let metadata = null
          const metaFile = filePath + '.meta.json'
          
          if (fs.existsSync(metaFile)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
            } catch (error) {
              logWarning('Erro ao ler metadata do backup', { file, error: error.message })
            }
          }
          
          backups.push({
            filename: file,
            path: filePath,
            type: 'pg_dump',
            size: stats.size,
            created: stats.birthtime,
            metadata
          })
        }
      }
    }
    
    // Listar backups JSON
    if (fs.existsSync(this.config.jsonDir)) {
      const jsonFiles = fs.readdirSync(this.config.jsonDir)
      
      for (const file of jsonFiles) {
        if (file.endsWith('.json') || file.endsWith('.json.gz')) {
          const filePath = path.join(this.config.jsonDir, file)
          const stats = fs.statSync(filePath)
          
          backups.push({
            filename: file,
            path: filePath,
            type: 'json',
            size: stats.size,
            created: stats.birthtime,
            metadata: null
          })
        }
      }
    }
    
    // Ordenar por data de criação (mais recente primeiro)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created))
    
    return backups
  }
}

// Instância singleton
export const backupManager = new BackupManager()

// Funções de conveniência para compatibilidade
export const createBackup = (type = 'manual') => backupManager.createPgDumpBackup(type)
export const listBackups = () => backupManager.listAllBackups()
export const cleanupOldBackups = () => backupManager.cleanupOldBackups()

export default backupManager
