/**
 * Testes do desfazimentoService — bloqueios de status, conclusão (baixa do bem)
 * e tenant.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockCache = { deletePattern: jest.fn() };
jest.mock('../../config/redis', () => ({ redisCache: mockCache }));

const mockTx = {
  patrimonio: { update: jest.fn() },
  historicoEntry: { create: jest.fn() },
  desfazimento: { update: jest.fn() },
  activityLog: { create: jest.fn() },
};

const mockPrisma = {
  patrimonio: { findUnique: jest.fn() },
  comissao: { findUnique: jest.fn() },
  desfazimento: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  DesfazimentoValidationError,
  createDesfazimento,
  concluirDesfazimento,
} from '../../services/desfazimentoService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.deletePattern.mockResolvedValue(undefined);
});

const baseInput = {
  patrimonioId: 'p1',
  classificacao: 'irrecuperavel',
  modalidade: 'inutilizacao',
  justificativa: 'Bem sem condições de uso e sem recuperação econômica.',
};

describe('createDesfazimento', () => {
  it('rejeita bem já baixado', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'baixado', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    await expect(createDesfazimento(baseInput, actor)).rejects.toBeInstanceOf(
      DesfazimentoValidationError,
    );
  });

  it('rejeita duplicado em andamento', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    mockPrisma.desfazimento.findFirst.mockResolvedValue({ id: 'existente' });
    await expect(createDesfazimento(baseInput, actor)).rejects.toBeInstanceOf(
      DesfazimentoValidationError,
    );
  });

  it('cria quando o bem está ativo', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    mockPrisma.desfazimento.findFirst.mockResolvedValue(null);
    mockPrisma.desfazimento.create.mockResolvedValue({ id: 'd1', classificacao: 'irrecuperavel', modalidade: 'inutilizacao' });
    mockPrisma.activityLog.create.mockResolvedValue({});
    const r = await createDesfazimento(baseInput, actor);
    expect(mockPrisma.desfazimento.create.mock.calls[0][0].data.municipalityId).toBe('mun-1');
    expect(r.id).toBe('d1');
  });
});

describe('concluirDesfazimento', () => {
  const comissaoOk = { id: 'c1', tipo: 'desfazimento_desafetacao', status: 'ativa', portariaNumero: '01' };

  it('baixa o patrimônio e marca concluído', async () => {
    mockPrisma.desfazimento.findUnique.mockResolvedValue({
      id: 'd1', status: 'em_andamento', municipalityId: 'mun-1', patrimonioId: 'p1',
      classificacao: 'irrecuperavel', modalidade: 'inutilizacao', justificativa: 'x',
      comissaoId: 'c1', comissao: comissaoOk,
    });
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    mockTx.patrimonio.update.mockResolvedValue({});
    mockTx.historicoEntry.create.mockResolvedValue({});
    mockTx.desfazimento.update.mockResolvedValue({ id: 'd1', status: 'concluido' });
    mockTx.activityLog.create.mockResolvedValue({});

    await concluirDesfazimento('d1', actor);

    const pdata = mockTx.patrimonio.update.mock.calls[0][0].data;
    expect(pdata.status).toBe('baixado');
    expect(pdata.data_baixa).toBeInstanceOf(Date);
    expect(pdata.motivo_baixa).toContain('Desfazimento');
    expect(mockTx.desfazimento.update.mock.calls[0][0].data.status).toBe('concluido');
    expect(mockCache.deletePattern).toHaveBeenCalledWith('patrimonios:*');
  });

  it('rejeita baixar bem emprestado', async () => {
    mockPrisma.desfazimento.findUnique.mockResolvedValue({
      id: 'd1', status: 'em_andamento', municipalityId: 'mun-1', patrimonioId: 'p1',
      classificacao: 'ocioso', modalidade: 'inutilizacao', justificativa: 'x',
      comissaoId: 'c1', comissao: comissaoOk,
    });
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'emprestado', numero_patrimonio: '0001', municipalityId: 'mun-1',
    });
    await expect(concluirDesfazimento('d1', actor)).rejects.toBeInstanceOf(
      DesfazimentoValidationError,
    );
  });

  it('rejeita concluir sem Comissão de Desfazimento e Desafetação (Art. 14 Decreto)', async () => {
    mockPrisma.desfazimento.findUnique.mockResolvedValue({
      id: 'd1', status: 'em_andamento', municipalityId: 'mun-1', patrimonioId: 'p1',
      classificacao: 'irrecuperavel', modalidade: 'inutilizacao', justificativa: 'x',
      comissaoId: null, comissao: null,
    });
    await expect(concluirDesfazimento('d1', actor)).rejects.toBeInstanceOf(
      DesfazimentoValidationError,
    );
    expect(mockPrisma.patrimonio.findUnique).not.toHaveBeenCalled();
  });

  it('rejeita comissão de tipo errado na conclusão', async () => {
    mockPrisma.desfazimento.findUnique.mockResolvedValue({
      id: 'd1', status: 'em_andamento', municipalityId: 'mun-1', patrimonioId: 'p1',
      classificacao: 'irrecuperavel', modalidade: 'inutilizacao', justificativa: 'x',
      comissaoId: 'c1', comissao: { ...comissaoOk, tipo: 'avaliacao' },
    });
    await expect(concluirDesfazimento('d1', actor)).rejects.toBeInstanceOf(
      DesfazimentoValidationError,
    );
  });

  it('rejeita comissão não ativa na conclusão', async () => {
    mockPrisma.desfazimento.findUnique.mockResolvedValue({
      id: 'd1', status: 'em_andamento', municipalityId: 'mun-1', patrimonioId: 'p1',
      classificacao: 'irrecuperavel', modalidade: 'inutilizacao', justificativa: 'x',
      comissaoId: 'c1', comissao: { ...comissaoOk, status: 'encerrada' },
    });
    await expect(concluirDesfazimento('d1', actor)).rejects.toBeInstanceOf(
      DesfazimentoValidationError,
    );
  });
});

describe('trava de alienação sem desafetação (Art. 22/23)', () => {
  it('rejeita INICIAR desfazimento por leilão de bem de uso_especial', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
      destinacao: 'uso_especial',
    });
    await expect(
      createDesfazimento({ ...baseInput, classificacao: 'ocioso', modalidade: 'leilao' }, actor),
    ).rejects.toThrow(/desafeta/i);
  });

  it('permite INICIAR desfazimento por leilão de bem dominical avaliado', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
      destinacao: 'dominical',
    });
    mockPrisma.desfazimento.findFirst.mockResolvedValue(null);
    mockPrisma.desfazimento.create.mockResolvedValue({ id: 'd2', classificacao: 'ocioso', modalidade: 'leilao' });
    mockPrisma.activityLog.create.mockResolvedValue({});
    const r = await createDesfazimento(
      { ...baseInput, classificacao: 'ocioso', modalidade: 'leilao', valorAvaliacao: 1500 }, actor,
    );
    expect(r.id).toBe('d2');
  });

  it('rejeita alienação (leilão) sem avaliação prévia (Art. 23 / Art. 14 Decreto)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
      destinacao: 'dominical',
    });
    mockPrisma.desfazimento.findFirst.mockResolvedValue(null);
    await expect(
      createDesfazimento({ ...baseInput, classificacao: 'ocioso', modalidade: 'leilao' }, actor),
    ).rejects.toThrow(/avaliação prévia/i);
    expect(mockPrisma.desfazimento.create).not.toHaveBeenCalled();
  });

  it('permite INUTILIZAÇÃO de bem não-dominical (não é alienação)', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
      destinacao: 'uso_especial',
    });
    mockPrisma.desfazimento.findFirst.mockResolvedValue(null);
    mockPrisma.desfazimento.create.mockResolvedValue({ id: 'd3', classificacao: 'irrecuperavel', modalidade: 'inutilizacao' });
    mockPrisma.activityLog.create.mockResolvedValue({});
    const r = await createDesfazimento(baseInput, actor); // modalidade inutilizacao
    expect(r.id).toBe('d3');
  });

  it('rejeita CONCLUIR desfazimento por doação de bem não desafetado', async () => {
    mockPrisma.desfazimento.findUnique.mockResolvedValue({
      id: 'd1', status: 'em_andamento', municipalityId: 'mun-1', patrimonioId: 'p1',
      classificacao: 'ocioso', modalidade: 'doacao', justificativa: 'x',
      comissaoId: 'c1', comissao: { id: 'c1', tipo: 'desfazimento_desafetacao', status: 'ativa', portariaNumero: '01' },
    });
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      id: 'p1', status: 'ativo', numero_patrimonio: '0001', municipalityId: 'mun-1',
      destinacao: 'uso_especial',
    });
    await expect(concluirDesfazimento('d1', actor)).rejects.toThrow(/desafeta/i);
  });
});
