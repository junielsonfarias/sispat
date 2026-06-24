/**
 * Testes de importarPatrimonios — explode a quantidade em N patrimônios (1 por
 * unidade), valida setor/tenant e grava os campos contábeis. Transacional.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockCache = { deletePattern: jest.fn() };
jest.mock('../../config/redis', () => ({ redisCache: mockCache }));

const mockProximoNumeroTx = jest.fn();
jest.mock('../../services/patrimonioService', () => ({
  proximoNumeroPatrimonialTx: (...args: unknown[]) => mockProximoNumeroTx(...args),
}));

const mockTx = {
  patrimonio: { create: jest.fn() },
  activityLog: { create: jest.fn() },
};
const mockPrisma = {
  sector: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  ImportacaoValidationError,
  importarPatrimonios,
  ItemConfirmado,
} from '../../services/importacaoMaterialService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };

const baseItem = (over: Partial<ItemConfirmado> = {}): ItemConfirmado => ({
  descricao: 'NOBREAK 600 VA-120V',
  quantidade: 3,
  valorUnitario: 752,
  dataAquisicao: '2026-03-11T00:00:00.000Z',
  numeroNotaFiscal: '697/1',
  fornecedor: 'ARIOSNALDO DA SILVA VITAL LTDA',
  numeroEmpenho: '02030013',
  numeroLiquidacao: '11030018',
  tipo: 'Outros Materiais Permanentes',
  formaAquisicao: 'Dispensa/Compra Direta',
  origemRecurso: 'transferencia_ente',
  sectorId: 's1',
  setorNome: 'Saúde',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.deletePattern.mockResolvedValue(undefined);
  mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', name: 'Saúde', municipalityId: 'mun-1' });
  mockProximoNumeroTx.mockResolvedValue({ numero: 'PAT202600000005', sequencial: 5 });
  mockTx.patrimonio.create.mockImplementation((args: any) =>
    Promise.resolve({ id: `p-${args.data.numero_patrimonio}`, numero_patrimonio: args.data.numero_patrimonio }),
  );
  mockTx.activityLog.create.mockResolvedValue({});
});

describe('importarPatrimonios', () => {
  it('explode a quantidade em N patrimônios com números sequenciais', async () => {
    const r = await importarPatrimonios([baseItem({ quantidade: 3 })], actor);
    expect(r.total).toBe(3);
    expect(r.linhas).toBe(1);
    expect(mockTx.patrimonio.create).toHaveBeenCalledTimes(3);
    const numeros = mockTx.patrimonio.create.mock.calls.map((c: any) => c[0].data.numero_patrimonio);
    expect(numeros).toEqual(['PAT202600000005', 'PAT202600000006', 'PAT202600000007']);
  });

  it('grava os campos contábeis e defaults de bem novo', async () => {
    await importarPatrimonios([baseItem({ quantidade: 1 })], actor);
    const data = mockTx.patrimonio.create.mock.calls[0][0].data;
    expect(data.descricao_bem).toBe('NOBREAK 600 VA-120V');
    expect(data.valor_aquisicao).toBe(752);
    expect(data.quantidade).toBe(1);
    expect(data.fornecedor).toBe('ARIOSNALDO DA SILVA VITAL LTDA');
    expect(data.numero_empenho).toBe('02030013');
    expect(data.numero_liquidacao).toBe('11030018');
    expect(data.origem_recurso).toBe('transferencia_ente');
    expect(data.situacao_bem).toBe('OTIMO');
    expect(data.tipo_posse).toBe('proprio');
    expect(data.destinacaoRevisada).toBe(true);
    expect(data.numero_nota_fiscal).toBe('697/1');
    expect(data.setor_responsavel).toBe('Saúde'); // nome resolvido do setor
  });

  it('soma quantidades de vários itens', async () => {
    const r = await importarPatrimonios([baseItem({ quantidade: 2 }), baseItem({ descricao: 'PROCESSADOR', quantidade: 4 })], actor);
    expect(r.total).toBe(6);
    expect(r.linhas).toBe(2);
  });

  it('rejeita setor de outro município (tenant)', async () => {
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', name: 'X', municipalityId: 'OUTRO' });
    await expect(importarPatrimonios([baseItem()], actor)).rejects.toBeInstanceOf(ImportacaoValidationError);
    expect(mockTx.patrimonio.create).not.toHaveBeenCalled();
  });

  it('rejeita lote vazio', async () => {
    await expect(importarPatrimonios([], actor)).rejects.toBeInstanceOf(ImportacaoValidationError);
  });

  it('rejeita acima do limite de unidades', async () => {
    await expect(importarPatrimonios([baseItem({ quantidade: 5000 })], actor)).rejects.toBeInstanceOf(
      ImportacaoValidationError,
    );
  });

  it('rejeita origem de recurso inválida', async () => {
    await expect(
      importarPatrimonios([baseItem({ origemRecurso: 'invalida' as any })], actor),
    ).rejects.toBeInstanceOf(ImportacaoValidationError);
  });
});
