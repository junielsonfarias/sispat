import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // Obter nome do município das variáveis de ambiente
  const MUNICIPALITY_NAME = process.env.MUNICIPALITY_NAME || 'Prefeitura Municipal';
  const STATE = process.env.STATE || 'PA';

  // Criar Município
  console.log('📍 Criando município...');
  const municipality = await prisma.municipality.upsert({
    where: { id: 'municipality-1' },
    update: {
      name: MUNICIPALITY_NAME,
      state: STATE,
    },
    create: {
      id: 'municipality-1',
      name: MUNICIPALITY_NAME,
      state: STATE,
      primaryColor: '#3B82F6',
      logoUrl: null,
      footerText: `${MUNICIPALITY_NAME} - ${STATE}`,
    },
  });
  console.log('✅ Município criado:', municipality.name);

  // ✅ NÃO criar setores, locais ou tipos
  // O superusuário e supervisor farão a configuração inicial no sistema
  console.log('\n📝 Setores, locais e tipos não foram criados.');
  console.log('   Configure pelo painel administrativo após o primeiro acesso.');

  // Obter credenciais dos usuários das variáveis de ambiente
  const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL || 'admin@sistema.com';
  const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD || 'Admin@123';
  const SUPERUSER_NAME = process.env.SUPERUSER_NAME || 'Administrador do Sistema';
  
  const SUPERVISOR_EMAIL = process.env.SUPERVISOR_EMAIL || 'supervisor@sistema.com';
  const SUPERVISOR_PASSWORD = process.env.SUPERVISOR_PASSWORD || 'Supervisor@123!';
  const SUPERVISOR_NAME = process.env.SUPERVISOR_NAME || 'Supervisor do Sistema';

  // Hash das senhas
  // ✅ Bcrypt rounds aumentado para 12 (mais seguro em 2025)
  const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  
  console.log('\n👥 Criando usuários iniciais...');
  console.log(`   Superusuário: ${SUPERUSER_EMAIL}`);
  console.log(`   Supervisor: ${SUPERVISOR_EMAIL}`);
  
  const superuserPasswordHash = await bcrypt.hash(SUPERUSER_PASSWORD, BCRYPT_ROUNDS);
  const supervisorPasswordHash = await bcrypt.hash(SUPERVISOR_PASSWORD, BCRYPT_ROUNDS);

  // Criar Superusuário
  const superuser = await prisma.user.upsert({
    where: { email: SUPERUSER_EMAIL },
    update: {
      name: SUPERUSER_NAME,
      password: superuserPasswordHash,
      role: 'superuser',
      isActive: true,
    },
    create: {
      id: 'user-superuser',
      email: SUPERUSER_EMAIL,
      name: SUPERUSER_NAME,
      password: superuserPasswordHash,
      role: 'superuser',
      responsibleSectors: [],
      municipalityId: municipality.id,
      isActive: true,
    },
  });
  console.log('✅ Superusuário criado');

  // Criar Supervisor
  const supervisor = await prisma.user.upsert({
    where: { email: SUPERVISOR_EMAIL },
    update: {
      name: SUPERVISOR_NAME,
      password: supervisorPasswordHash,
      role: 'supervisor',
      isActive: true,
    },
    create: {
      id: 'user-supervisor',
      email: SUPERVISOR_EMAIL,
      name: SUPERVISOR_NAME,
      password: supervisorPasswordHash,
      role: 'supervisor',
      responsibleSectors: [],  // Será configurado depois pelo superusuário
      municipalityId: municipality.id,
      isActive: true,
    },
  });
  console.log('✅ Supervisor criado');

  // ✅ NÃO criar tipos de bens ou formas de aquisição
  // Serão configurados pelo superusuário no painel administrativo

  console.log('\n✅ Seed concluído com sucesso!');
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║         🎉  BANCO DE DADOS INICIALIZADO!  🎉             ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n🔐 CREDENCIAIS DE ACESSO INICIAL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n👑 SUPERUSUÁRIO (Controle Total):');
  console.log(`   📧 Email: ${SUPERUSER_EMAIL}`);
  console.log(`   🔑 Senha: ${SUPERUSER_PASSWORD}`);
  console.log(`   👤 Nome:  ${SUPERUSER_NAME}`);
  console.log('\n👨‍💼 SUPERVISOR (Gestão Operacional):');
  console.log(`   📧 Email: ${SUPERVISOR_EMAIL}`);
  console.log(`   🔑 Senha: ${SUPERVISOR_PASSWORD}`);
  console.log(`   👤 Nome:  ${SUPERVISOR_NAME}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 CONFIGURAÇÃO INICIAL NECESSÁRIA:');
  console.log('   1. Faça login como superusuário');
  console.log('   2. Configure setores (Administração → Gerenciar Setores)');
  console.log('   3. Configure locais para cada setor');
  console.log('   4. Configure tipos de bens (Administração → Tipos de Bens)');
  console.log('   5. Configure formas de aquisição');
  console.log('   6. Atribua setores ao supervisor');
  console.log('   7. Altere as senhas padrão!\n');
  console.log('⚠️  IMPORTANTE: Altere as senhas após o primeiro acesso!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

