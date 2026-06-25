/**
 * numberingService — monta o número patrimonial conforme o padrão configurado
 * (NumberingPattern do município). Quando não há padrão configurado, usa o mesmo
 * formato do cadastro manual do frontend (`{ano}{codigoSetor}{seq6}`) — SEM a
 * sigla "PAT". Assim a importação gera no formato do sistema, não num fixo.
 */
import { Prisma } from '@prisma/client';

interface NumberingComponent {
  type: 'text' | 'year' | 'sequence' | 'sector';
  value?: string;
  format?: 'YYYY' | 'YY';
  length?: number;
  sectorCodeLength?: number;
}

// Monta o prefixo (tudo menos o sequencial) e o comprimento do sequencial a
// partir dos componentes. Sem componentes → fallback {ano}{codigoSetor}, seq 6.
export const buildPrefixAndSeqLen = (
  components: NumberingComponent[] | null | undefined,
  year: number,
  sectorCode: string,
): { prefix: string; seqLen: number } => {
  if (!components || components.length === 0) {
    return { prefix: `${year}${sectorCode}`, seqLen: 6 };
  }
  let prefix = '';
  let seqLen = 6;
  for (const c of components) {
    switch (c.type) {
      case 'text':
        prefix += c.value || '';
        break;
      case 'year':
        prefix += c.format === 'YY' ? String(year).slice(-2) : String(year);
        break;
      case 'sector':
        prefix += (sectorCode || '').padStart(c.sectorCodeLength || 2, '0');
        break;
      case 'sequence':
        seqLen = c.length || 6;
        break;
    }
  }
  return { prefix, seqLen };
};

/**
 * Dentro de uma transação: calcula o prefixo (pelo padrão configurado) e o
 * próximo sequencial para um setor (pelo maior número existente com aquele
 * prefixo no município). Retorna também seqLen para padding.
 */
export const proximoNumeroConfiguradoTx = async (
  tx: Prisma.TransactionClient,
  params: { municipalityId: string; sectorCode: string; year?: number },
): Promise<{ prefix: string; seqLen: number; sequencial: number }> => {
  const year = params.year ?? new Date().getFullYear();
  const pattern = await tx.numberingPattern.findUnique({
    where: { municipalityId: params.municipalityId },
    select: { components: true },
  });
  const components = (pattern?.components as unknown as NumberingComponent[]) ?? [];
  const { prefix, seqLen } = buildPrefixAndSeqLen(components, year, params.sectorCode);

  const ultimo = await tx.patrimonio.findFirst({
    where: {
      municipalityId: params.municipalityId,
      numero_patrimonio: { startsWith: prefix },
    },
    orderBy: { numero_patrimonio: 'desc' },
    select: { numero_patrimonio: true },
  });

  let sequencial = 1;
  if (ultimo) {
    const tail = ultimo.numero_patrimonio.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n)) sequencial = n + 1;
  }
  return { prefix, seqLen, sequencial };
};

export const formatNumero = (prefix: string, seqLen: number, sequencial: number): string =>
  `${prefix}${String(sequencial).padStart(seqLen, '0')}`;
