#!/usr/bin/env node

import { query } from './connection.js';

async function fixActivityLogsTable() {
  try {
    console.log('🔧 Corrigindo estrutura da tabela activity_logs...');

    // Adicionar colunas faltantes na tabela activity_logs
    console.log('📋 Adicionando colunas na tabela activity_logs...');
    await query(`
      ALTER TABLE activity_logs 
      ADD COLUMN IF NOT EXISTS user_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS details TEXT,
      ADD COLUMN IF NOT EXISTS sector VARCHAR(255)
    `);
    console.log('✅ Colunas adicionadas na tabela activity_logs');

    // Verificar se as colunas foram criadas
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      AND column_name IN ('user_name', 'details', 'sector')
      ORDER BY column_name
    `);

    console.log('📋 Colunas verificadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('🎉 Estrutura da tabela activity_logs corrigida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela activity_logs:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixActivityLogsTable()
    .then(() => {
      console.log('✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}

export default fixActivityLogsTable;
