/**
 * renumerar-importados — renumera os bens importados que ficaram com o formato
 * antigo "PAT{ano}00{seq}" para o formato do sistema (NumberingPattern configurado
 * ou, sem padrão, {ano}{codigoSetor}{seq}) — POR SETOR. Equivalente a re-importar,
 * mas in-place (preserva almoxarifado, histórico e distribuições).
 *
 * Identifica os importados pelo marcador nas observações + prefixo "PAT".
 * Idempotente: bens já no novo formato não são tocados.
 *
 * Uso (a partir de backend/):
 *   npm run renumerar:importados          # dry-run (não grava)
 *   npm run renumerar:importados:apply    # aplica
 */
import { PrismaClient } from '@prisma/client';
import { buildPrefixAndSeqLen, formatNumero } from '../src/services/numberingService';

const prisma = new PrismaClient();
const MARCADOR = 'Importado do relatório de liquidação SIAFIC';

const parseArgs = () => ({ apply: process.argv.slice(2).includes('--apply') });

interface Comp {
  type: 'text' | 'year' | 'sequence' | 'sector';
  value?: string;
  format?: 'YYYY' | 'YY';
  length?: number;
  sectorCodeLength?: number;
}

async function main() {
  const { apply } = parseArgs();
  console.log(
    `🔢 Renumeração de bens importados — modo: ${apply ? 'APLICAR (grava)' : 'DRY-RUN (não grava)'}\n`,
  );

  // Candidatos: importados (marcador) com número no formato antigo "PAT...".
  const candidatos = await prisma.patrimonio.findMany({
    where: {
      observacoes: { contains: MARCADOR },
      numero_patrimonio: { startsWith: 'PAT' },
    },
    select: { id: true, numero_patrimonio: true, sectorId: true, municipalityId: true },
    orderBy: { numero_patrimonio: 'asc' },
  });

  if (candidatos.length === 0) {
    console.log('✅ Nenhum bem importado no formato antigo (PAT). Nada a fazer.');
    return;
  }

  // Agrupa por setor.
  const porSetor = new Map<string, typeof candidatos>();
  for (const c of candidatos) {
    const arr = porSetor.get(c.sectorId) ?? [];
    arr.push(c);
    porSetor.set(c.sectorId, arr);
  }

  const year = new Date().getFullYear();
  const plano: { id: string; de: string; para: string }[] = [];

  for (const [sectorId, bens] of porSetor) {
    const setor = await prisma.sector.findUnique({
      where: { id: sectorId },
      select: { codigo: true, name: true, municipalityId: true },
    });
    if (!setor) {
      console.log(`⚠️  Setor ${sectorId} não encontrado — pulando ${bens.length} bem(ns).`);
      continue;
    }
    const pattern = await prisma.numberingPattern.findUnique({
      where: { municipalityId: setor.municipalityId },
      select: { components: true },
    });
    const components = (pattern?.components as unknown as Comp[]) ?? [];
    const { prefix, seqLen } = buildPrefixAndSeqLen(components, year, setor.codigo);

    // Maior sequencial JÁ existente com esse prefixo (ex.: bens manuais) — não colide.
    const ultimo = await prisma.patrimonio.findFirst({
      where: { municipalityId: setor.municipalityId, numero_patrimonio: { startsWith: prefix } },
      orderBy: { numero_patrimonio: 'desc' },
      select: { numero_patrimonio: true },
    });
    let seq = 1;
    if (ultimo) {
      const n = parseInt(ultimo.numero_patrimonio.slice(prefix.length), 10);
      if (!Number.isNaN(n)) seq = n + 1;
    }

    for (const b of bens) {
      plano.push({ id: b.id, de: b.numero_patrimonio, para: formatNumero(prefix, seqLen, seq) });
      seq += 1;
    }
    console.log(`• ${setor.name} [${setor.codigo}] → ${bens.length} bem(ns), prefixo ${prefix}`);
  }

  console.log(`\nTotal a renumerar: ${plano.length}`);
  for (const p of plano.slice(0, 5)) console.log(`   ${p.de}  →  ${p.para}`);
  if (plano.length > 5) console.log(`   … e mais ${plano.length - 5}.`);

  if (!apply) {
    console.log('\nℹ️  DRY-RUN: nada gravado. Rode com --apply para renumerar.');
    return;
  }

  let ok = 0;
  for (const p of plano) {
    await prisma.$transaction([
      prisma.patrimonio.update({ where: { id: p.id }, data: { numero_patrimonio: p.para } }),
      prisma.historicoEntry.create({
        data: {
          patrimonioId: p.id,
          date: new Date(),
          action: 'RENUMERAÇÃO',
          details: `Número ajustado ao formato do sistema: ${p.de} → ${p.para}`,
          user: 'sistema',
        },
      }),
    ]);
    ok += 1;
  }
  console.log(`\n✅ ${ok} bem(ns) renumerado(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na renumeração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
