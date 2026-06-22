/**
 * Testes de isolamento multi-tenant em getByNumero (auditoria 2026).
 *
 * Bug corrigido: getByNumero fazia findUnique({ where: { numero_patrimonio } })
 * e retornava o registro normalizado SEM nenhuma checagem de tenant nem
 * ensureSectorAccess. A rota autenticada GET /api/patrimonios/numero/:numero
 * permitia que qualquer usuário lesse dados completos de bem de outro município
 * conhecendo o número (IDOR cross-tenant de leitura).
 *
 * Princípio (tenant negativo): não-superuser só lê patrimônio do próprio
 * município; cross-tenant retorna { kind: 'not-found' } (não 'forbidden' —
 * não vaza existência). superuser bypassa.
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

import { Actor, getByNumero } from '../../services/patrimonioService';

const actorMunA = (role: string): Actor => ({
  userId: 'user-1',
  role,
  municipalityId: 'mun-A',
});

beforeEach(() => {
  jest.clearAllMocks();
  // responsibleSectors vazio = acesso a todos os setores do próprio município.
  mockPrisma.user.findUnique.mockResolvedValue({ responsibleSectors: [] });
  mockPrisma.sector.findUnique.mockResolvedValue({ name: 'Setor X' });
});

describe('getByNumero — isolamento de tenant', () => {
  it('admin do município A NÃO lê patrimônio do município B (404, não forbidden)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      numero_patrimonio: 'PAT2026001',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
    });

    const result = await getByNumero('PAT2026001', actorMunA('admin'));

    expect(result.kind).toBe('not-found');
  });

  it('usuario do município A (responsibleSectors vazio) NÃO lê patrimônio do município B', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      numero_patrimonio: 'PAT2026001',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
    });

    const result = await getByNumero('PAT2026001', actorMunA('usuario'));

    expect(result.kind).toBe('not-found');
  });

  it('admin do município A lê patrimônio do próprio município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
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

  it('superuser lê patrimônio de qualquer município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
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
  });

  it('número inexistente retorna not-found', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(null);

    const result = await getByNumero('NAO-EXISTE', actorMunA('admin'));

    expect(result.kind).toBe('not-found');
  });
});
