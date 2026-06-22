/**
 * Testes de isolamento multi-tenant em getByNumero.
 *
 * Após a numeração por município (@@unique([municipalityId, numero_patrimonio])),
 * getByNumero usa findFirst escopado por município (não-superuser): a própria
 * query filtra por municipalityId, então cross-tenant simplesmente não encontra
 * (not-found, sem vazar existência). superuser bypassa o filtro.
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

const mockPrisma = {
  patrimonio: {
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  sector: {
    findUnique: jest.fn(),
  },
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import { Actor, getByNumero } from '../../services/patrimonioService';

const actorMunA = (role: string): Actor => ({
  userId: 'user-1',
  role,
  municipalityId: 'mun-A',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ responsibleSectors: [] });
  mockPrisma.sector.findUnique.mockResolvedValue({ name: 'Setor X' });
});

describe('getByNumero — isolamento de tenant', () => {
  it('admin do município A: a query é escopada por municipalityId (cross-tenant → not-found)', async () => {
    // Query escopada a mun-A não encontra o registro de mun-B.
    mockPrisma.patrimonio.findFirst.mockResolvedValue(null);

    const result = await getByNumero('PAT2026001', actorMunA('admin'));

    expect(result.kind).toBe('not-found');
    const where = mockPrisma.patrimonio.findFirst.mock.calls[0][0].where;
    expect(where.municipalityId).toBe('mun-A');
  });

  it('usuario do município A: query escopada por município', async () => {
    mockPrisma.patrimonio.findFirst.mockResolvedValue(null);

    const result = await getByNumero('PAT2026001', actorMunA('usuario'));

    expect(result.kind).toBe('not-found');
    expect(mockPrisma.patrimonio.findFirst.mock.calls[0][0].where.municipalityId).toBe('mun-A');
  });

  it('admin do município A lê patrimônio do próprio município', async () => {
    mockPrisma.patrimonio.findFirst.mockResolvedValue({
      id: 'p1',
      numero_patrimonio: 'PAT2026001',
      municipalityId: 'mun-A',
      sectorId: 's-de-A',
      fotos: [],
      documentos: [],
    });

    const result = await getByNumero('PAT2026001', actorMunA('admin'));

    expect(result.kind).toBe('ok');
  });

  it('superuser lê de qualquer município (query NÃO escopada)', async () => {
    mockPrisma.patrimonio.findFirst.mockResolvedValue({
      id: 'p1',
      numero_patrimonio: 'PAT2026001',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
      fotos: [],
      documentos: [],
    });

    const result = await getByNumero('PAT2026001', {
      userId: 'su',
      role: 'superuser',
      municipalityId: 'mun-Z',
    });

    expect(result.kind).toBe('ok');
    expect(mockPrisma.patrimonio.findFirst.mock.calls[0][0].where.municipalityId).toBeUndefined();
  });

  it('número inexistente retorna not-found', async () => {
    mockPrisma.patrimonio.findFirst.mockResolvedValue(null);

    const result = await getByNumero('NAO-EXISTE', actorMunA('admin'));

    expect(result.kind).toBe('not-found');
  });
});
