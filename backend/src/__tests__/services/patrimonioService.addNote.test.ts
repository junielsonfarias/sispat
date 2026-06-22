/**
 * Testes de isolamento multi-tenant em addNote (auditoria 2026).
 *
 * Bug corrigido (IDOR de observação cross-tenant): addNote fazia
 * findUnique({ where: { id: patrimonioId } }) sem comparar municipalityId
 * antes de prisma.note.create. Qualquer usuário autenticado do município A
 * conseguia adicionar observação (poluição/spam de auditoria) em patrimônio do
 * município B informando o id via POST /api/patrimonios/:id/notes.
 *
 * Princípio (tenant negativo): não-superuser só adiciona observação em
 * patrimônio do próprio município; cross-tenant lança PatrimonioNotFoundError
 * (controller -> 404, não 403 — não vaza existência) ANTES do note.create.
 * superuser bypassa.
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
  note: {
    create: jest.fn(),
  },
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import { Actor, addNote, PatrimonioNotFoundError } from '../../services/patrimonioService';

const actorMunA = (role: string): Actor => ({
  userId: 'user-1',
  role,
  municipalityId: 'mun-A',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Fulano' });
  mockPrisma.note.create.mockResolvedValue({ id: 'note-1' });
});

describe('addNote — isolamento de tenant', () => {
  it('usuario do município A NÃO adiciona observação em patrimônio do município B (404, não cria nota)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
    });

    await expect(addNote('p1', 'observação', actorMunA('usuario'))).rejects.toBeInstanceOf(
      PatrimonioNotFoundError,
    );

    expect(mockPrisma.note.create).not.toHaveBeenCalled();
  });

  it('usuario do município A adiciona observação em patrimônio do próprio município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-A',
    });

    await addNote('p1', 'observação', actorMunA('usuario'));

    expect(mockPrisma.note.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ patrimonioId: 'p1', userId: 'user-1' }),
      }),
    );
  });

  it('superuser adiciona observação em patrimônio de qualquer município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
    });

    await addNote('p1', 'observação', {
      userId: 'su',
      role: 'superuser',
      municipalityId: 'mun-Z',
    });

    expect(mockPrisma.note.create).toHaveBeenCalled();
  });

  it('id inexistente lança PatrimonioNotFoundError', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(null);

    await expect(addNote('nope', 'observação', actorMunA('usuario'))).rejects.toBeInstanceOf(
      PatrimonioNotFoundError,
    );
    expect(mockPrisma.note.create).not.toHaveBeenCalled();
  });
});
