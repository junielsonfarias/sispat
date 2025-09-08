#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import { query } from '../server/database/connection.js';

console.log('🔑 REDEFINIÇÃO DE SENHA DE USUÁRIO');
console.log('='.repeat(50));

async function resetPassword() {
  try {
    const email = 'supervisor@sispat.com';
    const newPassword = '123456';

    console.log(`📋 Redefinindo senha para: ${email}`);
    console.log(`🔑 Nova senha: ${newPassword}`);

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('✅ Senha criptografada com sucesso');

    // Atualizar no banco
    const result = await query(
      `
      UPDATE users 
      SET 
        password = $1,
        login_attempts = 0,
        failed_login_attempts = 0,
        locked_until = NULL,
        lockout_until = NULL
      WHERE email = $2
    `,
      [hashedPassword, email]
    );

    if (result.rowCount > 0) {
      console.log('✅ Senha redefinida com sucesso!');
      console.log('✅ Contador de tentativas resetado!');
      console.log('✅ Bloqueio removido!');
    } else {
      console.log('❌ Usuário não encontrado');
    }

    // Verificar se a senha foi atualizada
    const user = await query('SELECT email, role FROM users WHERE email = $1', [
      email,
    ]);
    if (user.rows.length > 0) {
      console.log(
        `\n👤 Usuário verificado: ${user.rows[0].email} (${user.rows[0].role})`
      );
    }

    console.log('\n🎯 REDEFINIÇÃO CONCLUÍDA!');
    console.log('✅ Agora você pode fazer login com:');
    console.log(`   - Email: ${email}`);
    console.log(`   - Senha: ${newPassword}`);
  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
  }
}

resetPassword()
  .then(() => {
    console.log('\n🚀 Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
