/**
 * Testes de isolamento multi-tenant nos controllers "estilo config" que antes
 * vazavam dados entre municípios (auditoria de 2026-06-22).
 *
 * Princípio verificado (tenant negativo): um usuário NÃO-superuser do município A
 * só pode consultar dados do próprio município — toda query deve carregar o filtro
 * por municipalityId. O superuser bypassa (vê todos).
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockPrisma = {
  tipoBem: { findMany: jest.fn(() => []), findFirst: jest.fn(), create: jest.fn(() => ({ id: 't1' })) },
  acquisitionForm: { findMany: jest.fn(() => []) },
  sector: { findMany: jest.fn(() => []) },
  local: { findMany: jest.fn(() => []) },
  manutencaoTask: {
    findMany: jest.fn(() => []),
    findFirst: jest.fn(),
    update: jest.fn(() => ({ id: 'task-1' })),
    delete: jest.fn(),
  },
  activityLog: { findMany: jest.fn(() => []), count: jest.fn(() => 0), create: jest.fn() },
  excelCsvTemplate: { findMany: jest.fn(() => []), findFirst: jest.fn(), delete: jest.fn() },
  systemConfiguration: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(() => ({ id: 'cfg-1' })) },
  user: { findUnique: jest.fn() },
};
jest.mock('../../index', () => ({ prisma: mockPrisma }));

import { getTiposBens, getTipoBemById, createTipoBem } from '../../controllers/tiposBensController';
import { getFormasAquisicao } from '../../controllers/formasAquisicaoController';
import { getSectors } from '../../controllers/sectorsController';
import { getLocais } from '../../controllers/locaisController';
import {
  listManutencaoTasks,
  updateManutencaoTask,
} from '../../controllers/manutencaoController';
import { listAuditLogs } from '../../controllers/auditLogController';
import { getExcelCsvTemplates, deleteExcelCsvTemplate } from '../../controllers/configController';
import { updateSystemConfiguration } from '../../controllers/systemConfigController';

type Role = 'usuario' | 'admin' | 'supervisor' | 'superuser';

function makeReq(
  user: { role: Role; municipalityId?: string } | null,
  query: Record<string, unknown> = {},
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {},
) {
  return {
    user: user
      ? { role: user.role, municipalityId: user.municipalityId ?? 'mun-A', email: 'u@a.gov', userId: 'user-1' }
      : undefined,
    query,
    params,
    body,
  } as any;
}

function makeRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = jest.fn((c: number) => {
    res.statusCode = c;
    return res;
  });
  res.json = jest.fn((b: unknown) => {
    res.body = b;
    return res;
  });
  res.setHeader = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('tenant isolation — tiposBens', () => {
  it('usuário do município A consulta filtrando por municipalityId', async () => {
    await getTiposBens(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    expect(mockPrisma.tipoBem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { municipalityId: 'mun-A' } }),
    );
  });

  it('superuser não recebe filtro de município (vê todos)', async () => {
    await getTiposBens(makeReq({ role: 'superuser' }), makeRes());
    expect(mockPrisma.tipoBem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

describe('tenant isolation — formasAquisicao', () => {
  it('usuário do município A filtra por municipalityId', async () => {
    await getFormasAquisicao(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    expect(mockPrisma.acquisitionForm.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { municipalityId: 'mun-A' } }),
    );
  });

  it('superuser vê todas', async () => {
    await getFormasAquisicao(makeReq({ role: 'superuser' }), makeRes());
    expect(mockPrisma.acquisitionForm.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

describe('tenant isolation — sectors', () => {
  it('admin do município A só vê setores do próprio município', async () => {
    await getSectors(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.sector.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBe('mun-A');
  });

  it('superuser não tem filtro de município', async () => {
    await getSectors(makeReq({ role: 'superuser' }), makeRes());
    const arg = (mockPrisma.sector.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBeUndefined();
  });
});

describe('tenant isolation — locais', () => {
  it('admin do município A só vê locais do próprio município', async () => {
    await getLocais(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.local.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBe('mun-A');
  });

  it('superuser não tem filtro de município', async () => {
    await getLocais(makeReq({ role: 'superuser' }), makeRes());
    const arg = (mockPrisma.local.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBeUndefined();
  });
});

describe('tenant isolation — manutenção (via relação patrimônio/imóvel)', () => {
  it('usuário do município A filtra por relação OR com municipalityId', async () => {
    await listManutencaoTasks(makeReq({ role: 'usuario', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.manutencaoTask.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.OR).toEqual([
      { patrimonio: { municipalityId: 'mun-A' } },
      { imovel: { municipalityId: 'mun-A' } },
    ]);
  });

  it('superuser não recebe filtro de relação', async () => {
    await listManutencaoTasks(makeReq({ role: 'superuser' }), makeRes());
    const arg = (mockPrisma.manutencaoTask.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.OR).toBeUndefined();
  });
});

describe('tenant isolation — audit logs (via relação user)', () => {
  it('admin do município A só vê logs de usuários do próprio município', async () => {
    await listAuditLogs(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.activityLog.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.user).toEqual({ municipalityId: 'mun-A' });
  });

  it('superuser vê logs de todos os municípios', async () => {
    await listAuditLogs(makeReq({ role: 'superuser' }), makeRes());
    const arg = (mockPrisma.activityLog.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.user).toBeUndefined();
  });
});

describe('tenant isolation — configController (sem município hardcoded)', () => {
  it('usa o municipalityId do usuário autenticado, não um ID fixo', async () => {
    await getExcelCsvTemplates(makeReq({ role: 'admin', municipalityId: 'mun-B' }), makeRes());
    expect(mockPrisma.excelCsvTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { municipalityId: 'mun-B' } }),
    );
  });

  it('retorna 401 quando não há município no token (sem cair em ID fixo)', async () => {
    const res = makeRes();
    await getExcelCsvTemplates(makeReq(null), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.excelCsvTemplate.findMany).not.toHaveBeenCalled();
  });
});

// ============================================================
// IDOR por id — getById / update / delete escopados ao tenant
// ============================================================

describe('IDOR por id — getById escopa por município', () => {
  it('getTipoBemById busca com filtro de município (não-superuser)', async () => {
    mockPrisma.tipoBem.findFirst.mockResolvedValueOnce({ id: 't1', _count: { patrimonios: 0 } });
    await getTipoBemById(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 't1' }), makeRes());
    expect(mockPrisma.tipoBem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 't1', municipalityId: 'mun-A' }) }),
    );
  });

  it('getTipoBemById de outro município retorna 404 (não vaza existência)', async () => {
    mockPrisma.tipoBem.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await getTipoBemById(makeReq({ role: 'usuario', municipalityId: 'mun-A' }, {}, { id: 't-de-B' }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('IDOR por id — update/delete checam propriedade antes de alterar', () => {
  it('updateManutencaoTask de outro município retorna 404 e NÃO atualiza', async () => {
    mockPrisma.manutencaoTask.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await updateManutencaoTask(makeReq({ role: 'usuario', municipalityId: 'mun-A' }, {}, { id: 'task-de-B' }), res);
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.manutencaoTask.update).not.toHaveBeenCalled();
  });

  it('deleteExcelCsvTemplate de outro município retorna 404 e NÃO exclui', async () => {
    mockPrisma.excelCsvTemplate.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await deleteExcelCsvTemplate(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'tpl-de-B' }), res);
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.excelCsvTemplate.delete).not.toHaveBeenCalled();
  });
});

// ============================================================
// Mass-assignment — apenas campos da whitelist chegam ao Prisma
// ============================================================

describe('mass-assignment — updateManutencaoTask', () => {
  it('ignora campos fora da whitelist (id, patrimonioId) e mantém os válidos', async () => {
    mockPrisma.manutencaoTask.findFirst.mockResolvedValueOnce({ id: 'task-1' });
    await updateManutencaoTask(
      makeReq(
        { role: 'usuario', municipalityId: 'mun-A' },
        {},
        { id: 'task-1' },
        { status: 'concluida', custo: 50, id: 'hack', patrimonioId: 'de-outro-mun' },
      ),
      makeRes(),
    );
    const arg = (mockPrisma.manutencaoTask.update.mock.calls[0] as any[])[0];
    expect(arg.data).toEqual({ status: 'concluida', custo: 50 });
    expect(arg.data.patrimonioId).toBeUndefined();
    expect(arg.data.id).toBeUndefined();
  });
});

describe('mass-assignment — updateSystemConfiguration', () => {
  it('ignora campos não permitidos (id, updatedAt) e aceita os da whitelist', async () => {
    mockPrisma.systemConfiguration.findFirst.mockResolvedValueOnce({ id: 'cfg-1' });
    await updateSystemConfiguration(
      makeReq(
        { role: 'admin', municipalityId: 'mun-A' },
        {},
        {},
        { maintenanceMode: true, maxUploadSize: 999, id: 'hack', updatedAt: 'x' },
      ),
      makeRes(),
    );
    const arg = (mockPrisma.systemConfiguration.update.mock.calls[0] as any[])[0];
    expect(arg.data).toEqual({ maintenanceMode: true, maxUploadSize: 999 });
  });
});

// ============================================================
// Unicidade de nome escopada por município
// ============================================================

describe('unicidade por município — createTipoBem', () => {
  it('verifica duplicidade de nome dentro do município do usuário', async () => {
    mockPrisma.tipoBem.findFirst.mockResolvedValueOnce(null);
    await createTipoBem(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, {}, { nome: 'Mesa' }),
      makeRes(),
    );
    expect(mockPrisma.tipoBem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nome: 'Mesa', municipalityId: 'mun-A' } }),
    );
  });
});
