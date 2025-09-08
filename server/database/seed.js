#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from './connection.js';

dotenv.config();

const seedDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Hash password for superuser
    const defaultPassword =
      process.env.DEFAULT_SUPERUSER_PASSWORD || 'ChangeMe123!@#';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Create superuser
    const superuserResult = await client.query(
      `
      INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'JUNIELSON CASTRO FARIAS',
        'junielsonfarias@gmail.com',
        $1,
        'superuser',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `,
      [hashedPassword]
    );

    if (superuserResult.rows.length > 0) {
      console.log('✅ Superusuário criado com sucesso');
    } else {
      console.log('ℹ️ Superusuário já existe');
    }

    // Create initial activity log entry
    await client.query(
      `
      INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values, created_at)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'CREATE',
        'users',
        '00000000-0000-0000-0000-000000000001',
        $1,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT DO NOTHING
    `,
      [
        JSON.stringify({
          name: 'JUNIELSON CASTRO FARIAS',
          email: 'junielsonfarias@gmail.com',
          role: 'superuser',
        }),
      ]
    );

    console.log('✅ Log de atividade inicial criado');

    // Create default theme
    const defaultTheme = {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#f1f5f9',
        border: '#e2e8f0',
      },
      borderRadius: '0.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    };

    await client.query(
      `
      INSERT INTO themes (id, name, description, config, is_default, created_by, created_at, updated_at)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'Tema Padrão',
        'Tema padrão do sistema',
        $1,
        true,
        '00000000-0000-0000-0000-000000000001',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT DO NOTHING
    `,
      [JSON.stringify(defaultTheme)]
    );

    console.log('✅ Tema padrão criado');

    console.log('🎉 Seed concluído com sucesso!');
    console.log('📋 Dados iniciais:');
    console.log('   - Superusuário: junielsonfarias@gmail.com');
    console.log('   - Senha: Tiko6273@');
    console.log('   - Tema padrão criado');
    console.log('   - Log de atividade inicial');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run seed
seedDatabase()
  .then(() => {
    console.log('✅ Banco de dados populado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Falha na população do banco de dados:', error);
    process.exit(1);
  });
