/**
 * Testes do regularizacaoService — criação, incorporação (cria Patrimônio com a
 * anotação de regularização e gera número se ausente) e bloqueio de exclusão de
 * regularização já incorporada.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockCache = { deletePattern: jest.fn() };
jest.mock('../../config/redis', () => ({ redisCache: mockCache }));

const mockGerarNumero = jest.fn();
jest.mock('../../services/patrimonioService', () => ({
  gerarNumeroPatrimonial: (...args: unknown[]) => mockGerarNumero(...args),
}));

const mockTx = {
  patrimonio: { create: jest.fn() },
  historicoEntry: { create: jest.fn() },
  regularizacao: { update: jest.fn() },
  activityLog: { create: jest.fn() },
};

const mockPrisma = {
  regularizacao: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  comissao: { findUnique: jest.fn() },
  sector: { findUnique: jest.fn() },
  activityLog: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  RegularizacaoValidationError,
  createRegularizacao,
  incorporarRegularizacao,
  deleteRegularizacao,
} from '../../services/regularizacaoService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.deletePattern.mockResolvedValue(undefined);
});

describe('createRegularizacao', () => {
  it('cria com municipalityId e valorJusto', async () => {
    mockPrisma.regularizacao.create.mockResolvedValue({ id: 'r1', descricao: 'Mesa antiga' });
    mockPrisma.activityLog.create.mockResolvedValue({});
    await createRegularizacao({ descricao: 'Mesa antiga', valorJusto: 300 }, actor);
    const data = mockPrisma.regularizacao.create.mock.calls[0][0].data;
    expect(data.municipalityId).toBe('mun-1');
    expect(data.valorJusto).toBe(300);
    expect(data.tipoOrigem).toBe('pre_existente');
  });
});

describe('incorporarRegularizacao', () => {
  const reg = {
    id: 'r1', status: 'em_andamento', municipalityId: 'mun-1',
    descricao: 'Mesa antiga', valorJusto: 300, dataConstatacao: new Date('2026-01-01'),
    estadoConservacao: 'BOM', observacoes: 'achada no almoxarifado', fotos: [],
  };
  const incorpInput = {
    sectorId: 's1', setor_responsavel: 'Almoxarifado', local_objeto: 'Sala 1', tipo: 'Mobiliário',
  };

  it('gera número, cria patrimônio com anotação e marca incorporado', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue(reg);
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', municipalityId: 'mun-1' });
    mockGerarNumero.mockResolvedValue({ numero: 'PAT2026000001' });
    mockTx.patrimonio.create.mockResolvedValue({ id: 'p1', numero_patrimonio: 'PAT2026000001' });
    mockTx.historicoEntry.create.mockResolvedValue({});
    mockTx.regularizacao.update.mockResolvedValue({ id: 'r1', status: 'incorporado' });
    mockTx.activityLog.create.mockResolvedValue({});

    const r = await incorporarRegularizacao('r1', incorpInput, actor);

    const pdata = mockTx.patrimonio.create.mock.calls[0][0].data;
    expect(pdata.numero_patrimonio).toBe('PAT2026000001');
    expect(pdata.valor_aquisicao).toBe(300);
    expect(pdata.forma_aquisicao).toBe('Regularização');
    expect(pdata.observacoes).toContain('regularização — bem pré-existente');
    expect(pdata.destinacaoRevisada).toBe(true);
    expect(mockTx.regularizacao.update.mock.calls[0][0].data.status).toBe('incorporado');
    expect(mockTx.regularizacao.update.mock.calls[0][0].data.patrimonioId).toBe('p1');
    expect(mockCache.deletePattern).toHaveBeenCalledWith('patrimonios:*');
    expect(r.patrimonio.id).toBe('p1');
  });

  it('usa numero_patrimonio informado sem gerar', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue(reg);
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', municipalityId: 'mun-1' });
    mockTx.patrimonio.create.mockResolvedValue({ id: 'p2' });
    mockTx.historicoEntry.create.mockResolvedValue({});
    mockTx.regularizacao.update.mockResolvedValue({});
    mockTx.activityLog.create.mockResolvedValue({});

    await incorporarRegularizacao('r1', { ...incorpInput, numero_patrimonio: 'MANUAL-1' }, actor);
    expect(mockGerarNumero).not.toHaveBeenCalled();
    expect(mockTx.patrimonio.create.mock.calls[0][0].data.numero_patrimonio).toBe('MANUAL-1');
  });

  it('rejeita setor de outro município', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue(reg);
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', municipalityId: 'OUTRO' });
    await expect(incorporarRegularizacao('r1', incorpInput, actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });

  it('rejeita incorporar regularização já incorporada', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue({ ...reg, status: 'incorporado' });
    await expect(incorporarRegularizacao('r1', incorpInput, actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });
});

describe('deleteRegularizacao', () => {
  it('bloqueia exclusão de regularização incorporada', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue({
      id: 'r1', status: 'incorporado', municipalityId: 'mun-1',
    });
    await expect(deleteRegularizacao('r1', actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });
});
