/**
 * Testes para inventarioService — criado no Sprint 18.
 *
 * Foco: tenant isolation via municipalityId direto (sem subquery), permissão
 * por papel, criação transacional dos inventory_items.
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
    invalidateInventarios: jest.fn(),
  },
}));

const mockTx = {
  inventory: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  inventoryItem: {
    createMany: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
};

const mockPrisma = {
  inventory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  patrimonio: {
    findMany: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  createInventario,
  deleteInventario,
  getInventarioById,
  InventarioForbiddenError,
  InventarioNotFoundError,
  InventarioValidationError,
  listInventarios,
  updateInventario,
} from '../../services/inventarioService';

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
  mockCache.deletePattern.mockResolvedValue(undefined);
});

describe('inventarioService — listInventarios', () => {
  it('superuser vê tudo (sem filtro de municipalityId)', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);
    mockPrisma.inventory.count.mockResolvedValue(0);

    await listInventarios({}, { ...baseActor, role: 'superuser' });

    const where = mockPrisma.inventory.findMany.mock.calls[0][0].where;
    expect(where.municipalityId).toBeUndefined();
  });

  it('admin é filtrado por municipalityId', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);
    mockPrisma.inventory.count.mockResolvedValue(0);

    await listInventarios({}, baseActor);

    const where = mockPrisma.inventory.findMany.mock.calls[0][0].where;
    expect(where.municipalityId).toBe('mun-1');
    expect(where.responsavel).toBeUndefined();
  });

  it('supervisor/usuario só veem inventários em que são responsáveis', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);
    mockPrisma.inventory.count.mockResolvedValue(0);

    await listInventarios({}, { ...baseActor, role: 'usuario' });

    const where = mockPrisma.inventory.findMany.mock.calls[0][0].where;
    expect(where.municipalityId).toBe('mun-1');
    expect(where.responsavel).toBe('user-1');
  });

  it('aplica filtros de status e search (case-insensitive)', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);
    mockPrisma.inventory.count.mockResolvedValue(0);

    await listInventarios({ status: 'concluido', search: 'estoque' }, baseActor);

    const where = mockPrisma.inventory.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('concluido');
    expect(where.OR).toEqual([
      { title: { contains: 'estoque', mode: 'insensitive' } },
      { description: { contains: 'estoque', mode: 'insensitive' } },
    ]);
  });

  it('retorna do cache quando hit (sem chamar prisma)', async () => {
    mockCache.get.mockResolvedValueOnce({ inventarios: [{ id: 'x' }], total: 1 });

    const result = await listInventarios({}, baseActor);

    expect(result.inventarios).toEqual([{ id: 'x' }]);
    expect(result.pagination.total).toBe(1);
    expect(mockPrisma.inventory.findMany).not.toHaveBeenCalled();
  });

  it('clampa page e limit a valores seguros', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);
    mockPrisma.inventory.count.mockResolvedValue(0);

    await listInventarios({ page: '-5', limit: '999' }, baseActor);

    expect(mockPrisma.inventory.findMany.mock.calls[0][0].skip).toBe(0);
    expect(mockPrisma.inventory.findMany.mock.calls[0][0].take).toBe(100);
  });
});

describe('inventarioService — getInventarioById', () => {
  it('lança NotFound quando inventário não existe', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce(null);
    await expect(getInventarioById('inv-1', baseActor)).rejects.toBeInstanceOf(
      InventarioNotFoundError,
    );
  });

  it('mascara cross-tenant como NotFound (não vaza existência)', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      municipalityId: 'OUTRO-mun',
      items: [],
    });
    await expect(getInventarioById('inv-1', baseActor)).rejects.toBeInstanceOf(
      InventarioNotFoundError,
    );
  });

  it('superuser pode ler inventário de qualquer município', async () => {
    const inv = { id: 'inv-1', municipalityId: 'OUTRO', items: [] };
    mockPrisma.inventory.findUnique.mockResolvedValueOnce(inv);

    const result = await getInventarioById('inv-1', { ...baseActor, role: 'superuser' });
    expect(result).toEqual(inv);
  });

  it('admin lê inventário do próprio município', async () => {
    const inv = { id: 'inv-1', municipalityId: 'mun-1', items: [] };
    mockPrisma.inventory.findUnique.mockResolvedValueOnce(inv);

    const result = await getInventarioById('inv-1', baseActor);
    expect(result).toEqual(inv);
  });
});

describe('inventarioService — createInventario', () => {
  it('valida que título é obrigatório', async () => {
    await expect(createInventario({ setor: 'TI' }, baseActor)).rejects.toBeInstanceOf(
      InventarioValidationError,
    );
  });

  it('valida que setor é obrigatório', async () => {
    await expect(createInventario({ title: 'X' }, baseActor)).rejects.toBeInstanceOf(
      InventarioValidationError,
    );
  });

  it('cria inventário com municipalityId do actor + items dos patrimônios no escopo', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([
      { id: 'p1', numero_patrimonio: '0001', descricao_bem: 'Mesa' },
      { id: 'p2', numero_patrimonio: '0002', descricao_bem: 'Cadeira' },
    ]);
    mockTx.inventory.create.mockResolvedValue({ id: 'inv-1', title: 'Teste' });
    mockTx.inventoryItem.createMany.mockResolvedValue({ count: 2 });
    mockTx.activityLog.create.mockResolvedValue({});
    mockTx.inventory.findUnique.mockResolvedValue({
      id: 'inv-1',
      title: 'Teste',
      items: [{ id: 'i1' }, { id: 'i2' }],
    });

    const result = await createInventario(
      { title: 'Teste', setor: 'TI', scope: 'sector' },
      baseActor,
    );

    expect(mockPrisma.patrimonio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          municipalityId: 'mun-1',
          setor_responsavel: 'TI',
        }),
      }),
    );
    expect(mockTx.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          municipalityId: 'mun-1',
          responsavel: 'user-1',
          status: 'em_andamento',
          scope: 'sector',
        }),
      }),
    );
    expect(mockTx.inventoryItem.createMany).toHaveBeenCalledWith({
      data: [
        { inventoryId: 'inv-1', patrimonioId: 'p1', encontrado: false },
        { inventoryId: 'inv-1', patrimonioId: 'p2', encontrado: false },
      ],
    });
    expect(result!.id).toBe('inv-1');
    expect(mockCache.deletePattern).toHaveBeenCalledWith('inventarios:*');
  });

  it('escopo location adiciona filtro local_objeto (case-insensitive)', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([]);
    mockTx.inventory.create.mockResolvedValue({ id: 'inv-2', title: 'X' });
    mockTx.activityLog.create.mockResolvedValue({});
    mockTx.inventory.findUnique.mockResolvedValue({ id: 'inv-2', items: [] });

    await createInventario(
      { title: 'X', setor: 'TI', scope: 'location', local: 'Sala 101' },
      baseActor,
    );

    expect(mockPrisma.patrimonio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          local_objeto: { contains: 'Sala 101', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('escopo specific_location filtra por localId', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([]);
    mockTx.inventory.create.mockResolvedValue({ id: 'inv-3', title: 'X' });
    mockTx.activityLog.create.mockResolvedValue({});
    mockTx.inventory.findUnique.mockResolvedValue({ id: 'inv-3', items: [] });

    await createInventario(
      { title: 'X', setor: 'TI', scope: 'specific_location', local: 'local-id-1' },
      baseActor,
    );

    expect(mockPrisma.patrimonio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ localId: 'local-id-1' }),
      }),
    );
  });

  it('não chama inventoryItem.createMany quando escopo é vazio', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([]);
    mockTx.inventory.create.mockResolvedValue({ id: 'inv-4', title: 'X' });
    mockTx.activityLog.create.mockResolvedValue({});
    mockTx.inventory.findUnique.mockResolvedValue({ id: 'inv-4', items: [] });

    await createInventario({ title: 'X', setor: 'TI' }, baseActor);

    expect(mockTx.inventoryItem.createMany).not.toHaveBeenCalled();
  });
});

describe('inventarioService — updateInventario', () => {
  it('lança NotFound quando inventário não existe', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce(null);
    await expect(updateInventario('x', { title: 'novo' }, baseActor)).rejects.toBeInstanceOf(
      InventarioNotFoundError,
    );
  });

  it('mascara cross-tenant como NotFound', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      title: 't',
      municipalityId: 'OUTRO',
      responsavel: 'user-1',
    });
    await expect(updateInventario('inv-1', { title: 'novo' }, baseActor)).rejects.toBeInstanceOf(
      InventarioNotFoundError,
    );
  });

  it('lança Forbidden quando usuario não-admin não é o responsável', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      title: 't',
      municipalityId: 'mun-1',
      responsavel: 'OUTRO-user',
    });
    await expect(
      updateInventario('inv-1', { title: 'novo' }, { ...baseActor, role: 'usuario' }),
    ).rejects.toBeInstanceOf(InventarioForbiddenError);
  });

  it('admin pode editar qualquer inventário do município, mesmo sem ser responsável', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      title: 't',
      municipalityId: 'mun-1',
      responsavel: 'OUTRO-user',
    });
    mockPrisma.inventory.update.mockResolvedValue({ id: 'inv-1', title: 'novo' });
    mockPrisma.activityLog.create.mockResolvedValue({});

    const result = await updateInventario('inv-1', { title: 'novo' }, baseActor);
    expect(result.id).toBe('inv-1');
    expect(mockCache.deletePattern).toHaveBeenCalledWith('inventarios:*');
  });
});

describe('inventarioService — deleteInventario', () => {
  it('lança NotFound quando inventário não existe', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce(null);
    await expect(deleteInventario('x', baseActor)).rejects.toBeInstanceOf(
      InventarioNotFoundError,
    );
  });

  it('mascara cross-tenant como NotFound', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      title: 't',
      municipalityId: 'OUTRO',
      responsavel: 'user-1',
    });
    await expect(deleteInventario('inv-1', baseActor)).rejects.toBeInstanceOf(
      InventarioNotFoundError,
    );
  });

  it('deleta e registra ActivityLog quando ok', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      title: 'Estoque',
      municipalityId: 'mun-1',
      responsavel: 'user-1',
    });
    mockPrisma.inventory.delete.mockResolvedValue({ id: 'inv-1' });
    mockPrisma.activityLog.create.mockResolvedValue({});

    await deleteInventario('inv-1', baseActor);

    expect(mockPrisma.inventory.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'DELETE_INVENTORY',
          entityType: 'Inventory',
          entityId: 'inv-1',
        }),
      }),
    );
  });
});
