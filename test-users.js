import { Pool } from 'pg';

async function testUsers() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'sispat_db',
    user: 'postgres',
    password: '6273',
  });

  try {
    console.log('🔍 Testando acesso à tabela users...');

    // Teste 1: Verificar se a tabela users existe
    const result1 = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
    );
    console.log('✅ Tabela users:', result1.rows);

    // Teste 2: Verificar se há usuários na tabela
    if (result1.rows.length > 0) {
      const result2 = await pool.query('SELECT COUNT(*) as total FROM users');
      console.log('✅ Total de usuários:', result2.rows[0].total);

      // Teste 3: Verificar se há superuser
      const result3 = await pool.query(
        "SELECT id, name, email, role FROM users WHERE role = 'superuser'"
      );
      console.log('✅ Superusuários encontrados:', result3.rows);

      // Teste 4: Verificar estrutura da tabela
      const result4 = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
      );
      console.log('✅ Estrutura da tabela users:');
      result4.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro ao acessar tabela users:', error.message);
  } finally {
    await pool.end();
    console.log('🔌 Conexão fechada');
  }
}

// Executar o teste
testUsers().catch(console.error);
