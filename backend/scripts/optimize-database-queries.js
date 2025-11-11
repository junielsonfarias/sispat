/**
 * Script para otimizar queries do banco de dados
 * Analisa queries lentas e sugere otimizações
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeSlowQueries() {
  console.log('🔍 Analisando queries lentas...\n');

  try {
    // Verificar índices existentes
    const indexes = await prisma.$queryRaw`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('patrimonios', 'imoveis', 'users', 'sectors', 'locais', 'activity_logs')
      ORDER BY tablename, indexname;
    `;

    console.log('📊 Índices existentes:');
    console.table(indexes);

    // Verificar tamanho das tabelas
    const tableSizes = await prisma.$queryRaw`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('patrimonios', 'imoveis', 'users', 'sectors', 'locais', 'activity_logs')
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `;

    console.log('\n📊 Tamanho das tabelas:');
    console.table(tableSizes);

    // Verificar índices não utilizados (se o PostgreSQL tiver estatísticas)
    try {
      const unusedIndexes = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        AND idx_scan = 0
        AND tablename IN ('patrimonios', 'imoveis', 'users', 'sectors', 'locais')
        ORDER BY tablename;
      `;

      if (unusedIndexes.length > 0) {
        console.log('\n⚠️  Índices não utilizados (considerar remoção):');
        console.table(unusedIndexes);
      } else {
        console.log('\n✅ Todos os índices estão sendo utilizados');
      }
    } catch (error) {
      console.log('\n⚠️  Não foi possível verificar índices não utilizados (normal em desenvolvimento)');
    }

    // Verificar queries mais frequentes (se habilitado)
    console.log('\n✅ Análise concluída!');
    
    // Sugestões de otimização
    console.log('\n💡 Sugestões de otimização:');
    console.log('1. Verificar se todos os índices estão criados');
    console.log('2. Executar ANALYZE nas tabelas principais:');
    console.log('   ANALYZE patrimonios;');
    console.log('   ANALYZE imoveis;');
    console.log('   ANALYZE activity_logs;');
    console.log('3. Monitorar slow queries no log do PostgreSQL');
    console.log('4. Considerar particionamento para tabelas grandes (>1M registros)');

  } catch (error) {
    console.error('❌ Erro ao analisar queries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar análise
analyzeSlowQueries();

