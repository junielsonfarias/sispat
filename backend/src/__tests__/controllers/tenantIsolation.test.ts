/**
 * Testes de isolamento multi-tenant nos controllers "estilo config" que antes
 * vazavam dados entre municípios (auditoria de 2026-06-22).
 *
 * Princípio verificado (tenant negativo): um usuário NÃO-superuser do município A
 * só pode consultar dados do próprio município — toda query deve carregar o filtro
 * por municipalityId. O superuser bypassa (vê todos).
 */

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('../../config/redis', () => ({
  redisCache: { get: jest.fn(), set: jest.fn() },
  CacheUtils: { invalidateDocumentos: jest.fn(), getDocumentosKey: jest.fn(() => 'k') },
}));

jest.mock('../../utils/activityLogger', () => ({
  logActivity: jest.fn(),
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
  activityLog: {
    findMany: jest.fn(() => []),
    count: jest.fn(() => 0),
    create: jest.fn(),
    groupBy: jest.fn(() => []),
  },
  excelCsvTemplate: { findMany: jest.fn(() => []), findFirst: jest.fn(), delete: jest.fn() },
  systemConfiguration: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(() => ({ id: 'cfg-1' })) },
  documentoGeral: {
    findMany: jest.fn(() => []),
    count: jest.fn(() => 0),
    findFirst: jest.fn(),
    update: jest.fn(() => ({ id: 'doc1' })),
    delete: jest.fn(),
  },
  labelTemplate: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(() => ({ id: 'lt1', name: 'Etiqueta' })),
  },
  user: { findUnique: jest.fn() },
  imovelCustomField: {
    findMany: jest.fn(() => []),
    findFirst: jest.fn(),
    update: jest.fn(() => ({ id: 'if1' })),
    updateMany: jest.fn(() => ({ count: 1 })),
    delete: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};
jest.mock('../../index', () => ({ prisma: mockPrisma }));
// resolveSectorScope (services/sectorScope) importa prisma de config/database —
// precisa do MESMO mock para o filtro por setor da manutenção funcionar no teste.
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import { getTiposBens, getTipoBemById, createTipoBem } from '../../controllers/tiposBensController';
import { getFormasAquisicao } from '../../controllers/formasAquisicaoController';
import { getSectors } from '../../controllers/sectorsController';
import { getLocais } from '../../controllers/locaisController';
import {
  listManutencaoTasks,
  updateManutencaoTask,
} from '../../controllers/manutencaoController';
import { listAuditLogs, getAuditLogStats } from '../../controllers/auditLogController';
import { getExcelCsvTemplates, deleteExcelCsvTemplate } from '../../controllers/configController';
import { updateSystemConfiguration } from '../../controllers/systemConfigController';
import {
  listDocuments,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
} from '../../controllers/documentController';
import {
  getLabelTemplateById,
  updateLabelTemplate,
  deleteLabelTemplate,
} from '../../controllers/labelTemplateController';
import {
  listImovelFields,
  updateImovelField,
  deleteImovelField,
  reorderImovelFields,
} from '../../controllers/imovelFieldController';

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
  res.download = jest.fn(() => res);
  res.send = jest.fn(() => res);
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

describe('tenant isolation — imovelFields', () => {
  it('usuário do município A só vê campos personalizados do próprio município', async () => {
    await listImovelFields(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.imovelCustomField.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBe('mun-A');
  });

  it('superuser não recebe filtro de município (vê todos)', async () => {
    await listImovelFields(makeReq({ role: 'superuser' }), makeRes());
    const arg = (mockPrisma.imovelCustomField.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBeUndefined();
  });

  it('retorna 401 quando não há município no token e NÃO consulta', async () => {
    const res = makeRes();
    await listImovelFields(makeReq(null), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.imovelCustomField.findMany).not.toHaveBeenCalled();
  });
});

describe('IDOR por id — updateImovelField escopa por município', () => {
  it('busca o campo alvo filtrando por municipalityId (não-superuser)', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce({ id: 'if1' });
    await updateImovelField(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'if1' }, { label: 'Nova' }),
      makeRes(),
    );
    expect(mockPrisma.imovelCustomField.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'if1', municipalityId: 'mun-A' }) }),
    );
  });

  it('campo de OUTRO município recebe 404 e NÃO atualiza (cross-tenant bloqueado)', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await updateImovelField(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'if-de-B' }, { label: 'Nova' }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.imovelCustomField.update).not.toHaveBeenCalled();
  });

  it('superuser não recebe filtro de município (vê todos)', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce({ id: 'if1' });
    await updateImovelField(makeReq({ role: 'superuser' }, {}, { id: 'if1' }, { label: 'Nova' }), makeRes());
    const arg = (mockPrisma.imovelCustomField.findFirst.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBeUndefined();
    expect(mockPrisma.imovelCustomField.update).toHaveBeenCalled();
  });

  it('retorna 401 quando não há município no token e NÃO consulta', async () => {
    const res = makeRes();
    await updateImovelField(makeReq(null, {}, { id: 'if1' }, {}), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.imovelCustomField.findFirst).not.toHaveBeenCalled();
  });
});

describe('IDOR por id — deleteImovelField escopa por município', () => {
  it('busca o campo alvo filtrando por municipalityId antes de excluir (não-superuser)', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce({ id: 'if1', isSystem: false });
    await deleteImovelField(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'if1' }),
      makeRes(),
    );
    expect(mockPrisma.imovelCustomField.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'if1', municipalityId: 'mun-A' }) }),
    );
    expect(mockPrisma.imovelCustomField.delete).toHaveBeenCalled();
  });

  it('campo de OUTRO município recebe 404 e NÃO exclui (cross-tenant bloqueado)', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await deleteImovelField(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'if-de-B' }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.imovelCustomField.delete).not.toHaveBeenCalled();
  });

  it('superuser não recebe filtro de município (vê todos)', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce({ id: 'if1', isSystem: false });
    await deleteImovelField(makeReq({ role: 'superuser' }, {}, { id: 'if1' }), makeRes());
    const arg = (mockPrisma.imovelCustomField.findFirst.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBeUndefined();
    expect(mockPrisma.imovelCustomField.delete).toHaveBeenCalled();
  });

  it('campo do sistema retorna 400 e NÃO exclui', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce({ id: 'if1', isSystem: true });
    const res = makeRes();
    await deleteImovelField(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'if1' }), res);
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.imovelCustomField.delete).not.toHaveBeenCalled();
  });

  it('retorna 401 quando não há município no token e NÃO consulta', async () => {
    const res = makeRes();
    await deleteImovelField(makeReq(null, {}, { id: 'if1' }), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.imovelCustomField.findFirst).not.toHaveBeenCalled();
  });
});

describe('mass-assignment — updateImovelField', () => {
  it('ignora campos fora da whitelist (id, municipalityId) e mantém os válidos', async () => {
    mockPrisma.imovelCustomField.findFirst.mockResolvedValueOnce({ id: 'if1' });
    await updateImovelField(
      makeReq(
        { role: 'admin', municipalityId: 'mun-A' },
        {},
        { id: 'if1' },
        { label: 'Nova', displayOrder: 3, id: 'hack', municipalityId: 'mun-B', createdAt: 'x' },
      ),
      makeRes(),
    );
    const arg = (mockPrisma.imovelCustomField.update.mock.calls[0] as any[])[0];
    expect(arg.data).toEqual({ label: 'Nova', displayOrder: 3 });
    expect(arg.data.municipalityId).toBeUndefined();
    expect(arg.data.id).toBeUndefined();
  });
});

describe('IDOR por id — reorderImovelFields escopa cada update por município', () => {
  it('cada update casa id + municipalityId (não-superuser): ids de outro tenant não casam o where', async () => {
    await reorderImovelFields(
      makeReq(
        { role: 'admin', municipalityId: 'mun-A' },
        {},
        {},
        { fieldOrders: [{ id: 'if1', displayOrder: 0 }, { id: 'if-de-B', displayOrder: 1 }] },
      ),
      makeRes(),
    );
    expect(mockPrisma.imovelCustomField.updateMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.imovelCustomField.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'if1', municipalityId: 'mun-A' },
      data: { displayOrder: 0 },
    });
    expect(mockPrisma.imovelCustomField.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'if-de-B', municipalityId: 'mun-A' },
      data: { displayOrder: 1 },
    });
    // nunca usa update por id puro (que ignoraria o tenant)
    expect(mockPrisma.imovelCustomField.update).not.toHaveBeenCalled();
  });

  it('superuser não recebe filtro de município (reordena qualquer campo)', async () => {
    await reorderImovelFields(
      makeReq({ role: 'superuser' }, {}, {}, { fieldOrders: [{ id: 'if1', displayOrder: 2 }] }),
      makeRes(),
    );
    expect(mockPrisma.imovelCustomField.updateMany).toHaveBeenCalledWith({
      where: { id: 'if1' },
      data: { displayOrder: 2 },
    });
  });

  it('retorna 401 quando não há município no token e NÃO atualiza', async () => {
    const res = makeRes();
    await reorderImovelFields(makeReq(null, {}, {}, { fieldOrders: [{ id: 'if1', displayOrder: 0 }] }), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.imovelCustomField.updateMany).not.toHaveBeenCalled();
  });

  it('fieldOrders inválido retorna 400 e NÃO atualiza', async () => {
    const res = makeRes();
    await reorderImovelFields(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, {}, { fieldOrders: 'x' }), res);
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.imovelCustomField.updateMany).not.toHaveBeenCalled();
  });
});

describe('tenant isolation — manutenção (via relação patrimônio/imóvel)', () => {
  it('admin filtra por relação OR só com municipalityId (acesso total ao município)', async () => {
    await listManutencaoTasks(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.manutencaoTask.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.OR).toEqual([
      { patrimonio: { municipalityId: 'mun-A' } },
      { imovel: { municipalityId: 'mun-A' } },
    ]);
  });

  it('usuário filtra por relação OR com municipalityId + setores vinculados', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ responsibleSectors: ['Educação'] });
    mockPrisma.sector.findMany.mockResolvedValueOnce([{ id: 's-edu' }] as never);
    await listManutencaoTasks(makeReq({ role: 'usuario', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.manutencaoTask.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.OR).toEqual([
      { patrimonio: { municipalityId: 'mun-A', sectorId: { in: ['s-edu'] } } },
      { imovel: { municipalityId: 'mun-A', sectorId: { in: ['s-edu'] } } },
    ]);
  });

  it('usuário sem setor vinculado fica restrito a sectorId in [] (nada)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ responsibleSectors: [] });
    await listManutencaoTasks(makeReq({ role: 'usuario', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.manutencaoTask.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.OR).toEqual([
      { patrimonio: { municipalityId: 'mun-A', sectorId: { in: [] } } },
      { imovel: { municipalityId: 'mun-A', sectorId: { in: [] } } },
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

  it('getAuditLogStats: admin só agrega estatísticas do próprio município', async () => {
    await getAuditLogStats(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    const groupByArg = (mockPrisma.activityLog.groupBy.mock.calls[0] as any[])[0];
    expect(groupByArg.where.user).toEqual({ municipalityId: 'mun-A' });
    // a agregação diária (findMany) também é escopada
    const dailyArg = (mockPrisma.activityLog.findMany.mock.calls[0] as any[])[0];
    expect(dailyArg.where.user).toEqual({ municipalityId: 'mun-A' });
  });

  it('getAuditLogStats: superuser agrega de todos os municípios', async () => {
    await getAuditLogStats(makeReq({ role: 'superuser' }), makeRes());
    const groupByArg = (mockPrisma.activityLog.groupBy.mock.calls[0] as any[])[0];
    expect(groupByArg.where.user).toBeUndefined();
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

describe('tenant isolation — listDocuments escopa por município (via uploadedBy)', () => {
  it('usuário do município A filtra pelo município do uploader (não-superuser)', async () => {
    await listDocuments(makeReq({ role: 'admin', municipalityId: 'mun-A' }), makeRes());
    const arg = (mockPrisma.documentoGeral.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.uploadedBy).toEqual({ municipalityId: 'mun-A' });
  });

  it('superuser não recebe filtro de uploadedBy (vê todos)', async () => {
    await listDocuments(makeReq({ role: 'superuser' }), makeRes());
    const arg = (mockPrisma.documentoGeral.findMany.mock.calls[0] as any[])[0];
    expect(arg.where.uploadedBy).toBeUndefined();
  });

  it('retorna 401 quando não há usuário autenticado e NÃO consulta', async () => {
    const res = makeRes();
    await listDocuments(makeReq(null), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.documentoGeral.findMany).not.toHaveBeenCalled();
  });

  it('não-superuser sem município no token recebe 401 e NÃO consulta TODOS os municípios', async () => {
    const res = makeRes();
    await listDocuments(makeReq({ role: 'admin', municipalityId: '' }), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.documentoGeral.findMany).not.toHaveBeenCalled();
  });
});

describe('IDOR por id — getDocument escopa por município (via uploadedBy)', () => {
  it('getDocument busca com filtro de município do uploader (não-superuser)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce({ id: 'doc1' });
    await getDocument(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'doc1' }), makeRes());
    expect(mockPrisma.documentoGeral.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'doc1', uploadedBy: { municipalityId: 'mun-A' } }),
      }),
    );
  });

  it('getDocument de outro município retorna 404 (não vaza existência)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await getDocument(makeReq({ role: 'usuario', municipalityId: 'mun-A' }, {}, { id: 'doc-de-B' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('superuser não recebe filtro de uploadedBy (vê todos)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce({ id: 'doc1' });
    await getDocument(makeReq({ role: 'superuser' }, {}, { id: 'doc1' }), makeRes());
    const arg = (mockPrisma.documentoGeral.findFirst.mock.calls[0] as any[])[0];
    expect(arg.where.uploadedBy).toBeUndefined();
  });

  it('retorna 401 quando não há usuário autenticado', async () => {
    const res = makeRes();
    await getDocument(makeReq(null, {}, { id: 'doc1' }), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.documentoGeral.findFirst).not.toHaveBeenCalled();
  });
});

describe('IDOR por id — downloadDocument escopa por município (via uploadedBy)', () => {
  it('downloadDocument busca com filtro de município do uploader (não-superuser)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce({
      id: 'doc1',
      filePath: 'uploads/documents/x.pdf',
      fileName: 'x.pdf',
    });
    const res = makeRes();
    await downloadDocument(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'doc1' }), res);
    expect(mockPrisma.documentoGeral.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'doc1', uploadedBy: { municipalityId: 'mun-A' } }),
      }),
    );
    expect(res.download).toHaveBeenCalledWith('uploads/documents/x.pdf', 'x.pdf');
  });

  it('downloadDocument de outro município retorna 404 e NÃO baixa o arquivo', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await downloadDocument(makeReq({ role: 'usuario', municipalityId: 'mun-A' }, {}, { id: 'doc-de-B' }), res);
    expect(res.statusCode).toBe(404);
    expect(res.download).not.toHaveBeenCalled();
  });

  it('downloadDocument: superuser não recebe filtro de uploadedBy (vê todos)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce({
      id: 'doc1',
      filePath: 'uploads/documents/x.pdf',
      fileName: 'x.pdf',
    });
    await downloadDocument(makeReq({ role: 'superuser' }, {}, { id: 'doc1' }), makeRes());
    const arg = (mockPrisma.documentoGeral.findFirst.mock.calls[0] as any[])[0];
    expect(arg.where.uploadedBy).toBeUndefined();
  });

  it('downloadDocument retorna 401 quando não há usuário autenticado', async () => {
    const res = makeRes();
    await downloadDocument(makeReq(null, {}, { id: 'doc1' }), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.documentoGeral.findFirst).not.toHaveBeenCalled();
  });
});

describe('IDOR por id — updateDocument escopa por município (via uploadedBy)', () => {
  it('updateDocument busca com filtro de município do uploader (não-superuser)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce({ id: 'doc1', uploadedById: 'user-1', tags: [] });
    await updateDocument(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'doc1' }, {}), makeRes());
    expect(mockPrisma.documentoGeral.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'doc1', uploadedBy: { municipalityId: 'mun-A' } }),
      }),
    );
  });

  it('admin de OUTRO município recebe 404 e NÃO atualiza (cross-tenant bloqueado)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await updateDocument(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'doc-de-B' }, {}), res);
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.documentoGeral.update).not.toHaveBeenCalled();
  });

  it('superuser não recebe filtro de uploadedBy (vê todos)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce({ id: 'doc1', uploadedById: 'outro', tags: [] });
    await updateDocument(makeReq({ role: 'superuser' }, {}, { id: 'doc1' }, {}), makeRes());
    const arg = (mockPrisma.documentoGeral.findFirst.mock.calls[0] as any[])[0];
    expect(arg.where.uploadedBy).toBeUndefined();
    expect(mockPrisma.documentoGeral.update).toHaveBeenCalled();
  });

  it('retorna 401 quando não há usuário autenticado', async () => {
    const res = makeRes();
    await updateDocument(makeReq(null, {}, { id: 'doc1' }, {}), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.documentoGeral.findFirst).not.toHaveBeenCalled();
  });
});

describe('IDOR por id — deleteDocument escopa por município (via uploadedBy)', () => {
  it('deleteDocument busca com filtro de município do uploader (não-superuser)', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce({
      id: 'doc1',
      uploadedById: 'user-1',
      filePath: 'uploads/documents/x.pdf',
    });
    await deleteDocument(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'doc1' }), makeRes());
    expect(mockPrisma.documentoGeral.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'doc1', uploadedBy: { municipalityId: 'mun-A' } }),
      }),
    );
  });

  it('admin de OUTRO município recebe 404, NÃO deleta e NÃO apaga o arquivo físico', async () => {
    mockPrisma.documentoGeral.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    const fs = require('fs');
    await deleteDocument(makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'doc-de-B' }), res);
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.documentoGeral.delete).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('retorna 401 quando não há usuário autenticado', async () => {
    const res = makeRes();
    await deleteDocument(makeReq(null, {}, { id: 'doc1' }), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.documentoGeral.findFirst).not.toHaveBeenCalled();
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

describe('IDOR por id — getLabelTemplateById escopa por município', () => {
  it('busca o template filtrando por municipalityId (não-superuser)', async () => {
    mockPrisma.labelTemplate.findFirst.mockResolvedValueOnce({ id: 'lt1', name: 'Etiqueta' });
    await getLabelTemplateById(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'lt1' }),
      makeRes(),
    );
    expect(mockPrisma.labelTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'lt1', municipalityId: 'mun-A' }) }),
    );
  });

  it('template de OUTRO município retorna 404 (não vaza existência)', async () => {
    mockPrisma.labelTemplate.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await getLabelTemplateById(
      makeReq({ role: 'usuario', municipalityId: 'mun-A' }, {}, { id: 'lt-de-B' }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });

  it('superuser não recebe filtro de município (vê todos)', async () => {
    mockPrisma.labelTemplate.findFirst.mockResolvedValueOnce({ id: 'lt1', name: 'Etiqueta' });
    await getLabelTemplateById(makeReq({ role: 'superuser' }, {}, { id: 'lt1' }), makeRes());
    const arg = (mockPrisma.labelTemplate.findFirst.mock.calls[0] as any[])[0];
    expect(arg.where.municipalityId).toBeUndefined();
  });
});

describe('IDOR por id — updateLabelTemplate escopa por município', () => {
  it('busca o template alvo filtrando por municipalityId (não-superuser)', async () => {
    mockPrisma.labelTemplate.findFirst.mockResolvedValueOnce({ id: 'lt1', name: 'Etiqueta', isDefault: false });
    await updateLabelTemplate(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'lt1' }, { name: 'Nova' }),
      makeRes(),
    );
    expect(mockPrisma.labelTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'lt1', municipalityId: 'mun-A' }) }),
    );
  });

  it('admin de OUTRO município recebe 404 e NÃO atualiza (cross-tenant bloqueado)', async () => {
    mockPrisma.labelTemplate.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await updateLabelTemplate(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'lt-de-B' }, { name: 'Nova', isDefault: true }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.labelTemplate.update).not.toHaveBeenCalled();
    expect(mockPrisma.labelTemplate.updateMany).not.toHaveBeenCalled();
  });

  it('usuario sem papel de gestão recebe 403 e NÃO consulta o registro', async () => {
    const res = makeRes();
    await updateLabelTemplate(
      makeReq({ role: 'usuario', municipalityId: 'mun-A' }, {}, { id: 'lt1' }, { name: 'Nova' }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.labelTemplate.findFirst).not.toHaveBeenCalled();
  });
});

describe('IDOR por id — deleteLabelTemplate escopa por município', () => {
  it('busca o template alvo filtrando por municipalityId antes do soft-delete (não-superuser)', async () => {
    mockPrisma.labelTemplate.findFirst.mockResolvedValueOnce({ id: 'lt1', name: 'Etiqueta' });
    await deleteLabelTemplate(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'lt1' }),
      makeRes(),
    );
    expect(mockPrisma.labelTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'lt1', municipalityId: 'mun-A' }) }),
    );
  });

  it('admin de OUTRO município recebe 404 e NÃO desativa (cross-tenant tampering bloqueado)', async () => {
    mockPrisma.labelTemplate.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await deleteLabelTemplate(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, {}, { id: 'lt-de-B' }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.labelTemplate.update).not.toHaveBeenCalled();
  });

  it('usuario sem papel de gestão recebe 403 e NÃO consulta o registro', async () => {
    const res = makeRes();
    await deleteLabelTemplate(
      makeReq({ role: 'usuario', municipalityId: 'mun-A' }, {}, { id: 'lt1' }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.labelTemplate.findFirst).not.toHaveBeenCalled();
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
