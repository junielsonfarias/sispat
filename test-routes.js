import { Pool } from 'pg';

async function testRoutes() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'sispat_db',
    user: 'postgres',
    password: '6273',
  });

  try {
    console.log('🔍 Testando rotas problemáticas...');

    // Teste 1: Verificar se conseguimos executar a query da rota municipalities/public
    console.log('\n📋 Teste 1: Query da rota municipalities/public...');
    try {
      const result1 = await pool.query(`
      SELECT 
        id,
        name,
        state
      FROM municipalities
      ORDER BY name
    `);
      console.log('✅ Query municipalities/public executada com sucesso');
      console.log('   - Total de municípios:', result1.rows.length);
      console.log('   - Primeiro município:', result1.rows[0]);
    } catch (error) {
      console.error('❌ Erro na query municipalities/public:', error.message);
    }

    // Teste 2: Verificar se conseguimos executar a query da rota ensure-superuser
    console.log('\n📋 Teste 2: Query da rota ensure-superuser...');
    try {
      const result2 = await pool.query('SELECT id FROM users WHERE role = $1', [
        'superuser',
      ]);
      console.log('✅ Query ensure-superuser executada com sucesso');
      console.log('   - Superusuários encontrados:', result2.rows.length);
      if (result2.rows.length > 0) {
        console.log('   - Primeiro superusuário:', result2.rows[0]);
      }
    } catch (error) {
      console.error('❌ Erro na query ensure-superuser:', error.message);
    }

    // Teste 3: Verificar se conseguimos executar INSERT na tabela users
    console.log('\n📋 Teste 3: Teste de INSERT na tabela users...');
    try {
      // Primeiro verificar se já existe um usuário de teste
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );

      if (existingUser.rows.length === 0) {
        // Tentar inserir um usuário de teste
        const insertResult = await pool.query(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (
          gen_random_uuid(),
          'Usuário Teste',
          'test@example.com',
          'password_hash_test',
          'usuario'
        )
        RETURNING id, name, email, role
      `);
        console.log('✅ INSERT na tabela users executado com sucesso');
        console.log('   - Usuário criado:', insertResult.rows[0]);

        // Remover o usuário de teste
        await pool.query('DELETE FROM users WHERE email = $1', [
          'test@example.com',
        ]);
        console.log('✅ Usuário de teste removido');
      } else {
        console.log(
          '✅ Usuário de teste já existe, teste de INSERT não necessário'
        );
      }
    } catch (error) {
      console.error('❌ Erro no teste de INSERT:', error.message);
    }
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await pool.end();
    console.log('\n🔌 Conexão fechada');
  }
}

// Executar o teste
testRoutes().catch(console.error);
