/**
 * Testes para transferService — criado no Sprint 18.
 *
 * Foco: estados que bloqueiam transferência, snapshot do previousStatus
 * (campo dedicado, não mais marker em observacoes), restauração em
 * approve/reject/delete.
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
const mockCacheUtils = {
  invalidateTransferencias: jest.fn(),
  invalidatePatrimonios: jest.fn(),
  getTransferenciasKey: jest.fn(() => 'transferencias:key'),
};
jest.mock('../../config/redis', () => ({
  redisCache: mockCache,
  CacheUtils: mockCacheUtils,
}));

const mockPrisma = {
  transferencia: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn((args) => ({ id: 'transfer-1', ...args.data })),
    update: jest.fn((args) => ({ id: args.where.id, ...args.data })),
    delete: jest.fn(),
  },
  patrimonio: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  sector: { findFirst: jest.fn() },
  local: { findFirst: jest.fn() },
  historicoEntry: { create: jest.fn() },
  activityLog: { create: jest.fn() },
  $transaction: jest.fn((ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops;
  }),
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  approveTransfer,
  createTransfer,
  deleteTransfer,
  getTransfer,
  listTransfers,
  rejectTransfer,
  TransferConflictError,
  TransferForbiddenError,
  TransferNotFoundError,
  TransferValidationError,
} from '../../services/transferService';

const baseActor: Actor = {
  userId: 'user-1',
  role: 'admin',
  municipalityId: 'mun-1',
  email: 'admin@x.gov',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.get.mockResolvedValue(null);
  mockCache.set.mockResolvedValue(undefined);
  mockCache.delete.mockResolvedValue(undefined);
  mockCacheUtils.invalidateTransferencias.mockResolvedValue(undefined);
  mockCacheUtils.invalidatePatrimonios.mockResolvedValue(undefined);
});

describe('transferService — listTransfers', () => {
  it('superuser vê tudo (where sem patrimonio.municipalityId)', async () => {
    mockPrisma.transferencia.findMany.mockResolvedValue([]);
    mockPrisma.transferencia.count.mockResolvedValue(0);

    await listTransfers({}, { ...baseActor, role: 'superuser' });

    const where = mockPrisma.transferencia.findMany.mock.calls[0][0].where;
    expect(where.patrimonio).toBeUndefined();
  });

  it('admin filtra via patrimonio.municipalityId', async () => {
    mockPrisma.transferencia.findMany.mockResolvedValue([]);
    mockPrisma.transferencia.count.mockResolvedValue(0);

    await listTransfers({}, baseActor);

    const where = mockPrisma.transferencia.findMany.mock.calls[0][0].where;
    expect(where.patrimonio).toEqual({ is: { municipalityId: 'mun-1' } });
  });

  it('filtro de setor busca em origem OU destino', async () => {
    mockPrisma.transferencia.findMany.mockResolvedValue([]);
    mockPrisma.transferencia.count.mockResolvedValue(0);

    await listTransfers({ sector: 'TI' }, baseActor);

    const where = mockPrisma.transferencia.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ setorOrigem: 'TI' }, { setorDestino: 'TI' }]);
  });

  it('cache hit não chama prisma', async () => {
    mockCache.get.mockResolvedValueOnce({ transfers: [{ id: 't1' }], total: 1 });
    const result = await listTransfers({}, baseActor);
    expect(result.transfers).toEqual([{ id: 't1' }]);
    expect(mockPrisma.transferencia.findMany).not.toHaveBeenCalled();
  });
});

describe('transferService — getTransfer', () => {
  it('NotFound se inexistente', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce(null);
    await expect(getTransfer('t1', baseActor)).rejects.toBeInstanceOf(TransferNotFoundError);
  });

  it('mascara cross-tenant como NotFound', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      patrimonio: { id: 'p1', municipalityId: 'OUTRO' },
    });
    await expect(getTransfer('t1', baseActor)).rejects.toBeInstanceOf(TransferNotFoundError);
  });

  it('superuser pode ler de qualquer município', async () => {
    const t = { id: 't1', patrimonio: { id: 'p1', municipalityId: 'OUTRO' } };
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce(t);
    expect(await getTransfer('t1', { ...baseActor, role: 'superuser' })).toEqual(t);
  });
});

describe('transferService — createTransfer', () => {
  const validInput = {
    patrimonioId: 'p1',
    setorOrigem: 'TI',
    setorDestino: 'RH',
    localOrigem: 'Sala 1',
    localDestino: 'Sala 2',
    motivo: 'Reorg',
    dataTransferencia: '2026-01-15',
    responsavelOrigem: 'João',
    responsavelDestino: 'Maria',
  };

  it('NotFound se patrimônio inexistente', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValueOnce(null);
    await expect(createTransfer(validInput, baseActor)).rejects.toBeInstanceOf(
      TransferNotFoundError,
    );
  });

  it('Forbidden se patrimônio de outro município (não-superuser)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'p1',
      status: 'ativo',
      municipalityId: 'OUTRO',
      numero_patrimonio: '001',
      descricao_bem: 'X',
    });
    await expect(createTransfer(validInput, baseActor)).rejects.toBeInstanceOf(
      TransferForbiddenError,
    );
  });

  it('400 quando patrimônio está baixado', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'p1',
      status: 'baixado',
      municipalityId: 'mun-1',
      numero_patrimonio: '001',
      descricao_bem: 'X',
    });
    await expect(createTransfer(validInput, baseActor)).rejects.toBeInstanceOf(
      TransferValidationError,
    );
  });

  it('409 quando bem já está em transferência', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'p1',
      status: 'em_transferencia',
      municipalityId: 'mun-1',
      numero_patrimonio: '001',
      descricao_bem: 'X',
    });
    await expect(createTransfer(validInput, baseActor)).rejects.toBeInstanceOf(
      TransferConflictError,
    );
  });

  it('409 quando bem está emprestado', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'p1',
      status: 'emprestado',
      municipalityId: 'mun-1',
      numero_patrimonio: '001',
      descricao_bem: 'X',
    });
    await expect(createTransfer(validInput, baseActor)).rejects.toBeInstanceOf(
      TransferConflictError,
    );
  });

  it('cria transfer + marca patrimônio em_transferencia + previousStatus snapshot', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValueOnce({
      id: 'p1',
      status: 'ativo',
      municipalityId: 'mun-1',
      numero_patrimonio: '001',
      descricao_bem: 'Mesa',
    });
    mockPrisma.activityLog.create.mockResolvedValue({});

    await createTransfer(validInput, baseActor);

    expect(mockPrisma.transferencia.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patrimonioId: 'p1',
          status: 'pendente',
          previousStatus: 'ativo',
        }),
      }),
    );
    expect(mockPrisma.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ status: 'em_transferencia' }),
      }),
    );
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          entityType: 'TRANSFER',
        }),
      }),
    );
  });
});

describe('transferService — approveTransfer', () => {
  it('NotFound se inexistente', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce(null);
    await expect(approveTransfer('t1', undefined, baseActor)).rejects.toBeInstanceOf(
      TransferNotFoundError,
    );
  });

  it('400 se já processada (não-pendente)', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'aprovada',
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    await expect(approveTransfer('t1', undefined, baseActor)).rejects.toBeInstanceOf(
      TransferValidationError,
    );
  });

  it('NotFound se setor destino não existe no município', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'pendente',
      setorDestino: 'RH',
      localDestino: '',
      previousStatus: 'ativo',
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    mockPrisma.sector.findFirst.mockResolvedValueOnce(null);
    await expect(approveTransfer('t1', undefined, baseActor)).rejects.toBeInstanceOf(
      TransferNotFoundError,
    );
  });

  it('supervisor NÃO responsável pelo setor destino é bloqueado (403, sem update)', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'pendente',
      setorDestino: 'RH',
      localDestino: '',
      previousStatus: 'ativo',
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    // supervisor responsável só por 'TI', não por 'RH' (destino)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ responsibleSectors: ['TI'] });
    const supervisor: Actor = { userId: 'sup-1', role: 'supervisor', municipalityId: 'mun-1', email: 's@x.gov' };
    await expect(approveTransfer('t1', undefined, supervisor)).rejects.toBeInstanceOf(
      TransferForbiddenError,
    );
    expect(mockPrisma.transferencia.update).not.toHaveBeenCalled();
  });

  it('supervisor responsável pelo setor destino aprova', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'pendente',
      patrimonioId: 'p1',
      setorOrigem: 'TI',
      setorDestino: 'RH',
      localDestino: '',
      previousStatus: 'ativo',
      observacoes: null,
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ responsibleSectors: ['RH'] });
    mockPrisma.sector.findFirst.mockResolvedValueOnce({ id: 'sec-rh' });
    mockPrisma.historicoEntry.create.mockResolvedValue({});
    mockPrisma.activityLog.create.mockResolvedValue({});
    const supervisor: Actor = { userId: 'sup-1', role: 'supervisor', municipalityId: 'mun-1', email: 's@x.gov' };

    await approveTransfer('t1', undefined, supervisor);

    expect(mockPrisma.transferencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'aprovada' }) }),
    );
  });

  it('aprova e restaura previousStatus do patrimônio', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'pendente',
      patrimonioId: 'p1',
      setorOrigem: 'TI',
      setorDestino: 'RH',
      localDestino: 'Sala 2',
      motivo: 'Reorg',
      previousStatus: 'manutencao',
      observacoes: null,
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    mockPrisma.sector.findFirst.mockResolvedValueOnce({ id: 'sec-rh' });
    mockPrisma.local.findFirst.mockResolvedValueOnce({ id: 'loc-s2' });
    mockPrisma.historicoEntry.create.mockResolvedValue({});
    mockPrisma.activityLog.create.mockResolvedValue({});

    await approveTransfer('t1', undefined, baseActor);

    expect(mockPrisma.transferencia.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({ status: 'aprovada' }),
      }),
    );
    expect(mockPrisma.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          sectorId: 'sec-rh',
          setor_responsavel: 'RH',
          localId: 'loc-s2',
          local_objeto: 'Sala 2',
          status: 'manutencao',
        }),
      }),
    );
  });
});

describe('transferService — rejectTransfer', () => {
  it('rejeita e restaura previousStatus sem mexer em setor', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'pendente',
      patrimonioId: 'p1',
      setorOrigem: 'TI',
      setorDestino: 'RH',
      motivo: 'X',
      previousStatus: 'ativo',
      observacoes: null,
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    mockPrisma.historicoEntry.create.mockResolvedValue({});
    mockPrisma.activityLog.create.mockResolvedValue({});

    await rejectTransfer('t1', 'sem capacidade', baseActor);

    expect(mockPrisma.transferencia.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'rejeitada',
          observacoes: 'sem capacidade',
        }),
      }),
    );
    expect(mockPrisma.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ status: 'ativo' }),
      }),
    );
    // Não move setor ao rejeitar
    expect(mockPrisma.patrimonio.update.mock.calls[0][0].data.sectorId).toBeUndefined();
  });
});

describe('transferService — deleteTransfer', () => {
  it('400 se já aprovada', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'aprovada',
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    await expect(deleteTransfer('t1', baseActor)).rejects.toBeInstanceOf(
      TransferValidationError,
    );
  });

  it('quando pendente: deleta e restaura previousStatus', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'pendente',
      patrimonioId: 'p1',
      previousStatus: 'manutencao',
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    mockPrisma.activityLog.create.mockResolvedValue({});

    await deleteTransfer('t1', baseActor);

    expect(mockPrisma.transferencia.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(mockPrisma.patrimonio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ status: 'manutencao' }),
      }),
    );
  });

  it('quando rejeitada: deleta mas NÃO toca no patrimônio', async () => {
    mockPrisma.transferencia.findUnique.mockResolvedValueOnce({
      id: 't1',
      status: 'rejeitada',
      patrimonioId: 'p1',
      previousStatus: 'ativo',
      patrimonio: { id: 'p1', municipalityId: 'mun-1' },
    });
    mockPrisma.activityLog.create.mockResolvedValue({});

    await deleteTransfer('t1', baseActor);

    expect(mockPrisma.transferencia.delete).toHaveBeenCalled();
    expect(mockPrisma.patrimonio.update).not.toHaveBeenCalled();
  });
});
