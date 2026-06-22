/**
 * Seed de DEMONSTRAÇÃO — cria um usuário para cada papel do SISPAT com senha
 * conhecida, para apresentações/ambiente de demo.
 *
 * ⚠️  NÃO rodar em produção real. Estas credenciais são públicas (aparecem no
 *     card de demonstração da tela de login quando VITE_DEMO_MODE=true ou em dev).
 *
 * Uso:  npm run prisma:seed:demo
 *
 * Mantenha esta lista em sincronia com o card do frontend:
 *   src/components/auth/DemoCredentials.tsx
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Senha única para todas as contas de demonstração (conveniência em demo).
const DEMO_PASSWORD = 'Demo@2025';

type DemoAccount = {
  id: string;
  email: string;
  name: string;
  role: 'superuser' | 'admin' | 'supervisor' | 'usuario' | 'visualizador';
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: 'demo-superuser', email: 'superuser@sispat.demo', name: 'Demo · Superusuário', role: 'superuser' },
  { id: 'demo-admin', email: 'admin@sispat.demo', name: 'Demo · Administrador', role: 'admin' },
  { id: 'demo-supervisor', email: 'supervisor@sispat.demo', name: 'Demo · Supervisor', role: 'supervisor' },
  { id: 'demo-usuario', email: 'usuario@sispat.demo', name: 'Demo · Usuário', role: 'usuario' },
  { id: 'demo-visualizador', email: 'visualizador@sispat.demo', name: 'Demo · Visualizador', role: 'visualizador' },
];

async function main() {
  console.log('🌱 Seed de DEMONSTRAÇÃO — criando usuários de demo...\n');

  // Garante o município padrão (mesmo id usado pelo seed principal).
  const municipality = await prisma.municipality.upsert({
    where: { id: 'municipality-1' },
    update: {},
    create: {
      id: 'municipality-1',
      name: process.env.MUNICIPALITY_NAME || 'Prefeitura Municipal (Demo)',
      state: process.env.STATE || 'PA',
      primaryColor: '#3B82F6',
      footerText: 'Ambiente de Demonstração',
    },
  });

  const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  for (const account of DEMO_ACCOUNTS) {
    const email = account.email.toLowerCase(); // login compara em lowercase
    await prisma.user.upsert({
      where: { email },
      update: {
        name: account.name,
        password: passwordHash,
        role: account.role,
        isActive: true,
      },
      create: {
        id: account.id,
        email,
        name: account.name,
        password: passwordHash,
        role: account.role,
        responsibleSectors: [],
        municipalityId: municipality.id,
        isActive: true,
      },
    });
    console.log(`✅ ${account.role.padEnd(13)} → ${email}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎭 CONTAS DE DEMONSTRAÇÃO CRIADAS');
  console.log(`   Senha (todas): ${DEMO_PASSWORD}`);
  console.log('   Aparecem na tela de login em dev ou com VITE_DEMO_MODE=true.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de demonstração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
