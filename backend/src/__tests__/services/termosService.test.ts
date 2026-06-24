/**
 * Testes do termosService — montagem dos dados, validação do termo de baixa e
 * isolamento de tenant.
 */

const mockPrisma = {
  patrimonio: { findUnique: jest.fn() },
  historicoEntry: { count: jest.fn(), create: jest.fn() },
  activityLog: { create: jest.fn() },
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  TermoNotFoundError,
  TermoValidationError,
  getTermo,
  emitirTermoCarga,
} from '../../services/termosService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };

const patrimonioBase = {
  id: 'p1',
  numero_patrimonio: '0001',
  descricao_bem: 'Mesa',
  tipo: 'Mobiliário',
  marca: null,
  modelo: null,
  numero_serie: null,
  situacao_bem: 'BOM',
  valor_aquisicao: 300,
  data_aquisicao: new Date('2020-01-01'),
  forma_aquisicao: 'Compra',
  status: 'ativo',
  destinacao: 'uso_especial',
  setor_responsavel: 'Almoxarifado',
  local_objeto: 'Sala 1',
  municipalityId: 'mun-1',
  sector: { name: 'Almoxarifado', codigo: 'ALM' },
  local: { name: 'Sala 1' },
  municipality: { name: 'Município X', state: 'PA' },
};

beforeEach(() => jest.clearAllMocks());

describe('termosService — getTermo', () => {
  it('monta o termo de carga com dados do bem e município', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(patrimonioBase);
    const t = await getTermo('carga', 'p1', actor);
    expect(t.tipo).toBe('carga');
    expect(t.titulo).toContain('CARGA');
    expect(t.municipio.nome).toBe('Município X');
    expect(t.bem.numero_patrimonio).toBe('0001');
    expect(t.referenciaLegal).toContain('Art. 14');
  });

  it('mascara cross-tenant como NotFound', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({ ...patrimonioBase, municipalityId: 'OUTRO' });
    await expect(getTermo('carga', 'p1', actor)).rejects.toBeInstanceOf(TermoNotFoundError);
  });

  it('termo de baixa exige bem baixado', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(patrimonioBase); // status ativo
    await expect(getTermo('baixa', 'p1', actor)).rejects.toBeInstanceOf(TermoValidationError);
  });

  it('termo de baixa inclui dados de baixa quando baixado', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({
      ...patrimonioBase,
      status: 'baixado',
      data_baixa: new Date('2026-06-01'),
      motivo_baixa: 'Desfazimento (inutilizacao): irrecuperável',
    });
    const t = await getTermo('baixa', 'p1', actor);
    expect(t.baixa?.motivo_baixa).toContain('Desfazimento');
  });
});

describe('termosService — emitirTermoCarga (Art. 14/34)', () => {
  it('gera número sequencial, persiste em histórico e retorna o termo', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue(patrimonioBase);
    mockPrisma.historicoEntry.count.mockResolvedValue(2); // já houve 2 no ano
    mockPrisma.historicoEntry.create.mockResolvedValue({});
    mockPrisma.activityLog.create.mockResolvedValue({});

    const t = await emitirTermoCarga('p1', actor);

    const ano = new Date().getFullYear();
    expect(t.numero).toBe(`TC-${ano}-0003`);
    expect(t.emitidoEm).not.toBeNull();
    // persistiu a emissão no histórico do bem com a ação correta
    const hist = mockPrisma.historicoEntry.create.mock.calls[0][0].data;
    expect(hist.patrimonioId).toBe('p1');
    expect(hist.action).toBe('TERMO_CARGA_EMITIDO');
    expect(hist.details).toContain('TC-');
    // contagem do ano filtra por município do bem
    expect(mockPrisma.historicoEntry.count.mock.calls[0][0].where.patrimonio.municipalityId).toBe('mun-1');
  });

  it('rejeita emitir termo de carga de bem baixado', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({ ...patrimonioBase, status: 'baixado' });
    await expect(emitirTermoCarga('p1', actor)).rejects.toBeInstanceOf(TermoValidationError);
    expect(mockPrisma.historicoEntry.create).not.toHaveBeenCalled();
  });

  it('mascara cross-tenant como NotFound', async () => {
    mockPrisma.patrimonio.findUnique.mockResolvedValue({ ...patrimonioBase, municipalityId: 'OUTRO' });
    await expect(emitirTermoCarga('p1', actor)).rejects.toBeInstanceOf(TermoNotFoundError);
  });
});
