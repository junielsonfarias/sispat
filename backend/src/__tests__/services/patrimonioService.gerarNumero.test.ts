jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockTx = {
  patrimonio: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({
  prisma: {
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}));

import { gerarNumeroPatrimonial } from '../../services/patrimonioService';

describe('gerarNumeroPatrimonial', () => {
  beforeEach(() => {
    mockTx.patrimonio.findFirst.mockReset();
    mockTx.patrimonio.findUnique.mockReset();
  });

  it('gera o primeiro número quando não há patrimônios anteriores', async () => {
    mockTx.patrimonio.findFirst.mockResolvedValueOnce(null);
    mockTx.patrimonio.findUnique.mockResolvedValueOnce(null);

    const result = await gerarNumeroPatrimonial({ prefix: 'PAT', year: 2026, sectorCode: '01' });

    expect(result).toEqual({
      numero: 'PAT202601000001',
      year: 2026,
      sectorCode: '01',
      sequencial: 1,
    });
  });

  it('incrementa o sequencial baseado no último patrimônio', async () => {
    mockTx.patrimonio.findFirst.mockResolvedValueOnce({
      numero_patrimonio: 'PAT202601000042',
    });
    mockTx.patrimonio.findUnique.mockResolvedValueOnce(null);

    const result = await gerarNumeroPatrimonial({ prefix: 'PAT', year: 2026, sectorCode: '01' });

    expect(result.sequencial).toBe(43);
    expect(result.numero).toBe('PAT202601000043');
  });

  it('faz retry quando o número gerado já existe e sucesso na segunda tentativa', async () => {
    mockTx.patrimonio.findFirst
      .mockResolvedValueOnce({ numero_patrimonio: 'PAT202601000010' })
      .mockResolvedValueOnce({ numero_patrimonio: 'PAT202601000011' });
    mockTx.patrimonio.findUnique
      .mockResolvedValueOnce({ id: 'existe' }) // conflito na 1ª
      .mockResolvedValueOnce(null); // ok na 2ª

    const result = await gerarNumeroPatrimonial({
      prefix: 'PAT',
      year: 2026,
      sectorCode: '01',
      maxRetries: 3,
    });

    expect(result.sequencial).toBe(12);
  });

  it('lança erro após esgotar retries', async () => {
    mockTx.patrimonio.findFirst.mockResolvedValue({ numero_patrimonio: 'PAT202601000005' });
    mockTx.patrimonio.findUnique.mockResolvedValue({ id: 'sempre-existe' });

    await expect(
      gerarNumeroPatrimonial({ prefix: 'PAT', year: 2026, sectorCode: '01', maxRetries: 2 }),
    ).rejects.toThrow();
  });

  it('aplica defaults (prefix PAT, ano corrente, setor 00)', async () => {
    mockTx.patrimonio.findFirst.mockResolvedValueOnce(null);
    mockTx.patrimonio.findUnique.mockResolvedValueOnce(null);

    const result = await gerarNumeroPatrimonial({});
    const year = new Date().getFullYear();
    expect(result.numero).toBe(`PAT${year}00000001`);
    expect(result.year).toBe(year);
    expect(result.sectorCode).toBe('00');
  });
});
