const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restaurarDadosEspecificos() {
  try {
    console.log('🔄 Restaurando dados específicos do backup...\n');
    
    // 1. Restaurar usuário Marcelo
    console.log('👤 Restaurando usuário Marcelo...');
    try {
      await prisma.user.upsert({
        where: { email: 'marcelo@sistema.com' },
        update: {},
        create: {
          id: '72f4c64d-9958-44ed-b3ca-5705cc5007c2',
          email: 'marcelo@sistema.com',
          name: 'Marcelo',
          password: '$2b$12$PvqA/xzk94kM720zi5lGz.3G2KhZPDlrsTPgvxjEkUkxtm0BS/7EO',
          role: 'usuario',
          responsibleSectors: ['Secretaria de Administração e Finanças'],
          municipalityId: 'municipality-1',
          isActive: true,
          createdAt: new Date('2025-10-11T14:35:19.912Z'),
          updatedAt: new Date('2025-10-11T14:35:19.912Z')
        }
      });
      console.log('✅ Usuário Marcelo restaurado');
    } catch (error) {
      console.log('⚠️  Usuário Marcelo já existe ou erro:', error.message);
    }
    
    // 2. Restaurar setor
    console.log('\n🏢 Restaurando setor...');
    try {
      await prisma.sector.upsert({
        where: { id: '1d9f2ea0-7f19-4356-8ebe-00569ce445fa' },
        update: {},
        create: {
          id: '1d9f2ea0-7f19-4356-8ebe-00569ce445fa',
          name: 'Secretaria de Administração e Finanças',
          codigo: '01',
          description: null,
          municipalityId: 'municipality-1',
          cnpj: '',
          endereco: 'Praça da Matriz',
          parentId: null,
          responsavel: 'Secretaria de Administração e Finanças',
          sigla: 'SEMAF',
          createdAt: new Date('2025-10-09T22:26:33.260Z'),
          updatedAt: new Date('2025-10-09T22:26:33.260Z')
        }
      });
      console.log('✅ Setor restaurado');
    } catch (error) {
      console.log('⚠️  Setor já existe ou erro:', error.message);
    }
    
    // 3. Restaurar local
    console.log('\n📍 Restaurando local...');
    try {
      await prisma.local.upsert({
        where: { id: 'e8a87e0f-bbc2-41b3-992e-c4561a65529c' },
        update: {},
        create: {
          id: 'e8a87e0f-bbc2-41b3-992e-c4561a65529c',
          name: 'Sala 01',
          description: null,
          sectorId: '1d9f2ea0-7f19-4356-8ebe-00569ce445fa',
          municipalityId: 'municipality-1',
          createdAt: new Date('2025-10-11T01:11:38.916Z'),
          updatedAt: new Date('2025-10-11T01:11:38.916Z')
        }
      });
      console.log('✅ Local restaurado');
    } catch (error) {
      console.log('⚠️  Local já existe ou erro:', error.message);
    }
    
    // 4. Restaurar tipo de bem
    console.log('\n📦 Restaurando tipo de bem...');
    try {
      await prisma.tipoBem.upsert({
        where: { id: '05308ccd-9b69-4476-aaf2-b9ceb968454f' },
        update: {},
        create: {
          id: '05308ccd-9b69-4476-aaf2-b9ceb968454f',
          nome: 'Eletronico',
          descricao: 'Eletronicos',
          vidaUtilPadrao: 5,
          taxaDepreciacao: 20,
          ativo: true,
          municipalityId: 'municipality-1',
          createdAt: new Date('2025-10-10T23:51:55.080Z'),
          updatedAt: new Date('2025-10-10T23:51:55.080Z')
        }
      });
      console.log('✅ Tipo de bem restaurado');
    } catch (error) {
      console.log('⚠️  Tipo de bem já existe ou erro:', error.message);
    }
    
    // 5. Restaurar forma de aquisição
    console.log('\n💰 Restaurando forma de aquisição...');
    try {
      await prisma.acquisitionForm.upsert({
        where: { id: 'f8af5609-b8a6-40c7-acb9-ad56ea1162d3' },
        update: {},
        create: {
          id: 'f8af5609-b8a6-40c7-acb9-ad56ea1162d3',
          nome: 'Licitação',
          descricao: 'Aquisição via processo licitatório',
          ativo: true,
          municipalityId: 'municipality-1',
          createdAt: new Date('2025-10-10T23:51:55.080Z'),
          updatedAt: new Date('2025-10-10T23:51:55.080Z')
        }
      });
      console.log('✅ Forma de aquisição restaurada');
    } catch (error) {
      console.log('⚠️  Forma de aquisição já existe ou erro:', error.message);
    }
    
    // 6. Restaurar patrimônio
    console.log('\n💻 Restaurando patrimônio...');
    try {
      await prisma.patrimonio.upsert({
        where: { numero_patrimonio: '202501000001' },
        update: {},
        create: {
          id: 'e0b222a2-711c-42b2-b1a4-d30b4929648b',
          numero_patrimonio: '202501000001',
          descricao_bem: 'Notebook Dell',
          tipo: 'Eletronico',
          marca: 'Dell',
          modelo: 'Vostro 15',
          cor: 'Azul',
          numero_serie: 'SN123456',
          data_aquisicao: new Date('2025-09-30T00:00:00.000Z'),
          valor_aquisicao: 4200,
          quantidade: 1,
          numero_nota_fiscal: '1516156161csadc',
          forma_aquisicao: 'Licitação',
          setor_responsavel: 'Secretaria de Administração e Finanças',
          local_objeto: 'Sala 01',
          status: 'ativo',
          situacao_bem: 'bom',
          observacoes: null,
          fotos: ['/uploads/blob-1760217708109-729506045'],
          documentos: [],
          metodo_depreciacao: 'Linear',
          vida_util_anos: 5,
          valor_residual: 1000,
          municipalityId: 'municipality-1',
          sectorId: '1d9f2ea0-7f19-4356-8ebe-00569ce445fa',
          localId: 'e8a87e0f-bbc2-41b3-992e-c4561a65529c',
          tipoId: '05308ccd-9b69-4476-aaf2-b9ceb968454f',
          acquisitionFormId: 'f8af5609-b8a6-40c7-acb9-ad56ea1162d3',
          createdBy: 'user-supervisor',
          updatedBy: 'user-supervisor',
          createdAt: new Date('2025-10-11T21:21:51.460Z'),
          updatedAt: new Date('2025-10-12T20:35:14.863Z')
        }
      });
      console.log('✅ Patrimônio restaurado');
    } catch (error) {
      console.log('⚠️  Patrimônio já existe ou erro:', error.message);
    }
    
    console.log('\n🎉 Restauração de dados específicos concluída!');
    
    // Verificar dados restaurados
    console.log('\n🔍 Verificando dados restaurados...');
    
    const users = await prisma.user.findMany();
    const sectors = await prisma.sector.findMany();
    const locais = await prisma.local.findMany();
    const patrimonios = await prisma.patrimonio.findMany();
    
    console.log(`👥 Usuários: ${users.length}`);
    console.log(`🏢 Setores: ${sectors.length}`);
    console.log(`📍 Locais: ${locais.length}`);
    console.log(`📦 Patrimônios: ${patrimonios.length}`);
    
  } catch (error) {
    console.error('❌ Erro durante a restauração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restaurarDadosEspecificos();
