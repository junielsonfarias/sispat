/**
 * Testes do termosService — montagem dos dados, validação do termo de baixa e
 * isolamento de tenant.
 */

const mockPrisma = {
  patrimonio: { findUnique: jest.fn() },
};

jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  Actor,
  TermoNotFoundError,
  TermoValidationError,
  getTermo,
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
