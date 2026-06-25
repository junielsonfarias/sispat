/**
 * backfill-historico-importacao — cria o evento de histórico "IMPORTAÇÃO" para
 * bens que foram importados ANTES de a importação passar a registrar histórico
 * por bem. Assim eles passam a aparecer na aba de histórico do BensView e na
 * Análise Temporal.
 *
 * Identifica os bens importados pelo marcador nas observações
 * ("Importado do relatório de liquidação SIAFIC") e só cria o evento para quem
 * AINDA não tem um histórico de IMPORTAÇÃO — é idempotente.
 *
 * Uso (a partir de backend/):
 *   npm run backfill:historico-importacao         # dry-run (não grava)
 *   npm run backfill:historico-importacao:apply   # aplica
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARCADOR = 'Importado do relatório de liquidação SIAFIC';
const ACTION = 'IMPORTAÇÃO';

const parseArgs = () => ({ apply: process.argv.slice(2).includes('--apply') });

const montarDetalhes = (nf: string | null, liq: string | null): string =>
  [
    'Bem importado do relatório de liquidação SIAFIC',
    nf ? `NF ${nf}` : '',
    liq ? `Liquidação ${liq}` : '',
  ]
    .filter(Boolean)
    .join(' — ');

async function main() {
  const { apply } = parseArgs();
  console.log(
    `🕁  Backfill de histórico de importação — modo: ${apply ? 'APLICAR (grava)' : 'DRY-RUN (não grava)'}\n`,
  );

  // Bens importados (pelo marcador nas observações).
  const candidatos = await prisma.patrimonio.findMany({
    where: { observacoes: { contains: MARCADOR } },
    select: {
      id: true,
      numero_patrimonio: true,
      numero_nota_fiscal: true,
      numero_liquidacao: true,
      createdAt: true,
      createdBy: true,
    },
    orderBy: { numero_patrimonio: 'asc' },
  });

  if (candidatos.length === 0) {
    console.log('✅ Nenhum bem importado encontrado pelo marcador. Nada a fazer.');
    return;
  }

  // Já têm histórico de IMPORTAÇÃO? (idempotência)
  const jaComHistorico = await prisma.historicoEntry.findMany({
    where: { action: ACTION, patrimonioId: { in: candidatos.map((c) => c.id) } },
    select: { patrimonioId: true },
  });
  const setJa = new Set(jaComHistorico.map((h) => h.patrimonioId));

  const aCriar = candidatos.filter((c) => !setJa.has(c.id));

  console.log(`Bens importados: ${candidatos.length}`);
  console.log(`Já com histórico de IMPORTAÇÃO: ${setJa.size}`);
  console.log(`A criar evento: ${aCriar.length}\n`);

  if (aCriar.length === 0) {
    console.log('✅ Todos os bens importados já têm o evento. Nada a fazer.');
    return;
  }

  // Amostra
  for (const c of aCriar.slice(0, 5)) {
    console.log(`• ${c.numero_patrimonio} → ${montarDetalhes(c.numero_nota_fiscal, c.numero_liquidacao)}`);
  }
  if (aCriar.length > 5) console.log(`… e mais ${aCriar.length - 5}.\n`);

  if (!apply) {
    console.log('\nℹ️  DRY-RUN: nada gravado. Rode com --apply para criar os eventos.');
    return;
  }

  // Data do evento = createdAt do bem (momento real da importação).
  const result = await prisma.historicoEntry.createMany({
    data: aCriar.map((c) => ({
      patrimonioId: c.id,
      date: c.createdAt,
      action: ACTION,
      details: montarDetalhes(c.numero_nota_fiscal, c.numero_liquidacao),
      user: c.createdBy,
    })),
  });

  console.log(`\n✅ ${result.count} evento(s) de histórico de IMPORTAÇÃO criado(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no backfill de histórico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
