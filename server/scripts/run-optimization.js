#!/usr/bin/env node

/**
 * Script para executar otimização do banco de dados
 * Pode ser executado diretamente via linha de comando
 */

import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '../../.env' });

console.log('🔧 Carregando configurações...');
console.log(
  `   DB_HOST: ${process.env.DB_HOST ? 'Configurado' : 'NÃO CONFIGURADO'}`
);

import { runCompleteAnalysis } from '../database/analyze-performance.js';
import { runCompleteOptimization } from '../database/optimize-indexes.js';
import { logError } from '../utils/logger.js';

const main = async () => {
  try {
    console.log('🚀 Iniciando análise e otimização do banco de dados SISPAT');
    console.log('='.repeat(60));

    console.log('📊 Testando conexão com banco de dados...');

    // 1. Executar análise completa
    console.log('\n📊 FASE 1: ANÁLISE DE PERFORMANCE');
    console.log('-'.repeat(40));

    const analysis = await runCompleteAnalysis();

    console.log(`\n✅ Análise concluída:`);
    console.log(
      `   • Queries lentas encontradas: ${analysis.slowQueries?.length || 0}`
    );
    console.log(
      `   • Índices existentes: ${analysis.existingIndexes?.length || 0}`
    );
    console.log(
      `   • Índices não utilizados: ${analysis.indexUsage?.unusedIndexes?.length || 0}`
    );
    console.log(
      `   • Tabelas precisando manutenção: ${analysis.tableStats?.needMaintenance?.length || 0}`
    );
    console.log(
      `   • Novos índices sugeridos: ${analysis.indexSuggestions?.length || 0}`
    );

    // 2. Executar otimização
    console.log('\n🔧 FASE 2: OTIMIZAÇÃO DO BANCO');
    console.log('-'.repeat(40));

    const optimization = await runCompleteOptimization({
      removeUnused: false, // Modo seguro - não remove índices
      performMaintenance: true,
    });

    console.log(`\n✅ Otimização concluída:`);
    console.log(
      `   • Índices criados: ${optimization.indexCreation?.created || 0}`
    );
    console.log(
      `   • Índices já existentes: ${optimization.indexCreation?.skipped || 0}`
    );
    console.log(
      `   • Índices com falha: ${optimization.indexCreation?.failed || 0}`
    );
    console.log(
      `   • Tabelas com manutenção: ${optimization.tableMaintenance?.maintained || 0}`
    );
    console.log(
      `   • Tempo total: ${(optimization.totalDuration / 1000).toFixed(2)}s`
    );

    // 3. Mostrar recomendações
    if (analysis.slowQueries?.length > 0) {
      console.log('\n⚠️  QUERIES LENTAS DETECTADAS:');
      analysis.slowQueries.slice(0, 5).forEach((query, i) => {
        console.log(`   ${i + 1}. ${query.query.substring(0, 80)}...`);
        console.log(
          `      Tempo médio: ${parseFloat(query.mean_time).toFixed(2)}ms`
        );
        console.log(`      Chamadas: ${query.calls}`);
      });
    }

    if (optimization.indexCreation?.details?.length > 0) {
      console.log('\n📊 ÍNDICES PROCESSADOS:');
      optimization.indexCreation.details.forEach(detail => {
        const status = detail.success ? (detail.skipped ? '⏭️' : '✅') : '❌';
        console.log(`   ${status} ${detail.name} (${detail.table})`);
        if (!detail.success && !detail.skipped) {
          console.log(`      Erro: ${detail.error}`);
        }
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(
      '🎉 Otimização do banco de dados SISPAT concluída com sucesso!'
    );
    console.log('📝 Verifique os logs detalhados em server/logs/');
  } catch (error) {
    logError('Erro durante otimização do banco', error);
    console.error('\n❌ Erro durante a otimização:', error.message);
    process.exit(1);
  }
};

// Executar sempre
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
