/**
 * Testes do comissaoService — tenant isolation, criação com membros e alertas
 * de conformidade (mandato vencido/vencendo, < 3 membros).
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockTx = {
  comissao: { create: jest.fn() },
  activityLog: { create: jest.fn() },
};

const mockPrisma = {
  comissao: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  comissaoMembro: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
  activityLog: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  ComissaoNotFoundError,
  createComissao,
  getComissaoById,
  getAlertas,
  listComissoes,
} from '../../services/comissaoService';

const actor: Actor = {
  userId: 'u1',
  role: 'admin',
  municipalityId: 'mun-1',
  email: 'a@x.gov',
};

beforeEach(() => jest.clearAllMocks());

describe('comissaoService — listComissoes', () => {
  it('admin filtra por municipalityId', async () => {
    mockPrisma.comissao.findMany.mockResolvedValue([]);
    mockPrisma.comissao.count.mockResolvedValue(0);
    await listComissoes({}, actor);
    expect(mockPrisma.comissao.findMany.mock.calls[0][0].where.municipalityId).toBe('mun-1');
  });

  it('superuser não filtra município', async () => {
    mockPrisma.comissao.findMany.mockResolvedValue([]);
    mockPrisma.comissao.count.mockResolvedValue(0);
    await listComissoes({}, { ...actor, role: 'superuser' });
    expect(mockPrisma.comissao.findMany.mock.calls[0][0].where.municipalityId).toBeUndefined();
  });
});

describe('comissaoService — getComissaoById', () => {
  it('mascara cross-tenant como NotFound', async () => {
    mockPrisma.comissao.findUnique.mockResolvedValue({ id: 'c1', municipalityId: 'OUTRO' });
    await expect(getComissaoById('c1', actor)).rejects.toBeInstanceOf(ComissaoNotFoundError);
  });
});

describe('comissaoService — createComissao', () => {
  it('cria com membros e municipalityId do actor', async () => {
    mockTx.comissao.create.mockResolvedValue({ id: 'c1', tipo: 'inventario', portariaNumero: '01' });
    mockTx.activityLog.create.mockResolvedValue({});
    await createComissao(
      {
        tipo: 'inventario',
        portariaNumero: '01',
        portariaData: '2026-01-01',
        mandatoInicio: '2026-01-01',
        mandatoFim: '2028-01-01',
        membros: [{ nome: 'Fulano', papel: 'presidente' }],
      },
      actor,
    );
    const data = mockTx.comissao.create.mock.calls[0][0].data;
    expect(data.municipalityId).toBe('mun-1');
    expect(data.membros.create).toHaveLength(1);
  });
});

describe('comissaoService — getAlertas', () => {
  const now = new Date('2026-06-23T00:00:00Z');

  it('classifica mandato vencido, vencendo e < 3 membros', async () => {
    mockPrisma.comissao.findMany.mockResolvedValue([
      // vencida
      { id: 'a', tipo: 'inventario', portariaNumero: '1', mandatoFim: new Date('2026-06-01'), _count: { membros: 3 } },
      // vencendo (dentro de 30 dias)
      { id: 'b', tipo: 'avaliacao', portariaNumero: '2', mandatoFim: new Date('2026-07-10'), _count: { membros: 3 } },
      // ok, mas membros insuficientes
      { id: 'c', tipo: 'regularizacao', portariaNumero: '3', mandatoFim: new Date('2027-01-01'), _count: { membros: 2 } },
    ]);

    const r = await getAlertas(actor, now);
    expect(r.mandatoVencido.map((x: any) => x.id)).toEqual(['a']);
    expect(r.mandatoVencendo.map((x: any) => x.id)).toEqual(['b']);
    expect(r.membrosInsuficientes.map((x: any) => x.id)).toEqual(['c']);
    expect(r.total).toBe(3);
  });

  it('só considera comissões ativas do município', async () => {
    mockPrisma.comissao.findMany.mockResolvedValue([]);
    await getAlertas(actor, now);
    const where = mockPrisma.comissao.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('ativa');
    expect(where.municipalityId).toBe('mun-1');
  });
});
