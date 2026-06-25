/**
 * Testes de distribuirPatrimonios — move bens do Almoxarifado para um local
 * final do MESMO setor, em lote, com isolamento de tenant e permissão de setor.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  deletePattern: jest.fn(),
};
jest.mock('../../config/redis', () => ({
  redisCache: mockCache,
  CacheUtils: {
    getPatrimoniosKey: jest.fn(() => 'k'),
    invalidatePatrimonios: jest.fn(),
  },
}));

jest.mock('../../config/database-optimization', () => ({
  QueryOptimizer: { buildPaginationQuery: jest.fn(), buildOrderBy: jest.fn() },
  executeOptimizedQuery: jest.fn(),
}));

const mockTx = {
  patrimonio: { update: jest.fn() },
  historicoEntry: { create: jest.fn() },
  activityLog: { create: jest.fn() },
};

const mockPrisma = {
  patrimonio: { findMany: jest.fn() },
  local: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  sector: { findUnique: jest.fn() },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  distribuirPatrimonios,
  PatrimonioNotFoundError,
  PatrimonioForbiddenError,
  PatrimonioConflictError,
} from '../../services/patrimonioService';

const actor = (role: string): Actor => ({ userId: 'user-1', role, municipalityId: 'mun-A' });

const ID1 = '11111111-1111-1111-1111-111111111111';
const ID2 = '22222222-2222-2222-2222-222222222222';
const LOCAL = '33333333-3333-3333-3333-333333333333';

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.delete.mockResolvedValue(undefined);
  // Local de destino: Escola Central, setor s1, município mun-A.
  mockPrisma.local.findUnique.mockResolvedValue({
    id: LOCAL,
    name: 'Escola Central',
    sectorId: 's1',
    municipalityId: 'mun-A',
  });
  // Bens no Almoxarifado do setor s1.
  mockPrisma.patrimonio.findMany.mockResolvedValue([
    {
      id: ID1,
      numero_patrimonio: 'PAT001',
      municipalityId: 'mun-A',
      sectorId: 's1',
      status: 'ativo',
      local: { name: 'Almoxarifado' },
    },
    {
      id: ID2,
      numero_patrimonio: 'PAT002',
      municipalityId: 'mun-A',
      sectorId: 's1',
      status: 'ativo',
      local: { name: 'Almoxarifado' },
    },
  ]);
  mockTx.patrimonio.update.mockResolvedValue({});
  mockTx.historicoEntry.create.mockResolvedValue({});
  mockTx.activityLog.create.mockResolvedValue({});
});

describe('distribuirPatrimonios', () => {
  it('distribui em lote: atualiza localId/local_objeto e registra histórico', async () => {
    const r = await distribuirPatrimonios({ ids: [ID1, ID2], localId: LOCAL }, actor('admin'));
    expect(r.total).toBe(2);
    expect(mockTx.patrimonio.update).toHaveBeenCalledTimes(2);
    const first = mockTx.patrimonio.update.mock.calls[0][0];
    expect(first.data.localId).toBe(LOCAL);
    expect(first.data.local_objeto).toBe('Escola Central');
    expect(mockTx.historicoEntry.create).toHaveBeenCalledTimes(2);
    expect(mockTx.historicoEntry.create.mock.calls[0][0].data.action).toBe('DISTRIBUIÇÃO');
  });

  it('rejeita lista vazia', async () => {
    await expect(distribuirPatrimonios({ ids: [], localId: LOCAL }, actor('admin'))).rejects.toBeInstanceOf(
      PatrimonioConflictError,
    );
  });

  it('rejeita destino = Almoxarifado', async () => {
    mockPrisma.local.findUnique.mockResolvedValue({
      id: LOCAL,
      name: 'Almoxarifado',
      sectorId: 's1',
      municipalityId: 'mun-A',
    });
    await expect(
      distribuirPatrimonios({ ids: [ID1], localId: LOCAL }, actor('admin')),
    ).rejects.toBeInstanceOf(PatrimonioConflictError);
  });

  it('rejeita local de destino de outro município (tenant)', async () => {
    mockPrisma.local.findUnique.mockResolvedValue({
      id: LOCAL,
      name: 'Escola X',
      sectorId: 's9',
      municipalityId: 'OUTRO',
    });
    await expect(
      distribuirPatrimonios({ ids: [ID1], localId: LOCAL }, actor('admin')),
    ).rejects.toBeInstanceOf(PatrimonioNotFoundError);
    expect(mockTx.patrimonio.update).not.toHaveBeenCalled();
  });

  it('rejeita quando o bem é de setor diferente do local de destino', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([
      {
        id: ID1,
        numero_patrimonio: 'PAT001',
        municipalityId: 'mun-A',
        sectorId: 'OUTRO_SETOR',
        status: 'ativo',
        local: { name: 'Almoxarifado' },
      },
    ]);
    await expect(
      distribuirPatrimonios({ ids: [ID1], localId: LOCAL }, actor('admin')),
    ).rejects.toBeInstanceOf(PatrimonioConflictError);
  });

  it('rejeita bem baixado', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([
      {
        id: ID1,
        numero_patrimonio: 'PAT001',
        municipalityId: 'mun-A',
        sectorId: 's1',
        status: 'baixado',
        local: { name: 'Almoxarifado' },
      },
    ]);
    await expect(
      distribuirPatrimonios({ ids: [ID1], localId: LOCAL }, actor('admin')),
    ).rejects.toBeInstanceOf(PatrimonioConflictError);
  });

  it('usuário sem permissão no setor é barrado', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([
      {
        id: ID1,
        numero_patrimonio: 'PAT001',
        municipalityId: 'mun-A',
        sectorId: 's1',
        status: 'ativo',
        local: { name: 'Almoxarifado' },
      },
    ]);
    // responsibleSectors não inclui o setor do bem.
    mockPrisma.user.findUnique.mockResolvedValue({ responsibleSectors: ['Outro Setor'] });
    mockPrisma.sector.findUnique.mockResolvedValue({ name: 'Educação' });
    await expect(
      distribuirPatrimonios({ ids: [ID1], localId: LOCAL }, actor('usuario')),
    ).rejects.toBeInstanceOf(PatrimonioForbiddenError);
  });

  it('rejeita quando algum ID não existe', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([
      {
        id: ID1,
        numero_patrimonio: 'PAT001',
        municipalityId: 'mun-A',
        sectorId: 's1',
        status: 'ativo',
        local: { name: 'Almoxarifado' },
      },
    ]);
    await expect(
      distribuirPatrimonios({ ids: [ID1, ID2], localId: LOCAL }, actor('admin')),
    ).rejects.toBeInstanceOf(PatrimonioNotFoundError);
  });
});
