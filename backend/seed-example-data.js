const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedExampleData() {
  try {
    console.log('🌱 Populando banco com dados de exemplo...\n');

    // Buscar município
    const municipality = await prisma.municipality.findFirst();
    if (!municipality) {
      console.log('❌ Nenhum município encontrado!');
      return;
    }
    console.log('✅ Município:', municipality.name);

    // Buscar usuário superuser
    const superuser = await prisma.user.findFirst({
      where: { role: 'superuser' },
    });
    if (!superuser) {
      console.log('❌ Superusuário não encontrado!');
      return;
    }
    console.log('✅ Superusuário:', superuser.name);

    // 1. Criar Setores
    console.log('\n📍 Criando setores...');
    const setores = await Promise.all([
      prisma.sector.upsert({
        where: { codigo: 'SEC-ADM' },
        update: {},
        create: {
          id: 'sector-adm',
          name: 'Secretaria de Administração',
          codigo: 'SEC-ADM',
          description: 'Gestão administrativa e recursos humanos',
          municipalityId: municipality.id,
        },
      }),
      prisma.sector.upsert({
        where: { codigo: 'SEC-EDU' },
        update: {},
        create: {
          id: 'sector-edu',
          name: 'Secretaria de Educação',
          codigo: 'SEC-EDU',
          description: 'Gestão escolar e educacional',
          municipalityId: municipality.id,
        },
      }),
      prisma.sector.upsert({
        where: { codigo: 'SEC-SAU' },
        update: {},
        create: {
          id: 'sector-sau',
          name: 'Secretaria de Saúde',
          codigo: 'SEC-SAU',
          description: 'Gestão de saúde pública',
          municipalityId: municipality.id,
        },
      }),
    ]);
    console.log(`✅ ${setores.length} setores criados`);

    // 2. Criar Locais
    console.log('\n📌 Criando locais...');
    const locais = await Promise.all([
      prisma.local.upsert({
        where: { id: 'local-adm-sala1' },
        update: {},
        create: {
          id: 'local-adm-sala1',
          name: 'Sala da Secretaria',
          description: 'Sala principal da secretaria',
          sectorId: 'sector-adm',
          municipalityId: municipality.id,
        },
      }),
      prisma.local.upsert({
        where: { id: 'local-edu-escola1' },
        update: {},
        create: {
          id: 'local-edu-escola1',
          name: 'Escola Municipal Centro',
          description: 'Escola do centro da cidade',
          sectorId: 'sector-edu',
          municipalityId: municipality.id,
        },
      }),
      prisma.local.upsert({
        where: { id: 'local-sau-posto1' },
        update: {},
        create: {
          id: 'local-sau-posto1',
          name: 'Posto de Saúde Central',
          description: 'Posto de saúde principal',
          sectorId: 'sector-sau',
          municipalityId: municipality.id,
        },
      }),
    ]);
    console.log(`✅ ${locais.length} locais criados`);

    // 3. Criar Formas de Aquisição
    console.log('\n💰 Criando formas de aquisição...');
    const formas = await Promise.all([
      prisma.acquisitionForm.upsert({
        where: { id: 'aquisicao-compra' },
        update: {},
        create: {
          id: 'aquisicao-compra',
          nome: 'Compra',
          descricao: 'Aquisição por meio de compra direta',
          municipalityId: municipality.id,
        },
      }),
      prisma.acquisitionForm.upsert({
        where: { id: 'aquisicao-doacao' },
        update: {},
        create: {
          id: 'aquisicao-doacao',
          nome: 'Doação',
          descricao: 'Recebido como doação',
          municipalityId: municipality.id,
        },
      }),
      prisma.acquisitionForm.upsert({
        where: { id: 'aquisicao-comodato' },
        update: {},
        create: {
          id: 'aquisicao-comodato',
          nome: 'Comodato',
          descricao: 'Empréstimo de uso gratuito',
          municipalityId: municipality.id,
        },
      }),
    ]);
    console.log(`✅ ${formas.length} formas de aquisição criadas`);

    // 4. Verificar se já existe tipo de bem
    let tipoBem = await prisma.tipoBem.findFirst();
    if (!tipoBem) {
      console.log('\n🏷️ Criando tipo de bem...');
      tipoBem = await prisma.tipoBem.create({
        data: {
          id: 'tipo-movel',
          nome: 'Móvel',
          descricao: 'Bens móveis em geral',
          municipalityId: municipality.id,
        },
      });
      console.log('✅ Tipo de bem criado');
    } else {
      console.log('\n✅ Tipo de bem já existe:', tipoBem.nome);
    }

    // 5. Criar Patrimônios de Exemplo
    console.log('\n📦 Criando patrimônios de exemplo...');
    const patrimonios = [];

    for (let i = 1; i <= 5; i++) {
      const setor = setores[i % setores.length];
      const local = locais[i % locais.length];
      const forma = formas[i % formas.length];

      const numeroPatrimonio = `PAT-${String(i).padStart(6, '0')}`;

      const patrimonio = await prisma.patrimonio.create({
        data: {
          numero_patrimonio: numeroPatrimonio,
          descricao_bem: `Bem de Exemplo ${i}`,
          marca: `Marca ${i}`,
          modelo: `Modelo ${i}`,
          numero_serie: `SN-${i}`,
          valor_aquisicao: 1000 + (i * 500),
          data_aquisicao: new Date(),
          estado_conservacao: ['ÓTIMO', 'BOM', 'REGULAR'][i % 3],
          situacao_bem: 'ativo',
          observacoes: `Bem de exemplo criado pelo seed #${i}`,
          sectorId: setor.id,
          localId: local.id,
          tipoBemId: tipoBem.id,
          acquisitionFormId: forma.id,
          creatorId: superuser.id,
          municipalityId: municipality.id,
        },
      });

      patrimonios.push(patrimonio);
    }

    console.log(`✅ ${patrimonios.length} patrimônios criados`);

    console.log('\n✅ Seed de dados de exemplo concluído!\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║         🎉  DADOS DE EXEMPLO CRIADOS!  🎉               ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log('📊 Resumo:');
    console.log(`   - Setores: ${setores.length}`);
    console.log(`   - Locais: ${locais.length}`);
    console.log(`   - Formas de Aquisição: ${formas.length}`);
    console.log(`   - Tipos de Bens: 1`);
    console.log(`   - Patrimônios: ${patrimonios.length}\n`);
    console.log('🎯 Próximos passos:');
    console.log('   1. Recarregue o frontend (F5)');
    console.log('   2. Vá em "Bens Cadastrados"');
    console.log('   3. Você verá 5 bens de exemplo! ✅\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedExampleData();

