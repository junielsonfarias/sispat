#!/bin/bash

echo "🔐 ATUALIZANDO SENHA DO SUPERUSUÁRIO"
echo ""

cd /var/www/sispat/backend

# Criar script para atualizar senha
cat > /tmp/update-superuser-password.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updatePassword() {
  const email = 'junielsonfarias@gmail.com';
  const newPassword = 'Sispat@2025!Admin';
  
  console.log('🔐 Atualizando senha do superusuário...');
  console.log('   Email:', email);
  
  // Hash da nova senha com 12 rounds
  const passwordHash = await bcrypt.hash(newPassword, 12);
  
  // Atualizar usuário
  const user = await prisma.user.update({
    where: { email: email },
    data: {
      password: passwordHash,
      role: 'superuser',
      isActive: true,
    },
  });
  
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ✅ SENHA ATUALIZADA COM SUCESSO!         ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log('🔐 Novas Credenciais:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:', email);
  console.log('🔑 Senha:', newPassword);
  console.log('👤 Role:', user.role);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✅ Agora você pode fazer login com estas credenciais!');
}

updatePassword()
  .catch((error) => {
    console.error('❌ Erro ao atualizar senha:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Executar script
node /tmp/update-superuser-password.js

# Limpar script temporário
rm /tmp/update-superuser-password.js

# Verificar
echo ""
echo "Verificando usuário atualizado..."
sudo -u postgres psql -d sispat_prod -c "SELECT email, role, \"isActive\" FROM users WHERE email = 'junielsonfarias@gmail.com';"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  📝 PRÓXIMOS PASSOS                              ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "1. Faça LOGOUT no navegador"
echo "2. Limpe o cache (Ctrl+Shift+Delete)"
echo "3. Faça LOGIN novamente com:"
echo "   Email: junielsonfarias@gmail.com"
echo "   Senha: Sispat@2025!Admin"
echo "4. Teste a personalização"
echo ""

