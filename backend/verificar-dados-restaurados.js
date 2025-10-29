const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarDados() {
  try {
    console.log('🔍 Verificando dados restaurados...\n');
    
    // Verificar usuários
    const users = await prisma.user.findMany();
    console.log('👥 USUÁRIOS RESTAURADOS:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Verificar municípios
    const municipalities = await prisma.municipality.findMany();
    console.log('\n🏛️ MUNICÍPIOS RESTAURADOS:');
    municipalities.forEach(municipality => {
      console.log(`- ${municipality.name} (${municipality.state})`);
    });
    
    // Verificar setores
    const sectors = await prisma.sector.findMany();
    console.log('\n🏢 SETORES RESTAURADOS:');
    sectors.forEach(sector => {
      console.log(`- ${sector.name} (${sector.description || 'Sem descrição'})`);
    });
    
    // Verificar patrimônios
    const patrimonios = await prisma.patrimonio.findMany();
    console.log('\n📦 PATRIMÔNIOS RESTAURADOS:');
    console.log(`Total: ${patrimonios.length} patrimônios`);
    if (patrimonios.length > 0) {
      patrimonios.slice(0, 5).forEach(patrimonio => {
        console.log(`- ${patrimonio.nome} (${patrimonio.numero_patrimonio})`);
      });
      if (patrimonios.length > 5) {
        console.log(`... e mais ${patrimonios.length - 5} patrimônios`);
      }
    }
    
    // Verificar imóveis
    const imoveis = await prisma.imovel.findMany();
    console.log('\n🏠 IMÓVEIS RESTAURADOS:');
    console.log(`Total: ${imoveis.length} imóveis`);
    if (imoveis.length > 0) {
      imoveis.slice(0, 5).forEach(imovel => {
        console.log(`- ${imovel.nome} (${imovel.endereco})`);
      });
      if (imoveis.length > 5) {
        console.log(`... e mais ${imoveis.length - 5} imóveis`);
      }
    }
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarDados();
