/**
 * limpar-descricoes-importadas — remove o ruído de "topo de página" que vazou
 * para a descrição de bens importados ANTES da correção do parser (separadores
 * "----", cabeçalho "DOTAÇÃO ... VALOR(R$)" e sub-cabeçalho "quantidade ...
 * valor total" que aparecem no meio da descrição quando ela quebra de página).
 *
 * Caso real: PAT202600000477 ("Caixa Ativa, Tourcab 1800 Dsp 15 1800w ----...
 * DOTAÇÃO EMPENHO NOTA FISCAL LIQUIDAÇÃO VALOR(R$) ----... 450wrms, Cor Preto.").
 *
 * É idempotente e SEGURO: por padrão faz dry-run (só lista o que mudaria);
 * passe --apply para gravar. NÃO toca em descrições que já estão limpas.
 *
 * Uso (a partir de backend/):
 *   npm run cleanup:descricoes            # dry-run: mostra antes → depois
 *   npm run cleanup:descricoes:apply      # aplica as correções no banco
 *
 * Direto via ts-node:
 *   ts-node --transpile-only scripts/limpar-descricoes-importadas.ts [--apply] [--limit=N]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Args {
  apply: boolean;
  limit: number; // 0 = sem limite (apenas para inspecionar amostras no dry-run)
}

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
  return { apply, limit: Number.isNaN(limit) ? 0 : limit };
};

// Remove o ruído do meio da descrição e normaliza espaços/pontuação.
// Conservador: só mexe no que é claramente ruído de relatório.
export const limparDescricao = (descricao: string): string => {
  let out = descricao;

  // Cabeçalho da tabela: "DOTAÇÃO  EMPENHO  NOTA FISCAL  LIQUIDAÇÃO  VALOR(R$)".
  out = out.replace(
    /DOTA[ÇC][ÃA]O\s+EMPENHO\s+NOTA\s+FISCAL\s+LIQUIDA[ÇC][ÃA]O\s+VALOR\s*\(R\$\)/gi,
    ' ',
  );
  // Sub-cabeçalho dos itens: "quantidade unidade especificação valor unitário valor total".
  out = out.replace(
    /quantidade\s+unidade\s+especifica[çc][ãa]o\s+valor\s+unit[áa]rio\s+valor\s+total/gi,
    ' ',
  );
  // Resíduo solto do token de valor, caso o cabeçalho tenha vindo fragmentado.
  out = out.replace(/VALOR\s*\(R\$\)/gi, ' ');
  // Sequências de hífens (separadores de página: "------------------").
  out = out.replace(/-{3,}/g, ' ');
  // Normaliza espaços e remove espaço antes de pontuação.
  out = out.replace(/\s+/g, ' ').trim();
  out = out.replace(/\s+([,.;:])/g, '$1');

  return out;
};

// Heurística de "tem ruído": contém separador longo OU os termos do cabeçalho.
const temRuido = (descricao: string): boolean =>
  /-{3,}/.test(descricao) ||
  /VALOR\s*\(R\$\)/i.test(descricao) ||
  /DOTA[ÇC][ÃA]O\s+EMPENHO/i.test(descricao);

async function main() {
  const { apply, limit } = parseArgs();

  console.log(
    `🧹 Limpeza de descrições importadas — modo: ${apply ? 'APLICAR (grava no banco)' : 'DRY-RUN (sem gravar)'}\n`,
  );

  // Busca candidatos com indícios de ruído (separador ou "VALOR(R$)").
  const candidatos = await prisma.patrimonio.findMany({
    where: {
      OR: [
        { descricao_bem: { contains: '----' } },
        { descricao_bem: { contains: 'VALOR(R$)' } },
        { descricao_bem: { contains: 'DOTAÇÃO' } },
      ],
    },
    select: { id: true, numero_patrimonio: true, descricao_bem: true },
    orderBy: { numero_patrimonio: 'asc' },
  });

  const afetados = candidatos
    .filter((p) => temRuido(p.descricao_bem))
    .map((p) => ({ ...p, limpa: limparDescricao(p.descricao_bem) }))
    .filter((p) => p.limpa !== p.descricao_bem && p.limpa.length > 0);

  if (afetados.length === 0) {
    console.log('✅ Nenhuma descrição com ruído encontrada. Nada a fazer.');
    return;
  }

  const amostra = limit > 0 ? afetados.slice(0, limit) : afetados;
  console.log(`Encontrados ${afetados.length} bem(ns) com ruído na descrição.\n`);
  for (const p of amostra) {
    console.log(`• ${p.numero_patrimonio}`);
    console.log(`    antes:  ${p.descricao_bem}`);
    console.log(`    depois: ${p.limpa}\n`);
  }
  if (limit > 0 && afetados.length > limit) {
    console.log(`… e mais ${afetados.length - limit} (use sem --limit para ver todos).\n`);
  }

  if (!apply) {
    console.log('ℹ️  DRY-RUN: nada foi gravado. Rode com --apply para aplicar.');
    return;
  }

  let ok = 0;
  for (const p of afetados) {
    await prisma.patrimonio.update({
      where: { id: p.id },
      data: { descricao_bem: p.limpa },
    });
    ok += 1;
  }
  console.log(`✅ ${ok} descrição(ões) limpa(s) e gravada(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na limpeza de descrições:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
