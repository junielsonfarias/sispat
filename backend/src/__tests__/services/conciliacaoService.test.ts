/**
 * Testes do conciliacaoService — saldo físico = valor contábil LÍQUIDO (custo -
 * depreciação acumulada), divergência/status e bloqueio de duplicata.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockPrisma = {
  patrimonio: { findMany: jest.fn() },
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

// Helper: bem SEM depreciação (vida útil 0/nula) -> valor líquido = bruto.
const bemBruto = (valor: number) => ({
  valor_aquisicao: valor,
  data_aquisicao: new Date('2020-01-01'),
  vida_util_anos: null,
  valor_residual: null,
});

describe('calcularSaldoFisico', () => {
  it('bens_moveis soma o valor líquido, excluindo baixados', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([bemBruto(1000), bemBruto(500)]);
    const v = await calcularSaldoFisico('bens_moveis', 'mun-1');
    expect(v).toBe(1500);
    expect(mockPrisma.patrimonio.findMany.mock.calls[0][0].where).toEqual({
      municipalityId: 'mun-1',
      status: { not: 'baixado' },
    });
  });

  it('DESCONTA a depreciação acumulada (valor contábil líquido)', async () => {
    // bem de R$1200, vida 10 anos, residual 0, adquirido 12 meses antes da data-base
    mockPrisma.patrimonio.findMany.mockResolvedValue([
      {
        valor_aquisicao: 1200,
        data_aquisicao: new Date('2025-06-30'),
        vida_util_anos: 10,
        valor_residual: 0,
      },
    ]);
    // mensal = 1200/120 = 10; 12 meses => acumulada 120 => líquido 1080
    const v = await calcularSaldoFisico('bens_moveis', 'mun-1', new Date('2026-06-30'));
    expect(v).toBe(1080);
  });

  it('bens_imoveis soma valor_aquisicao do município (sem depreciação no model)', async () => {
    mockPrisma.imovel.aggregate.mockResolvedValue({ _sum: { valor_aquisicao: 9000 } });
    expect(await calcularSaldoFisico('bens_imoveis', 'mun-1')).toBe(9000);
  });

  it('retorna 0 quando não há bens', async () => {
    mockPrisma.patrimonio.findMany.mockResolvedValue([]);
    expect(await calcularSaldoFisico('bens_moveis', 'mun-1')).toBe(0);
  });
});

describe('createConciliacao', () => {
  it('marca divergente quando físico ≠ contábil', async () => {
    mockPrisma.conciliacao.findFirst.mockResolvedValue(null);
    mockPrisma.patrimonio.findMany.mockResolvedValue([bemBruto(1000)]);
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
    mockPrisma.patrimonio.findMany.mockResolvedValue([bemBruto(500)]);
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
