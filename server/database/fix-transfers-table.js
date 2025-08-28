#!/usr/bin/env node

import { query } from './connection.js'

async function fixTransfersTable() {
  try {
    console.log('🔧 Corrigindo estrutura da tabela transfers...')
    
    // Verificar se a coluna municipality_id existe
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transfers' 
      AND column_name = 'municipality_id'
    `)
    
    if (checkColumn.rows.length === 0) {
      console.log('📋 Adicionando coluna municipality_id na tabela transfers...')
      await query(`
        ALTER TABLE transfers 
        ADD COLUMN municipality_id UUID REFERENCES municipalities(id)
      `)
      console.log('✅ Coluna municipality_id adicionada na tabela transfers')
    } else {
      console.log('✅ Coluna municipality_id já existe na tabela transfers')
    }
    
    // Verificar se a tabela transfers existe
    const checkTable = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'transfers'
    `)
    
    if (checkTable.rows.length === 0) {
      console.log('📋 Criando tabela transfers...')
      await query(`
        CREATE TABLE transfers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patrimonio_id UUID NOT NULL REFERENCES patrimonios(id),
          origem_id UUID REFERENCES locals(id),
          destino_id UUID REFERENCES locals(id),
          municipality_id UUID REFERENCES municipalities(id),
          data_transferencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          motivo TEXT,
          autorizado_por UUID REFERENCES users(id),
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Tabela transfers criada')
    } else {
      console.log('✅ Tabela transfers já existe')
    }
    
    console.log('🎉 Estrutura da tabela transfers corrigida com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela transfers:', error)
    throw error
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixTransfersTable()
    .then(() => {
      console.log('✅ Script concluído com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error)
      process.exit(1)
    })
}

export default fixTransfersTable
