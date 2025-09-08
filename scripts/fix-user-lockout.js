#!/usr/bin/env node

import { query } from '../server/database/connection.js';

console.log('🔓 CORREÇÃO DE BLOQUEIO DE USUÁRIOS - SISPAT');
console.log('='.repeat(50));

async function fixUserLockout() {
  try {
    console.log('📋 Verificando usuários bloqueados...');

    // Verificar usuários bloqueados
    const blockedUsers = await query(`
      SELECT id, email, locked_until, lockout_until, login_attempts, failed_login_attempts, created_at 
      FROM users 
      WHERE locked_until IS NOT NULL OR lockout_until IS NOT NULL
    `);

    console.log(
      `\n🔍 Encontrados ${blockedUsers.rows.length} usuários bloqueados:`
    );

    if (blockedUsers.rows.length > 0) {
      blockedUsers.rows.forEach((user, index) => {
        const lockoutDate = user.locked_until
          ? new Date(user.locked_until)
          : new Date(user.lockout_until);
        const now = new Date();
        const isExpired = now > lockoutDate;

        console.log(`\n${index + 1}. ${user.email}`);
        console.log(`   - ID: ${user.id}`);
        console.log(
          `   - Bloqueado até: ${lockoutDate.toLocaleString('pt-BR')}`
        );
        console.log(`   - Tentativas de login: ${user.login_attempts || 0}`);
        console.log(
          `   - Tentativas falhadas: ${user.failed_login_attempts || 0}`
        );
        console.log(
          `   - Status: ${isExpired ? '🔓 EXPIRADO (pode ser desbloqueado)' : '🔒 AINDA BLOQUEADO'}`
        );
      });

      console.log('\n🔧 Desbloqueando usuários...');

      // Desbloquear todos os usuários (resetar lockout)
      const result = await query(`
        UPDATE users 
        SET 
          locked_until = NULL,
          lockout_until = NULL,
          login_attempts = 0,
          failed_login_attempts = 0
        WHERE locked_until IS NOT NULL OR lockout_until IS NOT NULL
      `);

      console.log(`✅ ${result.rowCount} usuários desbloqueados com sucesso!`);

      // Verificar se ainda há usuários bloqueados
      const remainingBlocked = await query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE locked_until IS NOT NULL OR lockout_until IS NOT NULL
      `);

      console.log(`\n📊 Verificação final:`);
      console.log(
        `   - Usuários ainda bloqueados: ${remainingBlocked.rows[0].count}`
      );

      if (remainingBlocked.rows[0].count === '0') {
        console.log('🎉 Todos os usuários foram desbloqueados!');
      }
    } else {
      console.log('✅ Nenhum usuário bloqueado encontrado!');
    }

    // Mostrar todos os usuários para referência
    console.log('\n📋 Lista de todos os usuários:');
    const allUsers = await query(`
      SELECT id, email, locked_until, login_attempts, role, municipality_id
      FROM users 
      ORDER BY created_at DESC
    `);

    allUsers.rows.forEach((user, index) => {
      const status = user.locked_until ? '🔒 BLOQUEADO' : '✅ ATIVO';
      console.log(`${index + 1}. ${user.email} (${user.role}) - ${status}`);
    });

    console.log('\n🎯 CORREÇÃO CONCLUÍDA!');
    console.log('✅ Usuários podem fazer login normalmente agora');
  } catch (error) {
    console.error('❌ Erro ao corrigir bloqueio de usuários:', error);
    process.exit(1);
  }
}

// Executar correção
fixUserLockout()
  .then(() => {
    console.log('\n🚀 Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
