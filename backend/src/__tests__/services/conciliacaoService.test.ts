/**
 * Testes do conciliacaoService — cálculo do saldo físico, divergência/status e
 * bloqueio de duplicata por competência+categoria.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockPrisma = {
  patrimonio: { aggregate: jest.fn() },
  imovel: { aggregate: jest.fn() },
  conciliacao: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: { create: jest.fn() },
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  ConciliacaoValidationError,
  createConciliacao,
  calcularSaldoFisico,
} from '../../services/conciliacaoService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };

beforeEach(() => jest.clearAllMocks());

describe('calcularSaldoFisico', () => {
  it('bens_moveis soma valor_aquisicao excluindo baixados', async () => {
    mockPrisma.patrimonio.aggregate.mockResolvedValue({ _sum: { valor_aquisicao: 1500 } });
    const v = await calcularSaldoFisico('bens_moveis', 'mun-1');
    expect(v).toBe(1500);
    expect(mockPrisma.patrimonio.aggregate.mock.calls[0][0].where).toEqual({
      municipalityId: 'mun-1',
      status: { not: 'baixado' },
    });
  });

  it('bens_imoveis soma valor_aquisicao do município', async () => {
    mockPrisma.imovel.aggregate.mockResolvedValue({ _sum: { valor_aquisicao: 9000 } });
    expect(await calcularSaldoFisico('bens_imoveis', 'mun-1')).toBe(9000);
  });

  it('retorna 0 quando não há bens', async () => {
    mockPrisma.patrimonio.aggregate.mockResolvedValue({ _sum: { valor_aquisicao: null } });
    expect(await calcularSaldoFisico('bens_moveis', 'mun-1')).toBe(0);
  });
});

describe('createConciliacao', () => {
  it('marca divergente quando físico ≠ contábil', async () => {
    mockPrisma.conciliacao.findFirst.mockResolvedValue(null);
    mockPrisma.patrimonio.aggregate.mockResolvedValue({ _sum: { valor_aquisicao: 1000 } });
    mockPrisma.conciliacao.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'c1', ...args.data }),
    );
    mockPrisma.activityLog.create.mockResolvedValue({});

    const r = await createConciliacao(
      { competencia: '2026-06', dataBase: '2026-06-30', categoria: 'bens_moveis', valorContabil: 800 },
      actor,
    );

    const data = mockPrisma.conciliacao.create.mock.calls[0][0].data;
    expect(data.valorFisico).toBe(1000);
    expect(data.divergencia).toBe(200);
    expect(data.status).toBe('divergente');
    expect(data.municipalityId).toBe('mun-1');
    expect(r.id).toBe('c1');
  });

  it('marca conciliada quando físico = contábil', async () => {
    mockPrisma.conciliacao.findFirst.mockResolvedValue(null);
    mockPrisma.patrimonio.aggregate.mockResolvedValue({ _sum: { valor_aquisicao: 500 } });
    mockPrisma.conciliacao.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'c2', ...args.data }),
    );
    mockPrisma.activityLog.create.mockResolvedValue({});

    await createConciliacao(
      { competencia: '2026-06', dataBase: '2026-06-30', categoria: 'bens_moveis', valorContabil: 500 },
      actor,
    );
    expect(mockPrisma.conciliacao.create.mock.calls[0][0].data.status).toBe('conciliada');
  });

  it('bloqueia duplicata por competência + categoria', async () => {
    mockPrisma.conciliacao.findFirst.mockResolvedValue({ id: 'existente' });
    await expect(
      createConciliacao(
        { competencia: '2026-06', dataBase: '2026-06-30', categoria: 'bens_moveis', valorContabil: 1 },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConciliacaoValidationError);
  });
});
