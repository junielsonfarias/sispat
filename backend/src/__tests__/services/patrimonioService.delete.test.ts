/**
 * Testes de isolamento multi-tenant em deletePatrimonio (auditoria 2026).
 *
 * Bug corrigido (IDOR de DELETE cross-tenant): deletePatrimonio só checava o
 * role (superuser/supervisor) e fazia findUnique({ where: { id } }) sem comparar
 * municipalityId, antes de prisma.patrimonio.delete({ where: { id } }). Um
 * supervisor do município A conseguia deletar patrimônio do município B
 * informando o id via DELETE /api/patrimonios/:id.
 *
 * Princípio (tenant negativo): não-superuser só deleta patrimônio do próprio
 * município; cross-tenant lança PatrimonioNotFoundError (controller -> 404, não
 * 403 — não vaza existência) ANTES do delete. superuser bypassa.
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
    delete: jest.fn(),
  },
  emprestimo: {
    findFirst: jest.fn(),
  },
  transferencia: {
    findFirst: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import { Actor, deletePatrimonio, PatrimonioNotFoundError } from '../../services/patrimonioService';

const actorMunA = (role: string): Actor => ({
  userId: 'user-1',
  role,
  municipalityId: 'mun-A',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.delete.mockResolvedValue(undefined);
  // Sem empréstimo ativo nem transferência pendente bloqueando.
  mockPrisma.emprestimo.findFirst.mockResolvedValue(null);
  mockPrisma.transferencia.findFirst.mockResolvedValue(null);
  mockPrisma.patrimonio.delete.mockResolvedValue({ id: 'p1' });
  mockPrisma.activityLog.create.mockResolvedValue({});
});

describe('deletePatrimonio — isolamento de tenant (delete)', () => {
  it('supervisor do município A NÃO deleta patrimônio do município B (404, não deleta)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      numero_patrimonio: '2024-0001',
      municipalityId: 'mun-B',
    });

    await expect(deletePatrimonio('p1', actorMunA('supervisor'))).rejects.toBeInstanceOf(
      PatrimonioNotFoundError,
    );

    expect(mockPrisma.patrimonio.delete).not.toHaveBeenCalled();
    expect(mockPrisma.activityLog.create).not.toHaveBeenCalled();
  });

  it('supervisor do município A deleta patrimônio do próprio município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      numero_patrimonio: '2024-0001',
      municipalityId: 'mun-A',
    });

    await deletePatrimonio('p1', actorMunA('supervisor'));

    expect(mockPrisma.patrimonio.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('superuser deleta patrimônio de qualquer município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      numero_patrimonio: '2024-0001',
      municipalityId: 'mun-B',
    });

    await deletePatrimonio('p1', {
      userId: 'su',
      role: 'superuser',
      municipalityId: 'mun-Z',
    });

    expect(mockPrisma.patrimonio.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('id inexistente lança PatrimonioNotFoundError', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(null);

    await expect(deletePatrimonio('nope', actorMunA('supervisor'))).rejects.toBeInstanceOf(
      PatrimonioNotFoundError,
    );
    expect(mockPrisma.patrimonio.delete).not.toHaveBeenCalled();
  });
});
