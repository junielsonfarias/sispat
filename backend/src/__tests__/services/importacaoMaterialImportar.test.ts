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

const mockProximoConfigurado = jest.fn();
jest.mock('../../services/numberingService', () => ({
  proximoNumeroConfiguradoTx: (...args: unknown[]) => mockProximoConfigurado(...args),
  formatNumero: (prefix: string, seqLen: number, seq: number) =>
    `${prefix}${String(seq).padStart(seqLen, '0')}`,
}));

const mockTx = {
  patrimonio: { create: jest.fn(), findFirst: jest.fn() },
  activityLog: { create: jest.fn() },
  historicoEntry: { create: jest.fn() },
  local: { findFirst: jest.fn(), create: jest.fn() },
  tipoBem: { findFirst: jest.fn(), create: jest.fn() },
  acquisitionForm: { findFirst: jest.fn(), create: jest.fn() },
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
  numeroLicitacao: 'CD A.2026-001',
  anoLicitacao: 2026,
  observacoes: 'Importado do relatório SIAFIC · UG: Fundo Municipal de Saúde · Empenho: CD A.2026-001 (nº 02030013)',
  sectorId: 's1',
  setorNome: 'Saúde',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCache.deletePattern.mockResolvedValue(undefined);
  mockPrisma.sector.findUnique.mockResolvedValue({ id: 's1', name: 'Saúde', codigo: 'SAUDE', municipalityId: 'mun-1' });
  // Numeração no formato do sistema (por setor): prefixo {ano}{codigoSetor}, seq de 6.
  mockProximoConfigurado.mockImplementation((_tx: unknown, p: { sectorCode: string }) =>
    Promise.resolve({ prefix: `2026${p.sectorCode}`, seqLen: 6, sequencial: 5 }),
  );
  mockTx.patrimonio.create.mockImplementation((args: any) =>
    Promise.resolve({ id: `p-${args.data.numero_patrimonio}`, numero_patrimonio: args.data.numero_patrimonio }),
  );
  mockTx.activityLog.create.mockResolvedValue({});
  mockTx.historicoEntry.create.mockResolvedValue({});
  // Por padrão o setor ainda não tem Almoxarifado: força o find-or-create.
  mockTx.local.findFirst.mockResolvedValue(null);
  mockTx.local.create.mockImplementation((args: any) =>
    Promise.resolve({ id: `loc-${args.data.sectorId}` }),
  );
  // Por padrão tipo/forma ainda não existem: força o cadastro automático.
  mockTx.tipoBem.findFirst.mockResolvedValue(null);
  mockTx.tipoBem.create.mockImplementation((args: any) =>
    Promise.resolve({ id: `tipo-${args.data.nome}` }),
  );
  mockTx.acquisitionForm.findFirst.mockResolvedValue(null);
  mockTx.acquisitionForm.create.mockImplementation((args: any) =>
    Promise.resolve({ id: `forma-${args.data.nome}` }),
  );
  // Por padrão NÃO há bem com a mesma assinatura: nada é tratado como duplicata.
  mockTx.patrimonio.findFirst.mockResolvedValue(null);
});

describe('importarPatrimonios', () => {
  it('explode a quantidade em N patrimônios com números sequenciais', async () => {
    const r = await importarPatrimonios([baseItem({ quantidade: 3 })], actor);
    expect(r.total).toBe(3);
    expect(r.linhas).toBe(1);
    expect(mockTx.patrimonio.create).toHaveBeenCalledTimes(3);
    const numeros = mockTx.patrimonio.create.mock.calls.map((c: any) => c[0].data.numero_patrimonio);
    // Formato do sistema (sem 'PAT'): {ano}{codigoSetor}{seq}.
    expect(numeros).toEqual(['2026SAUDE000005', '2026SAUDE000006', '2026SAUDE000007']);
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

  it('mapeamento COMPLETO: cada campo no seu lugar (extração máxima)', async () => {
    await importarPatrimonios([baseItem({ quantidade: 1 })], actor);
    const d = mockTx.patrimonio.create.mock.calls[0][0].data;
    // identificação / valores
    expect(d.descricao_bem).toBe('NOBREAK 600 VA-120V');
    expect(d.tipo).toBe('Outros Materiais Permanentes');
    expect(d.valor_aquisicao).toBe(752);
    expect(d.quantidade).toBe(1);
    expect(d.data_aquisicao).toBeInstanceOf(Date);
    // processo de aquisição
    expect(d.forma_aquisicao).toBe('Dispensa/Compra Direta');
    expect(d.numero_licitacao).toBe('CD A.2026-001'); // processo do empenho
    expect(d.ano_licitacao).toBe(2026);
    expect(d.numero_nota_fiscal).toBe('697/1');
    // rastreabilidade contábil (campos dedicados)
    expect(d.fornecedor).toBe('ARIOSNALDO DA SILVA VITAL LTDA');
    expect(d.numero_empenho).toBe('02030013');
    expect(d.numero_liquidacao).toBe('11030018');
    expect(d.origem_recurso).toBe('transferencia_ente');
    // trilha completa em observações
    expect(d.observacoes).toContain('UG: Fundo Municipal de Saúde');
    expect(d.observacoes).toContain('Empenho: CD A.2026-001');
    // defaults de bem novo
    expect(d.situacao_bem).toBe('OTIMO');
    expect(d.status).toBe('ativo');
    expect(d.destinacao).toBe('uso_especial');
    expect(d.destinacaoRevisada).toBe(true);
    expect(d.tipo_posse).toBe('proprio');
    expect(d.metodo_depreciacao).toBe('Linear');
    // tenant
    expect(d.municipalityId).toBe('mun-1');
    expect(d.sectorId).toBe('s1');
    expect(d.createdBy).toBe('u1');
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

  it('registra um evento de histórico IMPORTAÇÃO por unidade', async () => {
    await importarPatrimonios([baseItem({ quantidade: 3 })], actor);
    expect(mockTx.historicoEntry.create).toHaveBeenCalledTimes(3);
    const d = mockTx.historicoEntry.create.mock.calls[0][0].data;
    expect(d.action).toBe('IMPORTAÇÃO');
    expect(d.patrimonioId).toBeDefined();
    expect(d.details).toContain('importado');
  });

  it('grava o fundo do recurso quando informado', async () => {
    await importarPatrimonios([baseItem({ quantidade: 1, fundoRecurso: 'FUNDEB' })], actor);
    expect(mockTx.patrimonio.create.mock.calls[0][0].data.fundo_recurso).toBe('FUNDEB');
  });

  it('normaliza fundo vazio/só-espaços para null', async () => {
    await importarPatrimonios([baseItem({ quantidade: 1, fundoRecurso: '   ' })], actor);
    expect(mockTx.patrimonio.create.mock.calls[0][0].data.fundo_recurso).toBeNull();
  });

  it('cria o Almoxarifado do setor quando não existe e tomba os bens nele', async () => {
    await importarPatrimonios([baseItem({ quantidade: 1 })], actor);
    // find-or-create: procurou e criou o Almoxarifado do setor s1
    expect(mockTx.local.findFirst).toHaveBeenCalledTimes(1);
    expect(mockTx.local.create).toHaveBeenCalledTimes(1);
    expect(mockTx.local.create.mock.calls[0][0].data).toMatchObject({
      name: 'Almoxarifado',
      sectorId: 's1',
      municipalityId: 'mun-1',
    });
    const d = mockTx.patrimonio.create.mock.calls[0][0].data;
    expect(d.localId).toBe('loc-s1');
    expect(d.local_objeto).toBe('Almoxarifado');
  });

  it('reutiliza o Almoxarifado existente do setor (não duplica)', async () => {
    mockTx.local.findFirst.mockResolvedValue({ id: 'loc-existente' });
    await importarPatrimonios([baseItem({ quantidade: 2 })], actor);
    expect(mockTx.local.create).not.toHaveBeenCalled();
    expect(mockTx.patrimonio.create.mock.calls[0][0].data.localId).toBe('loc-existente');
  });

  it('resolve o Almoxarifado uma vez por setor distinto', async () => {
    mockPrisma.sector.findUnique.mockImplementation((args: any) =>
      Promise.resolve({ id: args.where.id, name: args.where.id, codigo: args.where.id, municipalityId: 'mun-1' }),
    );
    await importarPatrimonios(
      [baseItem({ sectorId: 's1', quantidade: 1 }), baseItem({ sectorId: 's2', quantidade: 1 })],
      actor,
    );
    // 2 setores distintos → 2 resoluções de almoxarifado
    expect(mockTx.local.findFirst).toHaveBeenCalledTimes(2);
    expect(mockTx.local.create).toHaveBeenCalledTimes(2);
  });

  it('cadastra tipo e forma de aquisição automaticamente e linka o bem via FK', async () => {
    const r = await importarPatrimonios([baseItem({ quantidade: 1 })], actor);
    // Tipo e forma novos → 1 de cada cadastrado
    expect(mockTx.tipoBem.create).toHaveBeenCalledTimes(1);
    expect(mockTx.tipoBem.create.mock.calls[0][0].data.nome).toBe('Outros Materiais Permanentes');
    expect(mockTx.acquisitionForm.create).toHaveBeenCalledTimes(1);
    expect(mockTx.acquisitionForm.create.mock.calls[0][0].data.nome).toBe('Dispensa/Compra Direta');
    expect(r.tiposCriados).toBe(1);
    expect(r.formasCriadas).toBe(1);
    // O bem fica linkado às tabelas de referência (FK), não só na string.
    const d = mockTx.patrimonio.create.mock.calls[0][0].data;
    expect(d.tipoId).toBe('tipo-Outros Materiais Permanentes');
    expect(d.acquisitionFormId).toBe('forma-Dispensa/Compra Direta');
  });

  it('não duplica tipo/forma já existentes (find-or-create) e linka ao existente', async () => {
    mockTx.tipoBem.findFirst.mockResolvedValue({ id: 'tipo-existente' });
    mockTx.acquisitionForm.findFirst.mockResolvedValue({ id: 'forma-existente' });
    const r = await importarPatrimonios([baseItem({ quantidade: 1 })], actor);
    expect(mockTx.tipoBem.create).not.toHaveBeenCalled();
    expect(mockTx.acquisitionForm.create).not.toHaveBeenCalled();
    expect(r.tiposCriados).toBe(0);
    expect(r.formasCriadas).toBe(0);
    const d = mockTx.patrimonio.create.mock.calls[0][0].data;
    expect(d.tipoId).toBe('tipo-existente');
    expect(d.acquisitionFormId).toBe('forma-existente');
  });

  it('tipo/forma vazios ou só espaços caem no fallback (sem referência de nome vazio)', async () => {
    await importarPatrimonios([baseItem({ tipo: '   ', formaAquisicao: '', quantidade: 1 })], actor);
    expect(mockTx.tipoBem.create.mock.calls[0][0].data.nome).toBe('Não especificado');
    expect(mockTx.acquisitionForm.create.mock.calls[0][0].data.nome).toBe('Compra');
    const d = mockTx.patrimonio.create.mock.calls[0][0].data;
    // String do bem casa exatamente com o nome da referência linkada.
    expect(d.tipo).toBe('Não especificado');
    expect(d.tipoId).toBe('tipo-Não especificado');
    expect(d.forma_aquisicao).toBe('Compra');
    expect(d.acquisitionFormId).toBe('forma-Compra');
  });

  it('deduplica tipo/forma iguais em itens diferentes (1 cadastro só)', async () => {
    await importarPatrimonios(
      [
        baseItem({ descricao: 'A', quantidade: 1 }),
        baseItem({ descricao: 'B', quantidade: 1 }),
      ],
      actor,
    );
    // Mesmo tipo/forma nos 2 itens → cadastra uma vez cada.
    expect(mockTx.tipoBem.create).toHaveBeenCalledTimes(1);
    expect(mockTx.acquisitionForm.create).toHaveBeenCalledTimes(1);
  });

  it('ignora item cuja assinatura já existe (não duplica na re-importação)', async () => {
    mockTx.patrimonio.findFirst.mockResolvedValue({ id: 'ja-existe' });
    const r = await importarPatrimonios([baseItem({ quantidade: 3 })], actor);
    expect(r.total).toBe(0);
    expect(r.duplicatas).toBe(1);
    // Nada criado: nem patrimônios, nem numeração, nem tipo/forma.
    expect(mockTx.patrimonio.create).not.toHaveBeenCalled();
    expect(mockTx.tipoBem.create).not.toHaveBeenCalled();
    expect(mockProximoConfigurado).not.toHaveBeenCalled();
  });

  it('a assinatura usa liquidação + NF + descrição + valor + data', async () => {
    await importarPatrimonios([baseItem({ quantidade: 1 })], actor);
    const where = mockTx.patrimonio.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      municipalityId: 'mun-1',
      descricao_bem: 'NOBREAK 600 VA-120V',
      valor_aquisicao: 752,
      numero_nota_fiscal: '697/1',
      numero_liquidacao: '11030018',
    });
    expect(where.data_aquisicao).toBeInstanceOf(Date);
  });

  it('importa só os itens novos quando parte do lote já existe', async () => {
    // 'NOVO' não existe; 'VELHO' já existe → só o novo é criado.
    mockTx.patrimonio.findFirst.mockImplementation((args: any) =>
      Promise.resolve(args.where.descricao_bem === 'VELHO' ? { id: 'x' } : null),
    );
    const r = await importarPatrimonios(
      [
        baseItem({ descricao: 'NOVO', quantidade: 2 }),
        baseItem({ descricao: 'VELHO', quantidade: 5 }),
      ],
      actor,
    );
    expect(r.total).toBe(2); // só as 2 unidades do item novo
    expect(r.duplicatas).toBe(1);
    expect(mockTx.patrimonio.create).toHaveBeenCalledTimes(2);
    const descricoes = mockTx.patrimonio.create.mock.calls.map(
      (c: any) => c[0].data.descricao_bem,
    );
    expect(new Set(descricoes)).toEqual(new Set(['NOVO']));
  });
});
