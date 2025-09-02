import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Criar um servidor de teste para o middleware de autenticação
const app = express();
const PORT = 3004;

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

// Função para executar queries (simulando o arquivo connection.js)
const getRows = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

const getRow = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0];
};

const query = async (text, params) => {
  return await pool.query(text, params);
};

// Middleware de autenticação (simulando o auth.js)
const authenticateToken = async (req, res, next) => {
  try {
    const url = req.originalUrl || req.url || '';
    const isPublicGet =
      req.method === 'GET' &&
      (url.startsWith('/api/municipalities/public') ||
        url.startsWith('/api/patrimonios/public') ||
        url.startsWith('/api/imoveis/public'));

    if (isPublicGet) {
      console.log('✅ Rota pública detectada, permitindo acesso');
      return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    // Verificar se JWT_SECRET está configurado
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET não configurado');
      return res
        .status(500)
        .json({ error: 'Configuração de segurança inválida' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token JWT válido:', decoded);
      next();
    } catch (jwtError) {
      console.error('❌ Erro JWT:', jwtError.message);
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    console.error('❌ Erro no middleware de autenticação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Rota de teste municipalities/public com middleware
app.get('/api/municipalities/public', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Executando rota municipalities/public...');

    const municipalities = await getRows(`
      SELECT 
        id,
        name,
        state
      FROM municipalities
      ORDER BY name
    `);

    console.log('✅ Municípios obtidos com sucesso');
    res.json(municipalities);
  } catch (error) {
    console.error('❌ Erro na rota municipalities/public:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de teste ensure-superuser com middleware
app.post('/api/auth/ensure-superuser', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Executando rota ensure-superuser...');

    const superuser = await getRow('SELECT id FROM users WHERE role = $1', [
      'superuser',
    ]);

    if (!superuser) {
      const hashedPassword = await bcrypt.hash('Tiko6273@', 12);

      await query(
        `
        INSERT INTO users (id, name, email, password, role)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          'JUNIELSON CASTRO FARIAS',
          'junielsonfarias@gmail.com',
          $1,
          'superuser'
        )
      `,
        [hashedPassword]
      );

      console.log('✅ Superusuário criado automaticamente');
    }

    res.json({ message: 'Superusuário verificado' });
  } catch (error) {
    console.error('❌ Erro na rota ensure-superuser:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste de autenticação rodando na porta ${PORT}`);
  console.log(`📋 Teste as rotas:`);
  console.log(`   - GET  http://localhost:${PORT}/api/municipalities/public`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/ensure-superuser`);
});

// Tratamento de erros
process.on('SIGINT', async () => {
  console.log('\n🔌 Encerrando servidor de teste...');
  await pool.end();
  process.exit(0);
});
