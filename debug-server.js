import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Criar um servidor de debug
const app = express();
const PORT = 3003;

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

// Middleware de log
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Rota de teste bcrypt
app.get('/test-bcrypt', async (req, res) => {
  try {
    console.log('🔍 Testando bcrypt...');
    const hashedPassword = await bcrypt.hash('test123', 12);
    const isValid = await bcrypt.compare('test123', hashedPassword);

    res.json({
      success: true,
      hashedPassword: hashedPassword.substring(0, 20) + '...',
      isValid: isValid,
    });
  } catch (error) {
    console.error('❌ Erro no bcrypt:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Rota de teste municipalities com tratamento de erro detalhado
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
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
    });
  }
});

// Rota de teste ensure-superuser com tratamento de erro detalhado
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
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de debug rodando na porta ${PORT}`);
  console.log(`📋 Teste as rotas:`);
  console.log(`   - GET  http://localhost:${PORT}/test-bcrypt`);
  console.log(`   - GET  http://localhost:${PORT}/municipalities/public`);
  console.log(`   - POST http://localhost:${PORT}/auth/ensure-superuser`);
});

// Tratamento de erros
process.on('SIGINT', async () => {
  console.log('\n🔌 Encerrando servidor de debug...');
  await pool.end();
  process.exit(0);
});

process.on('uncaughtException', error => {
  console.error('🚨 Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Promise rejeitada:', reason);
});
