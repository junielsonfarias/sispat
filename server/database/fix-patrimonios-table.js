#!/usr/bin/env node

import { query } from './connection.js';

async function fixPatrimoniosTable() {
  try {
    console.log('🔧 Verificando estrutura da tabela patrimonios...');

    // Verificar se a tabela patrimonios existe
    const checkTable = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'patrimonios'
    `);

    if (checkTable.rows.length === 0) {
      console.log('❌ Tabela patrimonios não existe!');
      return;
    }

    console.log('✅ Tabela patrimonios existe');

    // Verificar colunas da tabela patrimonios
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'patrimonios'
      ORDER BY ordinal_position
    `);

    console.log('📋 Colunas da tabela patrimonios:');
    columns.rows.forEach(col => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`
      );
    });

    // Verificar se a coluna descricao existe
    const descricaoExists = columns.rows.find(
      col => col.column_name === 'descricao'
    );
    if (!descricaoExists) {
      console.log('❌ Coluna descricao não existe! Adicionando...');
      await query(`
        ALTER TABLE patrimonios 
        ADD COLUMN descricao TEXT NOT NULL DEFAULT 'Sem descrição'
      `);
      console.log('✅ Coluna descricao adicionada');
    } else {
      console.log('✅ Coluna descricao existe');
    }

    // Verificar dados na tabela
    const count = await query('SELECT COUNT(*) as total FROM patrimonios');
    console.log(`📊 Total de patrimônios: ${count.rows[0].total}`);

    // Verificar um patrimônio específico
    const patrimonio = await query(`
      SELECT id, numero_patrimonio, descricao, created_at 
      FROM patrimonios 
      WHERE id = 'b07fad81-8db3-4c13-8caa-967c9e6466a7'
    `);

    if (patrimonio.rows.length > 0) {
      console.log('📋 Patrimônio encontrado:');
      console.log(`  - ID: ${patrimonio.rows[0].id}`);
      console.log(`  - Número: ${patrimonio.rows[0].numero_patrimonio}`);
      console.log(`  - Descrição: ${patrimonio.rows[0].descricao}`);
      console.log(`  - Criado em: ${patrimonio.rows[0].created_at}`);
    } else {
      console.log('❌ Patrimônio não encontrado');
    }

    console.log('🎉 Verificação da tabela patrimonios concluída!');
  } catch (error) {
    console.error('❌ Erro ao verificar tabela patrimonios:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPatrimoniosTable()
    .then(() => {
      console.log('✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}

export default fixPatrimoniosTable;
