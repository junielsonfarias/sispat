/**
 * Testes de isolamento multi-tenant em getPatrimonioById (auditoria 2026).
 *
 * Bug corrigido: getPatrimonioById fazia findUnique({ where: { id } }) e só
 * checava ensureSectorAccess — que NÃO compara municipalityId. Para admin
 * (hasFullAccess) ou supervisor/usuario com responsibleSectors vazio, isso
 * devolvia patrimônio de QUALQUER município (IDOR cross-tenant de leitura).
 *
 * Princípio (tenant negativo): não-superuser só lê patrimônio do próprio
 * município; cross-tenant retorna { kind: 'not-found' } (não 'forbidden' —
 * não vaza existência). superuser bypassa. Vale tanto no cache miss quanto
 * no cache hit, pois o objeto cacheado carrega o municipalityId.
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
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  sector: {
    findUnique: jest.fn(),
  },
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import { Actor, getPatrimonioById } from '../../services/patrimonioService';

const actorMunA = (role: string): Actor => ({
  userId: 'user-1',
  role,
  municipalityId: 'mun-A',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.get.mockResolvedValue(null);
  mockCache.set.mockResolvedValue(undefined);
  // responsibleSectors vazio = acesso a todos os setores do próprio município.
  mockPrisma.user.findUnique.mockResolvedValue({ responsibleSectors: [] });
  mockPrisma.sector.findUnique.mockResolvedValue({ name: 'Setor X' });
});

describe('getPatrimonioById — isolamento de tenant', () => {
  it('admin do município A NÃO lê patrimônio do município B (404, não forbidden)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
    });

    const result = await getPatrimonioById('p1', actorMunA('admin'));

    expect(result.kind).toBe('not-found');
  });

  it('usuario do município A (responsibleSectors vazio) NÃO lê patrimônio do município B', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
    });

    const result = await getPatrimonioById('p1', actorMunA('usuario'));

    expect(result.kind).toBe('not-found');
  });

  it('bloqueia cross-tenant mesmo em cache hit (objeto cacheado carrega municipalityId)', async () => {
    mockCache.get.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
    });

    const result = await getPatrimonioById('p1', actorMunA('admin'));

    expect(result.kind).toBe('not-found');
    // Cache hit: não deve ir ao banco buscar o registro.
    expect(mockPrisma.patrimonio.findUnique).not.toHaveBeenCalled();
  });

  it('admin do município A lê patrimônio do próprio município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-A',
      sectorId: 's-de-A',
      fotos: [],
      documentos: [],
    });

    const result = await getPatrimonioById('p1', actorMunA('admin'));

    expect(result.kind).toBe('ok');
  });

  it('superuser lê patrimônio de qualquer município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
      fotos: [],
      documentos: [],
    });

    const result = await getPatrimonioById('p1', {
      userId: 'su',
      role: 'superuser',
      municipalityId: 'mun-Z',
    });

    expect(result.kind).toBe('ok');
  });

  it('id inexistente retorna not-found', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(null);

    const result = await getPatrimonioById('nope', actorMunA('admin'));

    expect(result.kind).toBe('not-found');
  });
});
