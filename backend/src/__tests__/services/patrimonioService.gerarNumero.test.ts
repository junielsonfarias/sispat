jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

// Após a numeração por município, tanto a busca do "último" quanto a checagem
// de colisão usam findFirst (escopadas por municipalityId).
const mockTx = {
  patrimonio: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({
  prisma: {
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}));

import { gerarNumeroPatrimonial } from '../../services/patrimonioService';

const MUN = 'mun-A';

describe('gerarNumeroPatrimonial', () => {
  beforeEach(() => {
    mockTx.patrimonio.findFirst.mockReset();
  });

  it('gera o primeiro número quando não há patrimônios anteriores no município', async () => {
    mockTx.patrimonio.findFirst
      .mockResolvedValueOnce(null) // último
      .mockResolvedValueOnce(null); // colisão

    const result = await gerarNumeroPatrimonial({
      municipalityId: MUN,
      prefix: 'PAT',
      year: 2026,
      sectorCode: '01',
    });

    expect(result).toEqual({
      numero: 'PAT202601000001',
      year: 2026,
      sectorCode: '01',
      sequencial: 1,
    });
    // a busca do último é escopada por município
    expect(mockTx.patrimonio.findFirst.mock.calls[0][0].where.municipalityId).toBe(MUN);
  });

  it('incrementa o sequencial baseado no último patrimônio do município', async () => {
    mockTx.patrimonio.findFirst
      .mockResolvedValueOnce({ numero_patrimonio: 'PAT202601000042' })
      .mockResolvedValueOnce(null);

    const result = await gerarNumeroPatrimonial({
      municipalityId: MUN,
      prefix: 'PAT',
      year: 2026,
      sectorCode: '01',
    });

    expect(result.sequencial).toBe(43);
    expect(result.numero).toBe('PAT202601000043');
  });

  it('faz retry quando o número gerado já existe e sucesso na segunda tentativa', async () => {
    mockTx.patrimonio.findFirst
      .mockResolvedValueOnce({ numero_patrimonio: 'PAT202601000010' }) // último (1ª)
      .mockResolvedValueOnce({ id: 'existe' }) // colisão (1ª) -> retry
      .mockResolvedValueOnce({ numero_patrimonio: 'PAT202601000011' }) // último (2ª)
      .mockResolvedValueOnce(null); // colisão (2ª) -> ok

    const result = await gerarNumeroPatrimonial({
      municipalityId: MUN,
      prefix: 'PAT',
      year: 2026,
      sectorCode: '01',
      maxRetries: 3,
    });

    expect(result.sequencial).toBe(12);
  });

  it('lança erro após esgotar retries', async () => {
    mockTx.patrimonio.findFirst.mockResolvedValue({
      numero_patrimonio: 'PAT202601000005',
      id: 'sempre-existe',
    });

    await expect(
      gerarNumeroPatrimonial({
        municipalityId: MUN,
        prefix: 'PAT',
        year: 2026,
        sectorCode: '01',
        maxRetries: 2,
      }),
    ).rejects.toThrow();
  });

  it('aplica defaults (prefix PAT, ano corrente, setor 00)', async () => {
    mockTx.patrimonio.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const result = await gerarNumeroPatrimonial({ municipalityId: MUN });
    const year = new Date().getFullYear();
    expect(result.numero).toBe(`PAT${year}00000001`);
    expect(result.year).toBe(year);
    expect(result.sectorCode).toBe('00');
  });
});
