/**
 * Testes do conformidadeService — checklist de adequação à lei.
 */

const mockPrisma = {
  comissao: { findMany: jest.fn() },
  patrimonio: { count: jest.fn() },
  imovel: { count: jest.fn() },
  conciliacao: { findMany: jest.fn() },
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import { Actor, getChecklist, getAlertas } from '../../services/conformidadeService';

const actor: Actor = { userId: 'u1', role: 'admin', municipalityId: 'mun-1', email: 'a@x.gov' };
const now = new Date('2026-06-23T00:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.patrimonio.count.mockResolvedValue(0);
  mockPrisma.imovel.count.mockResolvedValue(0);
  mockPrisma.conciliacao.findMany.mockResolvedValue([]);
  mockPrisma.comissao.findMany.mockResolvedValue([]);
});

const item = (r: any, chave: string) => r.itens.find((i: any) => i.chave === chave);

describe('conformidadeService — getChecklist', () => {
  it('comissão ausente => nao_conforme', async () => {
    const r = await getChecklist(actor, now);
    expect(item(r, 'comissao_inventario').status).toBe('nao_conforme');
  });

  it('comissão ativa com mandato vigente e 3 membros => conforme', async () => {
    mockPrisma.comissao.findMany.mockResolvedValue([
      { tipo: 'inventario', portariaNumero: '1', mandatoFim: new Date('2027-01-01'), _count: { membros: 3 } },
    ]);
    const r = await getChecklist(actor, now);
    expect(item(r, 'comissao_inventario').status).toBe('conforme');
  });

  it('comissão com < 3 membros => atencao', async () => {
    mockPrisma.comissao.findMany.mockResolvedValue([
      { tipo: 'avaliacao', portariaNumero: '2', mandatoFim: new Date('2027-01-01'), _count: { membros: 2 } },
    ]);
    const r = await getChecklist(actor, now);
    expect(item(r, 'comissao_avaliacao').status).toBe('atencao');
  });

  it('destinação pendente => atencao', async () => {
    mockPrisma.patrimonio.count.mockImplementation((args: any) =>
      Promise.resolve(args.where.OR ? 5 : 0),
    );
    const r = await getChecklist(actor, now);
    expect(item(r, 'destinacao_classificada').status).toBe('atencao');
    expect(item(r, 'destinacao_classificada').detalhe).toContain('5');
  });

  it('conciliação divergente => nao_conforme; ausente => atencao', async () => {
    mockPrisma.conciliacao.findMany.mockResolvedValue([
      { categoria: 'bens_moveis', status: 'divergente', divergencia: 200, competencia: '2026-06' },
      // bens_imoveis ausente
    ]);
    const r = await getChecklist(actor, now);
    expect(item(r, 'conciliacao_bens_moveis').status).toBe('nao_conforme');
    expect(item(r, 'conciliacao_bens_imoveis').status).toBe('atencao');
  });

  it('resumo conta os status corretamente', async () => {
    const r = await getChecklist(actor, now);
    expect(r.resumo.total).toBe(r.itens.length);
    expect(r.resumo.conforme + r.resumo.atencao + r.resumo.naoConforme).toBe(r.itens.length);
  });
});

describe('conformidadeService — getAlertas', () => {
  it('retorna apenas itens que exigem ação', async () => {
    const r = await getAlertas(actor, now);
    // sem comissões => 4 nao_conforme + 2 conciliações atencao
    expect(r.naoConforme.length).toBeGreaterThanOrEqual(4);
    expect(r.total).toBe(r.naoConforme.length + r.atencao.length);
  });
});
