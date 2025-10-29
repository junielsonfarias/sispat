const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function verificarUsuarios() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...\n');
    
    // Buscar todos os usuários
    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log(`📊 Total de usuários encontrados: ${usuarios.length}\n`);
    
    if (usuarios.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco!');
      console.log('Execute: npm run prisma:seed');
      return;
    }
    
    // Listar usuários
    usuarios.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Função: ${user.role}`);
      console.log(`   ✅ Ativo: ${user.isActive ? 'Sim' : 'Não'}`);
      console.log(`   📅 Criado: ${user.createdAt.toLocaleString()}`);
      console.log('');
    });
    
    // Testar login do supervisor
    console.log('🧪 Testando credenciais do supervisor...');
    const supervisor = await prisma.user.findUnique({
      where: { email: 'supervisor@sispat.local' }
    });
    
    if (supervisor) {
      const senhaCorreta = await bcrypt.compare('super123', supervisor.password);
      console.log(`✅ Supervisor encontrado: ${supervisor.name}`);
      console.log(`✅ Senha válida: ${senhaCorreta ? 'Sim' : 'Não'}`);
    } else {
      console.log('❌ Supervisor não encontrado!');
    }
    
    // Testar login do admin
    console.log('\n🧪 Testando credenciais do admin...');
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@sispat.local' }
    });
    
    if (admin) {
      const senhaCorreta = await bcrypt.compare('admin123', admin.password);
      console.log(`✅ Admin encontrado: ${admin.name}`);
      console.log(`✅ Senha válida: ${senhaCorreta ? 'Sim' : 'Não'}`);
    } else {
      console.log('❌ Admin não encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarUsuarios();
