/**
 * Testes de isolamento multi-tenant em registrarBaixa (auditoria 2026).
 *
 * Bug corrigido (IDOR de BAIXA cross-tenant): registrarBaixa fazia
 * findUnique({ where: { id } }) e validava apenas ensureSectorAccess (sem
 * comparar municipalityId) antes de prisma.patrimonio.update({ status: 'baixado' }).
 * Um admin/supervisor/usuario do município A conseguia dar baixa em patrimônio do
 * município B informando o id via POST /api/patrimonios/:id/baixa.
 *
 * Princípio (tenant negativo): não-superuser só dá baixa em patrimônio do próprio
 * município; cross-tenant lança PatrimonioNotFoundError (controller -> 404, não
 * 403 — não vaza existência) ANTES do update. superuser bypassa.
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

const txClient = {
  patrimonio: { update: jest.fn() },
  historicoEntry: { create: jest.fn() },
  activityLog: { create: jest.fn() },
};
const mockPrisma = {
  patrimonio: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: typeof txClient) => unknown) => cb(txClient)),
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  registrarBaixa,
  PatrimonioNotFoundError,
  PatrimonioConflictError,
} from '../../services/patrimonioService';

const baixaInput = {
  data_baixa: '2026-06-22',
  motivo_baixa: 'obsoleto',
};

const actorMunA = (role: string): Actor => ({
  userId: 'user-1',
  role,
  municipalityId: 'mun-A',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.delete.mockResolvedValue(undefined);
  txClient.patrimonio.update.mockResolvedValue({ id: 'p1', numero_patrimonio: '2024-0001' });
  txClient.historicoEntry.create.mockResolvedValue({});
  txClient.activityLog.create.mockResolvedValue({});
});

describe('registrarBaixa — isolamento de tenant', () => {
  it('admin do município A NÃO dá baixa em patrimônio do município B (404, não atualiza)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      status: 'ativo',
      sectorId: 's1',
      numero_patrimonio: '2024-0001',
      municipalityId: 'mun-B',
    });

    await expect(registrarBaixa('p1', baixaInput, actorMunA('admin'))).rejects.toBeInstanceOf(
      PatrimonioNotFoundError,
    );

    expect(txClient.patrimonio.update).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('admin do município A dá baixa em patrimônio do próprio município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      status: 'ativo',
      sectorId: 's1',
      numero_patrimonio: '2024-0001',
      municipalityId: 'mun-A',
    });

    await registrarBaixa('p1', baixaInput, actorMunA('admin'));

    expect(txClient.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ status: 'baixado' }),
      }),
    );
  });

  it('superuser dá baixa em patrimônio de qualquer município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      status: 'ativo',
      sectorId: 's1',
      numero_patrimonio: '2024-0001',
      municipalityId: 'mun-B',
    });

    await registrarBaixa('p1', baixaInput, {
      userId: 'su',
      role: 'superuser',
      municipalityId: 'mun-Z',
    });

    expect(txClient.patrimonio.update).toHaveBeenCalled();
  });

  it('id inexistente lança PatrimonioNotFoundError', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(null);

    await expect(registrarBaixa('nope', baixaInput, actorMunA('admin'))).rejects.toBeInstanceOf(
      PatrimonioNotFoundError,
    );
    expect(txClient.patrimonio.update).not.toHaveBeenCalled();
  });
});

describe('registrarBaixa — extravio exige Boletim de Ocorrência (Art. 25/26)', () => {
  beforeEach(() => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      status: 'ativo',
      sectorId: 's1',
      numero_patrimonio: '2024-0001',
      municipalityId: 'mun-A',
    });
  });

  it('bloqueia baixa por extravio sem documento anexado', async () => {
    await expect(
      registrarBaixa('p1', { data_baixa: '2026-06-22', motivo_baixa: 'Extravio do bem' }, actorMunA('admin')),
    ).rejects.toBeInstanceOf(PatrimonioConflictError);
    expect(txClient.patrimonio.update).not.toHaveBeenCalled();
  });

  it('detecta furto/roubo mesmo com acento e caixa variada', async () => {
    await expect(
      registrarBaixa('p1', { data_baixa: '2026-06-22', motivo_baixa: 'FURTO em repartição' }, actorMunA('admin')),
    ).rejects.toBeInstanceOf(PatrimonioConflictError);
    await expect(
      registrarBaixa('p1', { data_baixa: '2026-06-22', motivo_baixa: 'Bem desapareceu' }, actorMunA('admin')),
    ).rejects.toBeInstanceOf(PatrimonioConflictError);
  });

  it('permite baixa por extravio quando o BO está anexado', async () => {
    await registrarBaixa(
      'p1',
      { data_baixa: '2026-06-22', motivo_baixa: 'Extravio', documentos_baixa: ['bo-2026-123.pdf'] },
      actorMunA('admin'),
    );
    expect(txClient.patrimonio.update).toHaveBeenCalled();
  });

  it('baixa comum (obsoleto) não exige documento', async () => {
    await registrarBaixa('p1', baixaInput, actorMunA('admin'));
    expect(txClient.patrimonio.update).toHaveBeenCalled();
  });
});
