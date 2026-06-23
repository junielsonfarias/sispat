/**
 * Testes do subPatrimonioService — geração de número, isolamento multi-tenant
 * (via patrimônio pai) e escopo do bulk.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockCache = { delete: jest.fn() };
jest.mock('../../config/redis', () => ({ redisCache: mockCache }));

const mockTx = {
  subPatrimonio: { findMany: jest.fn(), create: jest.fn() },
};

const mockPrisma = {
  patrimonio: { findUnique: jest.fn() },
  subPatrimonio: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  SubPatrimonioNotFoundError,
  generateSubPatrimonioNumber,
  listSubPatrimonios,
  createSubPatrimonio,
  updateSubPatrimonio,
  deleteSubPatrimonio,
  bulkUpdateStatus,
} from '../../services/subPatrimonioService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };
const outroMun: Actor = { ...actor, municipalityId: 'mun-2' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.delete.mockResolvedValue(undefined);
});

describe('generateSubPatrimonioNumber', () => {
  it('usa padding de 3 dígitos até 999', () => {
    expect(generateSubPatrimonioNumber('0001', 1)).toBe('0001-001');
    expect(generateSubPatrimonioNumber('0001', 42)).toBe('0001-042');
    expect(generateSubPatrimonioNumber('0001', 999)).toBe('0001-999');
  });
  it('expande padding acima de 999/9999', () => {
    expect(generateSubPatrimonioNumber('A', 1000)).toBe('A-1000');
    expect(generateSubPatrimonioNumber('A', 10000)).toBe('A-10000');
  });
});

describe('isolamento multi-tenant', () => {
  it('listSubPatrimonios: patrimônio de outro município → 404', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    await expect(listSubPatrimonios('p1', outroMun)).rejects.toBeInstanceOf(
      SubPatrimonioNotFoundError,
    );
    expect(mockPrisma.subPatrimonio.findMany).not.toHaveBeenCalled();
  });

  it('updateSubPatrimonio: sub de outro município → 404 e NÃO atualiza', async () => {
    mockPrisma.subPatrimonio.findUnique.mockResolvedValue({
      id: 's1', patrimonioId: 'p1', patrimonio: { municipalityId: 'mun-1', numero_patrimonio: '0001' },
    });
    await expect(
      updateSubPatrimonio('s1', { status: 'baixado' }, outroMun),
    ).rejects.toBeInstanceOf(SubPatrimonioNotFoundError);
    expect(mockPrisma.subPatrimonio.update).not.toHaveBeenCalled();
  });

  it('deleteSubPatrimonio: sub de outro município → 404 e NÃO deleta', async () => {
    mockPrisma.subPatrimonio.findUnique.mockResolvedValue({
      id: 's1', patrimonioId: 'p1', patrimonio: { municipalityId: 'mun-1', numero_patrimonio: '0001' },
    });
    await expect(deleteSubPatrimonio('s1', outroMun)).rejects.toBeInstanceOf(
      SubPatrimonioNotFoundError,
    );
    expect(mockPrisma.subPatrimonio.delete).not.toHaveBeenCalled();
  });

  it('superuser acessa patrimônio de qualquer município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', numero_patrimonio: '0001', municipalityId: 'mun-9',
    });
    mockPrisma.subPatrimonio.findMany.mockResolvedValue([]);
    const su: Actor = { ...actor, role: 'superuser' };
    await expect(listSubPatrimonios('p1', su)).resolves.toEqual([]);
  });
});

describe('createSubPatrimonio', () => {
  it('gera o próximo número (maior atual + 1) e mapeia para DTO', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    mockTx.subPatrimonio.findMany.mockResolvedValue([
      { numero: '0001-001' },
      { numero: '0001-002' },
    ]);
    mockTx.subPatrimonio.create.mockImplementation(({ data }: any) => ({
      id: 's3',
      patrimonioId: data.patrimonioId,
      numero: data.numero,
      status: data.status,
      localizacao_especifica: data.localizacao_especifica ?? null,
      observacoes: data.observacoes ?? null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    }));

    const dto = await createSubPatrimonio('p1', { status: 'ativo' }, actor);

    expect(mockTx.subPatrimonio.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ numero: '0001-003' }) }),
    );
    expect(dto.numero_subpatrimonio).toBe('0001-003');
    expect(dto.patrimonio_id).toBe('p1');
  });
});

describe('bulkUpdateStatus', () => {
  it('escopa o updateMany ao patrimônio pai (ignora ids de outro bem)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    mockPrisma.subPatrimonio.updateMany.mockResolvedValue({ count: 2 });

    const count = await bulkUpdateStatus('p1', ['s1', 's2', 'xx'], 'manutencao', actor);

    expect(count).toBe(2);
    expect(mockPrisma.subPatrimonio.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1', 's2', 'xx'] }, patrimonioId: 'p1' },
      data: { status: 'manutencao' },
    });
  });
});
