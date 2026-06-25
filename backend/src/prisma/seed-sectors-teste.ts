/**
 * Seed de SETORES DE TESTE — cria secretarias de exemplo (Educação, Saúde,
 * Meio Ambiente) com seus fundos de recurso e um Almoxarifado em cada, para
 * validar o fluxo de importação (bens entram no almoxarifado e a secretaria
 * distribui depois).
 *
 * Usa o mesmo município padrão do seed de demonstração ('municipality-1').
 *
 * Uso:  npm run prisma:seed:setores
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MUNICIPALITY_ID = 'municipality-1';
const ALMOXARIFADO = 'Almoxarifado';

type SetorSeed = {
  codigo: string;
  name: string;
  sigla: string;
  fundos: string[];
};

const SETORES: SetorSeed[] = [
  {
    codigo: 'EDUC',
    name: 'Secretaria Municipal de Educação',
    sigla: 'SEMED',
    fundos: ['FUNDEB', 'VAAT', 'VAAF', 'Salário-Educação', 'PNAE', 'PNATE'],
  },
  {
    codigo: 'SAUDE',
    name: 'Secretaria Municipal de Saúde',
    sigla: 'SEMSA',
    fundos: ['SUS'],
  },
  {
    codigo: 'MEIOAMB',
    name: 'Secretaria Municipal de Meio Ambiente',
    sigla: 'SEMMA',
    fundos: [],
  },
];

async function main() {
  console.log('🌱 Seed de SETORES DE TESTE — criando secretarias e almoxarifados...\n');

  // Garante o município padrão (mesmo id do seed de demonstração).
  await prisma.municipality.upsert({
    where: { id: MUNICIPALITY_ID },
    update: {},
    create: {
      id: MUNICIPALITY_ID,
      name: process.env.MUNICIPALITY_NAME || 'Prefeitura Municipal (Demo)',
      state: process.env.STATE || 'PA',
      primaryColor: '#3B82F6',
      footerText: 'Ambiente de Demonstração',
    },
  });

  for (const s of SETORES) {
    const setor = await prisma.sector.upsert({
      where: { codigo: s.codigo },
      update: { name: s.name, sigla: s.sigla, fundos: s.fundos },
      create: {
        name: s.name,
        sigla: s.sigla,
        codigo: s.codigo,
        fundos: s.fundos,
        municipalityId: MUNICIPALITY_ID,
      },
    });

    // Almoxarifado da secretaria (find-or-create, sem duplicar).
    const existente = await prisma.local.findFirst({
      where: {
        sectorId: setor.id,
        municipalityId: MUNICIPALITY_ID,
        name: { equals: ALMOXARIFADO, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (!existente) {
      await prisma.local.create({
        data: {
          name: ALMOXARIFADO,
          description: 'Local de entrada dos bens importados (aguardando distribuição)',
          sectorId: setor.id,
          municipalityId: MUNICIPALITY_ID,
        },
      });
    }

    const fundosTxt = s.fundos.length ? s.fundos.join(', ') : '—';
    console.log(`✅ ${s.name.padEnd(40)} [${s.codigo}]  fundos: ${fundosTxt}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏛️  SETORES DE TESTE CRIADOS (cada um com Almoxarifado)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de setores:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
