#!/usr/bin/env node

import { pool } from './connection.js'
import dotenv from 'dotenv'

dotenv.config()

const resetDatabase = async () => {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Iniciando reset do banco de dados...')
    
    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = replica;')
    
    // Clear all data except superuser
    const tablesToClear = [
      'notifications',
      'manutencao_tasks',
      'inventory_items',
      'inventories',
      'imoveis_historico',
      'imoveis',
      'transferencias',
      'emprestimos',
      'notes',
      'historico_movimentacao',
      'patrimonios',
      'locals',
      'sectors',
      'municipalities',
      'activity_logs',
      'report_templates',
      'label_templates',
      'themes'
    ]
    
    for (const table of tablesToClear) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`)
      console.log(`✅ Tabela ${table} limpa`)
    }
    
    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;')
    
    console.log('🎉 Reset concluído com sucesso!')
    console.log('📋 Status:')
    console.log('   - Todos os dados foram removidos')
    console.log('   - Superusuário mantido')
    console.log('   - Estrutura das tabelas preservada')
    
  } catch (error) {
    console.error('❌ Erro durante o reset:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run reset
resetDatabase()
  .then(() => {
    console.log('✅ Banco de dados resetado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Falha no reset do banco de dados:', error)
    process.exit(1)
  })
