/**
 * Testes de isolamento multi-tenant em updatePatrimonio (auditoria 2026).
 *
 * Bug corrigido (IDOR de ESCRITA cross-tenant): updatePatrimonio fazia
 * findUnique({ where: { id } }) e só validava ensureSectorAccess — que NÃO
 * compara municipalityId. Admin de outro município (hasFullAccess) ou
 * supervisor/usuario com responsibleSectors vazio passavam allowed:true e o
 * prisma.patrimonio.update({ where: { id } }) alterava bem de município alheio
 * via PUT /api/patrimonios/:id.
 *
 * Princípio (tenant negativo): não-superuser só edita patrimônio do próprio
 * município; cross-tenant lança PatrimonioNotFoundError (controller -> 404, não
 * 403 — não vaza existência) ANTES de qualquer escrita. superuser bypassa.
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
  patrimonio: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  sector: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import { Actor, updatePatrimonio, PatrimonioNotFoundError } from '../../services/patrimonioService';

const actorMunA = (role: string): Actor => ({
  userId: 'user-1',
  role,
  municipalityId: 'mun-A',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.get.mockResolvedValue(null);
  mockCache.set.mockResolvedValue(undefined);
  mockCache.delete.mockResolvedValue(undefined);
  // responsibleSectors vazio = acesso a todos os setores do próprio município.
  mockPrisma.user.findUnique.mockResolvedValue({ responsibleSectors: [] });
  mockPrisma.sector.findUnique.mockResolvedValue({ name: 'Setor X' });
  mockTx.patrimonio.update.mockResolvedValue({ id: 'p1', numero_patrimonio: '2024-0001' });
});

describe('updatePatrimonio — isolamento de tenant (escrita)', () => {
  it('admin do município A NÃO edita patrimônio do município B (404, não atualiza)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
      status: 'ativo',
    });

    await expect(
      updatePatrimonio('p1', { descricao: 'hack' }, actorMunA('admin')),
    ).rejects.toBeInstanceOf(PatrimonioNotFoundError);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockTx.patrimonio.update).not.toHaveBeenCalled();
  });

  it('usuario do município A (responsibleSectors vazio) NÃO edita patrimônio do município B', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
      status: 'ativo',
    });

    await expect(
      updatePatrimonio('p1', { descricao: 'hack' }, actorMunA('usuario')),
    ).rejects.toBeInstanceOf(PatrimonioNotFoundError);

    expect(mockTx.patrimonio.update).not.toHaveBeenCalled();
  });

  it('admin do município A edita patrimônio do próprio município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-A',
      sectorId: 's-de-A',
      status: 'ativo',
    });

    await updatePatrimonio('p1', { descricao: 'ok' }, actorMunA('admin'));

    expect(mockTx.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } }),
    );
  });

  it('superuser edita patrimônio de qualquer município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-B',
      sectorId: 's-de-B',
      status: 'ativo',
    });

    await updatePatrimonio('p1', { descricao: 'ok' }, {
      userId: 'su',
      role: 'superuser',
      municipalityId: 'mun-Z',
    });

    expect(mockTx.patrimonio.update).toHaveBeenCalled();
  });

  it('id inexistente lança PatrimonioNotFoundError', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(null);

    await expect(
      updatePatrimonio('nope', { descricao: 'x' }, actorMunA('admin')),
    ).rejects.toBeInstanceOf(PatrimonioNotFoundError);
  });
});

describe('updatePatrimonio — mass-assignment (allow-list de campos)', () => {
  it('ignora municipalityId/sectorId/localId/tipoId no body (sem tenant escape)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1',
      municipalityId: 'mun-A',
      sectorId: 's-de-A',
      status: 'ativo',
    });

    await updatePatrimonio(
      'p1',
      {
        descricao_bem: 'novo nome',
        // tentativa de mass-assignment / tenant escape:
        municipalityId: 'mun-B',
        sectorId: 's-de-B',
        localId: 'local-de-B',
        tipoId: 'tipo-de-B',
        numero_patrimonio: '9999-9999',
        status: 'baixado',
        id: 'hack',
        createdBy: 'outro-user',
      },
      actorMunA('admin'),
    );

    const arg = (mockTx.patrimonio.update.mock.calls[0] as any[])[0];
    expect(arg.data.descricao_bem).toBe('novo nome');
    // Nenhum campo proibido pode atravessar a allow-list:
    expect(arg.data.municipalityId).toBeUndefined();
    expect(arg.data.sectorId).toBeUndefined();
    expect(arg.data.localId).toBeUndefined();
    expect(arg.data.tipoId).toBeUndefined();
    expect(arg.data.numero_patrimonio).toBeUndefined();
    expect(arg.data.status).toBeUndefined();
    expect(arg.data.id).toBeUndefined();
    expect(arg.data.createdBy).toBeUndefined();
  });

  it('aceita tipo_posse válido (cessao) e ignora valor inválido (Art. 13 §3)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', municipalityId: 'mun-A', sectorId: 's-de-A', status: 'ativo',
    });
    await updatePatrimonio('p1', { tipo_posse: 'cessao' }, actorMunA('admin'));
    expect((mockTx.patrimonio.update.mock.calls[0] as any[])[0].data.tipo_posse).toBe('cessao');

    mockTx.patrimonio.update.mockClear();
    await updatePatrimonio('p1', { tipo_posse: 'invalido' }, actorMunA('admin'));
    // valor fora do enum cai no padrão seguro 'proprio'
    expect((mockTx.patrimonio.update.mock.calls[0] as any[])[0].data.tipo_posse).toBe('proprio');
  });

  it('persiste origem_recurso e clausulas_reversao (Art. 4 Decreto / Art. 13 §2)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', municipalityId: 'mun-A', sectorId: 's-de-A', status: 'ativo',
    });
    await updatePatrimonio(
      'p1',
      { origem_recurso: 'convenio', clausulas_reversao: 'Reverte ao concedente em 5 anos.' },
      actorMunA('admin'),
    );
    const data = (mockTx.patrimonio.update.mock.calls[0] as any[])[0].data;
    expect(data.origem_recurso).toBe('convenio');
    expect(data.clausulas_reversao).toBe('Reverte ao concedente em 5 anos.');
  });
});
