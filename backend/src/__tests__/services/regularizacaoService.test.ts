/**
 * Testes do regularizacaoService — criação, incorporação (cria Patrimônio com a
 * anotação de regularização e gera número se ausente) e bloqueio de exclusão de
 * regularização já incorporada.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockCache = { deletePattern: jest.fn() };
jest.mock('../../config/redis', () => ({ redisCache: mockCache }));

// Numeração (individual e lote) usa o numberingService DENTRO da transação,
// no formato configurado do sistema (sem "PAT"), por setor.
const mockProximoConfigurado = jest.fn();
jest.mock('../../services/numberingService', () => ({
  proximoNumeroConfiguradoTx: (...args: unknown[]) => mockProximoConfigurado(...args),
  formatNumero: (prefix: string, seqLen: number, seq: number) =>
    `${prefix}${String(seq).padStart(seqLen, '0')}`,
}));

const mockTx = {
  patrimonio: { create: jest.fn() },
  historicoEntry: { create: jest.fn() },
  regularizacao: { update: jest.fn() },
  activityLog: { create: jest.fn() },
};

const mockPrisma = {
  regularizacao: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  comissao: { findUnique: jest.fn() },
  sector: { findUnique: jest.fn() },
  activityLog: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  RegularizacaoValidationError,
  createRegularizacao,
  incorporarRegularizacao,
  incorporarRegularizacaoLote,
  deleteRegularizacao,
} from '../../services/regularizacaoService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.deletePattern.mockResolvedValue(undefined);
});

describe('createRegularizacao', () => {
  it('cria com municipalityId e valorJusto', async () => {
    mockPrisma.regularizacao.create.mockResolvedValue({ id: 'r1', descricao: 'Mesa antiga' });
    mockPrisma.activityLog.create.mockResolvedValue({});
    await createRegularizacao({ descricao: 'Mesa antiga', valorJusto: 300 }, actor);
    const data = mockPrisma.regularizacao.create.mock.calls[0][0].data;
    expect(data.municipalityId).toBe('mun-1');
    expect(data.valorJusto).toBe(300);
    expect(data.tipoOrigem).toBe('pre_existente');
  });
});

describe('incorporarRegularizacao', () => {
  const reg = {
    id: 'r1', status: 'em_andamento', municipalityId: 'mun-1',
    descricao: 'Mesa antiga', valorJusto: 300, dataConstatacao: new Date('2026-01-01'),
    estadoConservacao: 'BOM', observacoes: 'achada no almoxarifado', fotos: [],
    comissaoId: 'c1', comissao: { id: 'c1', tipo: 'regularizacao', status: 'ativa', portariaNumero: '01' },
  };
  const incorpInput = {
    sectorId: 's1', setor_responsavel: 'Almoxarifado', local_objeto: 'Sala 1', tipo: 'Mobiliário',
  };

  it('gera número, cria patrimônio com anotação e marca incorporado', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue(reg);
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', codigo: '02', municipalityId: 'mun-1' });
    mockProximoConfigurado.mockResolvedValue({ prefix: '202602', seqLen: 6, sequencial: 1 });
    mockTx.patrimonio.create.mockResolvedValue({ id: 'p1', numero_patrimonio: '202602000001' });
    mockTx.historicoEntry.create.mockResolvedValue({});
    mockTx.regularizacao.update.mockResolvedValue({ id: 'r1', status: 'incorporado' });
    mockTx.activityLog.create.mockResolvedValue({});

    const r = await incorporarRegularizacao('r1', incorpInput, actor);

    const pdata = mockTx.patrimonio.create.mock.calls[0][0].data;
    expect(pdata.numero_patrimonio).toBe('202602000001');
    expect(pdata.valor_aquisicao).toBe(300);
    expect(pdata.forma_aquisicao).toBe('Regularização');
    expect(pdata.observacoes).toContain('regularização — bem pré-existente');
    expect(pdata.destinacaoRevisada).toBe(true);
    expect(mockTx.regularizacao.update.mock.calls[0][0].data.status).toBe('incorporado');
    expect(mockTx.regularizacao.update.mock.calls[0][0].data.patrimonioId).toBe('p1');
    expect(mockCache.deletePattern).toHaveBeenCalledWith('patrimonios:*');
    expect(r.patrimonio.id).toBe('p1');
  });

  it('usa numero_patrimonio informado sem gerar', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue(reg);
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', municipalityId: 'mun-1' });
    mockTx.patrimonio.create.mockResolvedValue({ id: 'p2' });
    mockTx.historicoEntry.create.mockResolvedValue({});
    mockTx.regularizacao.update.mockResolvedValue({});
    mockTx.activityLog.create.mockResolvedValue({});

    await incorporarRegularizacao('r1', { ...incorpInput, numero_patrimonio: 'MANUAL-1' }, actor);
    expect(mockProximoConfigurado).not.toHaveBeenCalled();
    expect(mockTx.patrimonio.create.mock.calls[0][0].data.numero_patrimonio).toBe('MANUAL-1');
  });

  it('rejeita setor de outro município', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue(reg);
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', municipalityId: 'OUTRO' });
    await expect(incorporarRegularizacao('r1', incorpInput, actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });

  it('rejeita incorporar regularização já incorporada', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue({ ...reg, status: 'incorporado' });
    await expect(incorporarRegularizacao('r1', incorpInput, actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });

  it('rejeita incorporar sem comissão de regularização designada (Art. 19)', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue({ ...reg, comissaoId: null, comissao: null });
    await expect(incorporarRegularizacao('r1', incorpInput, actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
    expect(mockTx.patrimonio.create).not.toHaveBeenCalled();
  });

  it('rejeita comissão de tipo diferente de regularizacao', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue({
      ...reg, comissao: { id: 'c1', tipo: 'inventario', status: 'ativa', portariaNumero: '01' },
    });
    await expect(incorporarRegularizacao('r1', incorpInput, actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });

  it('rejeita comissão de regularização não ativa', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue({
      ...reg, comissao: { id: 'c1', tipo: 'regularizacao', status: 'encerrada', portariaNumero: '01' },
    });
    await expect(incorporarRegularizacao('r1', incorpInput, actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });
});

describe('deleteRegularizacao', () => {
  it('bloqueia exclusão de regularização incorporada', async () => {
    mockPrisma.regularizacao.findUnique.mockResolvedValue({
      id: 'r1', status: 'incorporado', municipalityId: 'mun-1',
    });
    await expect(deleteRegularizacao('r1', actor)).rejects.toBeInstanceOf(
      RegularizacaoValidationError,
    );
  });
});

describe('incorporarRegularizacaoLote — várias regularizações de uma vez', () => {
  const comissaoOk = { id: 'c1', tipo: 'regularizacao', status: 'ativa', portariaNumero: '01' };
  const regBase = (id: string) => ({
    id, status: 'em_andamento', municipalityId: 'mun-1',
    descricao: `Bem ${id}`, valorJusto: 300, dataConstatacao: new Date('2026-01-01'),
    estadoConservacao: 'BOM', observacoes: null, fotos: [],
    comissaoId: 'c1', comissao: comissaoOk,
  });
  const loteInput = {
    sectorId: 's1', setor_responsavel: 'Almoxarifado', local_objeto: 'Depósito', tipo: 'Mobiliário',
  };

  beforeEach(() => {
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', codigo: '02', municipalityId: 'mun-1' });
    mockProximoConfigurado.mockResolvedValue({ prefix: '202602', seqLen: 6, sequencial: 1 });
    mockTx.historicoEntry.create.mockResolvedValue({});
    mockTx.regularizacao.update.mockResolvedValue({});
    mockTx.activityLog.create.mockResolvedValue({});
  });

  it('incorpora N regularizações numa transação, gerando números sequenciais', async () => {
    mockPrisma.regularizacao.findUnique
      .mockResolvedValueOnce(regBase('r1'))
      .mockResolvedValueOnce(regBase('r2'));
    mockTx.patrimonio.create.mockImplementation((args) => Promise.resolve({ id: `p-${args.data.numero_patrimonio}`, ...args.data }));

    const r = await incorporarRegularizacaoLote(
      { ...loteInput, itens: [{ regularizacaoId: 'r1' }, { regularizacaoId: 'r2' }] },
      actor,
    );

    expect(r.total).toBe(2);
    const numeros = mockTx.patrimonio.create.mock.calls.map((c) => c[0].data.numero_patrimonio);
    expect(numeros).toEqual(['202602000001', '202602000002']);
    expect(mockCache.deletePattern).toHaveBeenCalledWith('patrimonios:*');
  });

  it('rejeita o lote inteiro se UMA regularização não tem comissão (Art. 19)', async () => {
    mockPrisma.regularizacao.findUnique
      .mockResolvedValueOnce(regBase('r1'))
      .mockResolvedValueOnce({ ...regBase('r2'), comissaoId: null, comissao: null });
    await expect(
      incorporarRegularizacaoLote({ ...loteInput, itens: [{ regularizacaoId: 'r1' }, { regularizacaoId: 'r2' }] }, actor),
    ).rejects.toBeInstanceOf(RegularizacaoValidationError);
    expect(mockTx.patrimonio.create).not.toHaveBeenCalled();
  });

  it('rejeita o lote inteiro se UMA regularização tem comissão de tipo errado (Art. 19)', async () => {
    // r1 com comissão correta; r2 com comissão do tipo "desfazimento_desafetacao"
    // (errado para regularização). O lote deve falhar atomicamente.
    mockPrisma.regularizacao.findUnique
      .mockResolvedValueOnce(regBase('r1'))
      .mockResolvedValueOnce({
        ...regBase('r2'),
        comissao: { id: 'c2', tipo: 'desfazimento_desafetacao', status: 'ativa', portariaNumero: '02' },
      });
    await expect(
      incorporarRegularizacaoLote(
        { ...loteInput, itens: [{ regularizacaoId: 'r1' }, { regularizacaoId: 'r2' }] },
        actor,
      ),
    ).rejects.toBeInstanceOf(RegularizacaoValidationError);
    expect(mockTx.patrimonio.create).not.toHaveBeenCalled();
  });

  it('rejeita setor de outro município', async () => {
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', municipalityId: 'OUTRO' });
    await expect(
      incorporarRegularizacaoLote({ ...loteInput, itens: [{ regularizacaoId: 'r1' }] }, actor),
    ).rejects.toBeInstanceOf(RegularizacaoValidationError);
  });

  it('rejeita regularizações repetidas no lote', async () => {
    await expect(
      incorporarRegularizacaoLote({ ...loteInput, itens: [{ regularizacaoId: 'r1' }, { regularizacaoId: 'r1' }] }, actor),
    ).rejects.toBeInstanceOf(RegularizacaoValidationError);
  });
});
