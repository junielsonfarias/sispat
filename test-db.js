import { Pool } from 'pg';

async function testDatabase() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'sispat_db',
    user: 'postgres',
    password: '6273',
  });

  try {
    console.log('🔍 Testando conexão com banco...');

    // Teste 1: Verificar se a tabela municipalities existe
    const result1 = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipalities'"
    );
    console.log('✅ Tabela municipalities:', result1.rows);

    // Teste 2: Verificar se há dados na tabela
    if (result1.rows.length > 0) {
      const result2 = await pool.query(
        'SELECT COUNT(*) as total FROM municipalities'
      );
      console.log('✅ Total de municípios:', result2.rows[0].total);

      const result3 = await pool.query(
        'SELECT id, name, state FROM municipalities LIMIT 3'
      );
      console.log('✅ Primeiros municípios:', result3.rows);
    }
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexão fechada');
  }
}

// Executar o teste
testDatabase().catch(console.error);
