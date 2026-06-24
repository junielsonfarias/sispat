/**
 * Testes do desafetacaoService — XOR patrimônio/imóvel, bloqueio de bem dominical,
 * tenant isolation e a regra central: concluir => bem vira dominical + histórico.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockCache = { deletePattern: jest.fn() };
jest.mock('../../config/redis', () => ({ redisCache: mockCache }));

const mockTx = {
  patrimonio: { update: jest.fn() },
  imovel: { update: jest.fn() },
  historicoEntry: { create: jest.fn() },
  desafetacao: { update: jest.fn(), create: jest.fn() },
  activityLog: { create: jest.fn() },
};

const mockPrisma = {
  patrimonio: { findUnique: jest.fn() },
  imovel: { findUnique: jest.fn() },
  comissao: { findUnique: jest.fn() },
  desafetacao: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  DesafetacaoValidationError,
  createDesafetacao,
  createDesafetacaoLote,
  concluirDesafetacao,
  reclassificarDestinacao,
} from '../../services/desafetacaoService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.deletePattern.mockResolvedValue(undefined);
});

const baseInput = {
  baseLegalTipo: 'decreto',
  baseLegalNumero: '123',
  baseLegalData: '2026-01-01',
  justificativa: 'Justificativa suficiente para teste.',
};

describe('desafetacaoService — createDesafetacao', () => {
  it('rejeita quando não informa nem patrimônio nem imóvel', async () => {
    await expect(createDesafetacao({ ...baseInput }, actor)).rejects.toBeInstanceOf(
      DesafetacaoValidationError,
    );
  });

  it('rejeita quando informa ambos (patrimônio e imóvel)', async () => {
    await expect(
      createDesafetacao({ ...baseInput, patrimonioId: 'p1', imovelId: 'i1' }, actor),
    ).rejects.toBeInstanceOf(DesafetacaoValidationError);
  });

  it('rejeita bem já dominical', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', destinacao: 'dominical', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    await expect(
      createDesafetacao({ ...baseInput, patrimonioId: 'p1' }, actor),
    ).rejects.toBeInstanceOf(DesafetacaoValidationError);
  });

  it('cria capturando destinacaoAnterior do bem (uso_especial)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', destinacao: 'uso_especial', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    mockPrisma.desafetacao.findFirst.mockResolvedValue(null); // sem duplicada
    mockPrisma.desafetacao.create.mockResolvedValue({ id: 'd1' });
    mockPrisma.activityLog.create.mockResolvedValue({});

    await createDesafetacao({ ...baseInput, patrimonioId: 'p1' }, actor);

    const data = mockPrisma.desafetacao.create.mock.calls[0][0].data;
    expect(data.patrimonioId).toBe('p1');
    expect(data.imovelId).toBeNull();
    expect(data.destinacaoAnterior).toBe('uso_especial');
    expect(data.municipalityId).toBe('mun-1');
  });

  it('bloqueia desafetação duplicada em andamento', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', destinacao: 'uso_especial', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    mockPrisma.desafetacao.findFirst.mockResolvedValue({ id: 'existente' });
    await expect(
      createDesafetacao({ ...baseInput, patrimonioId: 'p1' }, actor),
    ).rejects.toBeInstanceOf(DesafetacaoValidationError);
  });
});

describe('desafetacaoService — concluirDesafetacao', () => {
  it('marca o patrimônio como dominical, grava histórico e invalida cache', async () => {
    mockPrisma.desafetacao.findUnique.mockResolvedValue({
      id: 'd1', status: 'em_andamento', municipalityId: 'mun-1',
      patrimonioId: 'p1', imovelId: null,
      destinacaoAnterior: 'uso_especial', baseLegalTipo: 'decreto', baseLegalNumero: '123',
    });
    mockTx.patrimonio.update.mockResolvedValue({});
    mockTx.historicoEntry.create.mockResolvedValue({});
    mockTx.desafetacao.update.mockResolvedValue({ id: 'd1', status: 'concluida' });
    mockTx.activityLog.create.mockResolvedValue({});

    await concluirDesafetacao('d1', actor);

    expect(mockTx.patrimonio.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { destinacao: 'dominical', destinacaoRevisada: true },
    });
    expect(mockTx.historicoEntry.create).toHaveBeenCalled();
    expect(mockTx.desafetacao.update.mock.calls[0][0].data.status).toBe('concluida');
    expect(mockCache.deletePattern).toHaveBeenCalledWith('patrimonios:*');
  });

  it('rejeita concluir desafetação que não está em andamento', async () => {
    mockPrisma.desafetacao.findUnique.mockResolvedValue({
      id: 'd1', status: 'concluida', municipalityId: 'mun-1', patrimonioId: 'p1',
    });
    await expect(concluirDesafetacao('d1', actor)).rejects.toBeInstanceOf(
      DesafetacaoValidationError,
    );
  });
});

describe('reclassificarDestinacao — não vira dominical direto (Art. 22)', () => {
  it('rejeita reclassificar diretamente para dominical (deve passar pela desafetação)', async () => {
    await expect(
      reclassificarDestinacao('patrimonio', 'p1', 'dominical', actor),
    ).rejects.toBeInstanceOf(DesafetacaoValidationError);
    // a trava lança antes de qualquer query
    expect(mockPrisma.patrimonio.findUnique).not.toHaveBeenCalled();
  });
});

describe('createDesafetacaoLote — vários bens, 1 base legal (Art. 22)', () => {
  const loteBase = {
    baseLegalTipo: 'decreto',
    baseLegalNumero: 'DEC-10/2026',
    baseLegalData: '2026-06-01',
    justificativa: 'Desafetação do conjunto de bens do Anexo I do decreto.',
  };

  it('cria N desafetações compartilhando a mesma base legal, atômico', async () => {
    mockPrisma.patrimonio.findUnique
      .mockResolvedValueOnce({ id: 'p1', destinacao: 'uso_especial', numero_patrimonio: '0001', municipalityId: 'mun-1' })
      .mockResolvedValueOnce({ id: 'p2', destinacao: 'uso_comum', numero_patrimonio: '0002', municipalityId: 'mun-1' });
    mockPrisma.desafetacao.findFirst.mockResolvedValue(null);
    mockTx.desafetacao.create.mockImplementation((args: any) => Promise.resolve({ id: `d-${args.data.patrimonioId}`, ...args.data }));
    mockTx.activityLog.create.mockResolvedValue({});

    const r = await createDesafetacaoLote(
      { ...loteBase, bens: [{ patrimonioId: 'p1' }, { patrimonioId: 'p2' }] },
      actor,
    );

    expect(r.total).toBe(2);
    expect(mockTx.desafetacao.create).toHaveBeenCalledTimes(2);
    // ambas com o mesmo número de ato
    const numeros = mockTx.desafetacao.create.mock.calls.map((c: any) => c[0].data.baseLegalNumero);
    expect(numeros).toEqual(['DEC-10/2026', 'DEC-10/2026']);
  });

  it('rejeita o lote inteiro se UM bem já é dominical (atomicidade)', async () => {
    mockPrisma.patrimonio.findUnique
      .mockResolvedValueOnce({ id: 'p1', destinacao: 'uso_especial', numero_patrimonio: '0001', municipalityId: 'mun-1' })
      .mockResolvedValueOnce({ id: 'p2', destinacao: 'dominical', numero_patrimonio: '0002', municipalityId: 'mun-1' });
    mockPrisma.desafetacao.findFirst.mockResolvedValue(null);
    await expect(
      createDesafetacaoLote({ ...loteBase, bens: [{ patrimonioId: 'p1' }, { patrimonioId: 'p2' }] }, actor),
    ).rejects.toBeInstanceOf(DesafetacaoValidationError);
    expect(mockTx.desafetacao.create).not.toHaveBeenCalled();
  });

  it('rejeita bens repetidos no lote', async () => {
    await expect(
      createDesafetacaoLote({ ...loteBase, bens: [{ patrimonioId: 'p1' }, { patrimonioId: 'p1' }] }, actor),
    ).rejects.toBeInstanceOf(DesafetacaoValidationError);
  });

  it('rejeita lote vazio', async () => {
    await expect(createDesafetacaoLote({ ...loteBase, bens: [] }, actor)).rejects.toBeInstanceOf(
      DesafetacaoValidationError,
    );
  });
});
