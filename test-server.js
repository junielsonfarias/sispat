import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

// Criar um servidor de teste simples
const app = express();
const PORT = 3002;

// Configurar CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Configurar JSON
app.use(express.json());

// Pool de conexão
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sispat_db',
  user: 'postgres',
  password: '6273',
});

// Rota de teste simples
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor de teste funcionando!' });
});

// Rota de teste municipalities/public
app.get('/municipalities/public', async (req, res) => {
  try {
    console.log('🔍 Testando rota municipalities/public...');

    const result = await pool.query(`
      SELECT 
        id,
        name,
        state
      FROM municipalities
      ORDER BY name
    `);

    console.log('✅ Query executada com sucesso');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro na rota municipalities/public:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste ensure-superuser
app.post('/auth/ensure-superuser', async (req, res) => {
  try {
    console.log('🔍 Testando rota ensure-superuser...');

    const result = await pool.query('SELECT id FROM users WHERE role = $1', [
      'superuser',
    ]);

    console.log('✅ Query executada com sucesso');
    res.json({ message: 'Superusuário verificado', count: result.rows.length });
  } catch (error) {
    console.error('❌ Erro na rota ensure-superuser:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
  console.log(`📋 Teste as rotas:`);
  console.log(`   - GET  http://localhost:${PORT}/test`);
  console.log(`   - GET  http://localhost:${PORT}/municipalities/public`);
  console.log(`   - POST http://localhost:${PORT}/auth/ensure-superuser`);
});

// Tratamento de erros
process.on('SIGINT', async () => {
  console.log('\n🔌 Encerrando servidor de teste...');
  await pool.end();
  process.exit(0);
});
