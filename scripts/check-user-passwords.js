#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import { query } from '../server/database/connection.js';

console.log('🔍 VERIFICAÇÃO DE SENHAS DE USUÁRIOS');
console.log('='.repeat(50));

async function checkPasswords() {
  try {
    console.log('📋 Buscando usuários...');

    const result = await query(`
      SELECT id, email, password, role, municipality_id 
      FROM users 
      ORDER BY created_at DESC
    `);

    console.log(`\n📊 Encontrados ${result.rows.length} usuários:`);

    const testPasswords = [
      'sispat123456',
      '123456',
      'admin123',
      'password',
      'sispat',
      'admin',
    ];

    for (const user of result.rows) {
      console.log(`\n👤 ${user.email} (${user.role})`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Municipality: ${user.municipality_id}`);

      // Testar senhas comuns
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, user.password);
          if (isValid) {
            console.log(`   ✅ Senha encontrada: "${testPassword}"`);
            break;
          }
        } catch (error) {
          console.log(
            `   ❌ Erro ao testar senha "${testPassword}": ${error.message}`
          );
        }
      }
    }

    console.log('\n🎯 VERIFICAÇÃO CONCLUÍDA!');
  } catch (error) {
    console.error('❌ Erro ao verificar senhas:', error);
  }
}

checkPasswords()
  .then(() => {
    console.log('\n🚀 Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
