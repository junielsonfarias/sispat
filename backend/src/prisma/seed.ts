import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // Criar Município
  console.log('📍 Criando município...');
  const municipality = await prisma.municipality.upsert({
    where: { id: 'municipality-1' },
    update: {},
    create: {
      id: 'municipality-1',
      name: 'São Sebastião da Boa Vista',
      state: 'PA',
      primaryColor: '#3B82F6',
      logoUrl: null,
      footerText: 'Prefeitura Municipal de São Sebastião da Boa Vista',
    },
  });
  console.log('✅ Município criado:', municipality.name);

  // Criar Setores
  console.log('\n🏢 Criando setores...');
  const sectors = await Promise.all([
    prisma.sector.upsert({
      where: { codigo: '001' },
      update: {},
      create: {
        id: 'sector-1',
        name: 'Secretaria de Administração',
        codigo: '001',
        description: 'Gerencia os recursos administrativos do município',
        municipalityId: municipality.id,
      },
    }),
    prisma.sector.upsert({
      where: { codigo: '002' },
      update: {},
      create: {
        id: 'sector-2',
        name: 'Secretaria de Educação',
        codigo: '002',
        description: 'Responsável pela educação municipal',
        municipalityId: municipality.id,
      },
    }),
    prisma.sector.upsert({
      where: { codigo: '003' },
      update: {},
      create: {
        id: 'sector-3',
        name: 'Secretaria de Saúde',
        codigo: '003',
        description: 'Gerencia a saúde pública municipal',
        municipalityId: municipality.id,
      },
    }),
  ]);
  console.log(`✅ ${sectors.length} setores criados`);

  // Criar Locais
  console.log('\n📍 Criando locais...');
  const locais = await Promise.all([
    prisma.local.upsert({
      where: { id: 'local-1' },
      update: {},
      create: {
        id: 'local-1',
        name: 'Prédio Principal',
        description: 'Prédio principal da prefeitura',
        sectorId: sectors[0].id,
        municipalityId: municipality.id,
      },
    }),
    prisma.local.upsert({
      where: { id: 'local-2' },
      update: {},
      create: {
        id: 'local-2',
        name: 'Almoxarifado Central',
        description: 'Almoxarifado para armazenamento de materiais',
        sectorId: sectors[0].id,
        municipalityId: municipality.id,
      },
    }),
  ]);
  console.log(`✅ ${locais.length} locais criados`);

  // Obter credenciais do superusuário das variáveis de ambiente
  const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL || 'admin@sistema.com';
  const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD || 'Admin@123';
  const SUPERUSER_NAME = process.env.SUPERUSER_NAME || 'Administrador do Sistema';

  console.log('\n👥 Criando superusuário...');
  console.log(`   Email: ${SUPERUSER_EMAIL}`);
  
  // Hash da senha do superusuário
  // ✅ Bcrypt rounds aumentado para 12 (mais seguro em 2025)
  const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const superuserPasswordHash = await bcrypt.hash(SUPERUSER_PASSWORD, BCRYPT_ROUNDS);

  // Criar APENAS o Superusuário (usuário principal)
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
  console.log('✅ Superusuário criado com sucesso!');

  // Criar Tipos de Bens
  console.log('\n📦 Criando tipos de bens...');
  const tiposBens = await Promise.all([
    prisma.tipoBem.upsert({
      where: { id: 'tipo-1' },
      update: {},
      create: {
        id: 'tipo-1',
        nome: 'Móveis e Utensílios',
        descricao: 'Móveis de escritório, cadeiras, mesas, etc.',
        vidaUtilPadrao: 10,
        taxaDepreciacao: 10,
        ativo: true,
        municipalityId: municipality.id,
      },
    }),
    prisma.tipoBem.upsert({
      where: { id: 'tipo-2' },
      update: {},
      create: {
        id: 'tipo-2',
        nome: 'Equipamentos de Informática',
        descricao: 'Computadores, notebooks, impressoras, etc.',
        vidaUtilPadrao: 5,
        taxaDepreciacao: 20,
        ativo: true,
        municipalityId: municipality.id,
      },
    }),
    prisma.tipoBem.upsert({
      where: { id: 'tipo-3' },
      update: {},
      create: {
        id: 'tipo-3',
        nome: 'Veículos',
        descricao: 'Carros, caminhões, motos, etc.',
        vidaUtilPadrao: 10,
        taxaDepreciacao: 20,
        ativo: true,
        municipalityId: municipality.id,
      },
    }),
  ]);
  console.log(`✅ ${tiposBens.length} tipos de bens criados`);

  // Criar Formas de Aquisição
  console.log('\n💰 Criando formas de aquisição...');
  const formasAquisicao = await Promise.all([
    prisma.acquisitionForm.upsert({
      where: { id: 'forma-1' },
      update: {},
      create: {
        id: 'forma-1',
        nome: 'Compra',
        descricao: 'Aquisição por meio de compra',
        ativo: true,
        municipalityId: municipality.id,
      },
    }),
    prisma.acquisitionForm.upsert({
      where: { id: 'forma-2' },
      update: {},
      create: {
        id: 'forma-2',
        nome: 'Doação',
        descricao: 'Aquisição por meio de doação',
        ativo: true,
        municipalityId: municipality.id,
      },
    }),
    prisma.acquisitionForm.upsert({
      where: { id: 'forma-3' },
      update: {},
      create: {
        id: 'forma-3',
        nome: 'Transferência',
        descricao: 'Aquisição por transferência de outro órgão',
        ativo: true,
        municipalityId: municipality.id,
      },
    }),
  ]);
  console.log(`✅ ${formasAquisicao.length} formas de aquisição criadas`);

  console.log('\n✅ Seed concluído com sucesso!');
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║         🎉  BANCO DE DADOS INICIALIZADO!  🎉             ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n🔐 CREDENCIAL DO SUPERUSUÁRIO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 Email: ${SUPERUSER_EMAIL}`);
  console.log(`🔑 Senha: ${SUPERUSER_PASSWORD}`);
  console.log(`👤 Nome:  ${SUPERUSER_NAME}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  IMPORTANTE: Altere esta senha após o primeiro acesso!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

