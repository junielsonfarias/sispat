/**
 * Caracterização dos services de template de relatório extraídos do
 * configController: reportTemplateService (complexo — layout/isDefault/erros
 * NotFound/Forbidden/Validation) e imovelReportTemplateService (CRUD padrão).
 */

const mockPrisma = {
  reportTemplate: {
    findMany: jest.fn(() => []),
    findUnique: jest.fn(),
    create: jest.fn((a: { data: Record<string, unknown> }) => ({ id: 'rt1', ...a.data })),
    update: jest.fn((a: { where: { id: string } }) => ({ id: a.where.id })),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  imovelReportTemplate: {
    findMany: jest.fn(() => []),
    findFirst: jest.fn(),
    create: jest.fn((a: { data: Record<string, unknown> }) => ({ id: 'irt1', ...a.data })),
    update: jest.fn((a: { where: { id: string } }) => ({ id: a.where.id })),
    delete: jest.fn(),
  },
};
jest.mock('../../index', () => ({ prisma: mockPrisma }));

import {
  listReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  removeReportTemplate,
  ReportTemplateNotFoundError,
  ReportTemplateForbiddenError,
  ReportTemplateValidationError,
} from '../../services/reportTemplateService';
import {
  createImovelReportTemplate,
  updateImovelReportTemplate,
  removeImovelReportTemplate,
  ImovelReportTemplateNotFoundError,
} from '../../services/imovelReportTemplateService';

beforeEach(() => jest.clearAllMocks());

describe('reportTemplateService', () => {
  it('list escopa por município', async () => {
    await listReportTemplates('mun-A');
    expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { municipalityId: 'mun-A' } }),
    );
  });

  it('create: nome vazio lança ValidationError (não cria)', async () => {
    await expect(createReportTemplate('mun-A', { name: '  ' })).rejects.toBeInstanceOf(
      ReportTemplateValidationError,
    );
    expect(mockPrisma.reportTemplate.create).not.toHaveBeenCalled();
  });

  it('create: sem layout nem fields usa layout padrão vazio (3 componentes)', async () => {
    await createReportTemplate('mun-A', { name: 'T' });
    const data = (mockPrisma.reportTemplate.create.mock.calls[0][0] as { data: { layout: unknown[] } }).data;
    expect(Array.isArray(data.layout)).toBe(true);
    expect(data.layout).toHaveLength(3);
  });

  it('create: com fields gera layout tabular com props.fields', async () => {
    await createReportTemplate('mun-A', { name: 'T', fields: ['descricao_bem'] });
    const layout = (mockPrisma.reportTemplate.create.mock.calls[0][0] as { data: { layout: Array<{ type: string; props?: { fields: unknown } }> } }).data.layout;
    const table = layout.find((c) => c.type === 'TABLE');
    expect(table?.props?.fields).toEqual(['descricao_bem']);
  });

  it('create: isDefault desmarca os outros do município (updateMany)', async () => {
    await createReportTemplate('mun-A', { name: 'T', isDefault: true });
    expect(mockPrisma.reportTemplate.updateMany).toHaveBeenCalledWith({
      where: { municipalityId: 'mun-A', isDefault: true },
      data: { isDefault: false },
    });
  });

  it('update: NotFound quando o template não existe', async () => {
    mockPrisma.reportTemplate.findUnique.mockResolvedValue(null);
    await expect(updateReportTemplate('mun-A', 'x', { name: 'Y' })).rejects.toBeInstanceOf(
      ReportTemplateNotFoundError,
    );
    expect(mockPrisma.reportTemplate.update).not.toHaveBeenCalled();
  });

  it('update: Forbidden (403) quando é de outro município', async () => {
    mockPrisma.reportTemplate.findUnique.mockResolvedValue({ id: 'rt1', municipalityId: 'mun-B' });
    await expect(updateReportTemplate('mun-A', 'rt1', { name: 'Y' })).rejects.toBeInstanceOf(
      ReportTemplateForbiddenError,
    );
  });

  it('update: isDefault desmarca outros exceto o próprio (id not)', async () => {
    mockPrisma.reportTemplate.findUnique.mockResolvedValue({ id: 'rt1', municipalityId: 'mun-A' });
    await updateReportTemplate('mun-A', 'rt1', { isDefault: true });
    expect(mockPrisma.reportTemplate.updateMany).toHaveBeenCalledWith({
      where: { municipalityId: 'mun-A', isDefault: true, id: { not: 'rt1' } },
      data: { isDefault: false },
    });
  });

  it('remove: NotFound / Forbidden / sucesso', async () => {
    mockPrisma.reportTemplate.findUnique.mockResolvedValue(null);
    await expect(removeReportTemplate('mun-A', 'x')).rejects.toBeInstanceOf(ReportTemplateNotFoundError);

    mockPrisma.reportTemplate.findUnique.mockResolvedValue({ id: 'rt1', municipalityId: 'mun-B' });
    await expect(removeReportTemplate('mun-A', 'rt1')).rejects.toBeInstanceOf(ReportTemplateForbiddenError);

    mockPrisma.reportTemplate.findUnique.mockResolvedValue({ id: 'rt1', municipalityId: 'mun-A' });
    await removeReportTemplate('mun-A', 'rt1');
    expect(mockPrisma.reportTemplate.delete).toHaveBeenCalledWith({ where: { id: 'rt1' } });
  });
});

describe('imovelReportTemplateService', () => {
  const actorA = { role: 'admin', municipalityId: 'mun-A' };
  const superuser = { role: 'superuser', municipalityId: 'mun-Z' };

  it('create usa o município do actor', async () => {
    await createImovelReportTemplate(actorA, { name: 'T', fields: ['endereco'] });
    const data = (mockPrisma.imovelReportTemplate.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.municipalityId).toBe('mun-A');
  });

  it('update: NotFound cross-tenant; superuser bypassa o filtro', async () => {
    mockPrisma.imovelReportTemplate.findFirst.mockResolvedValue(null);
    await expect(updateImovelReportTemplate(actorA, 't-de-B', { name: 'Y' })).rejects.toBeInstanceOf(
      ImovelReportTemplateNotFoundError,
    );

    mockPrisma.imovelReportTemplate.findFirst.mockClear();
    mockPrisma.imovelReportTemplate.findFirst.mockResolvedValue({ id: 't1' });
    await updateImovelReportTemplate(superuser, 't1', { name: 'Y' });
    const where = (mockPrisma.imovelReportTemplate.findFirst.mock.calls[0][0] as { where: { municipalityId?: string } }).where;
    expect(where.municipalityId).toBeUndefined();
  });

  it('remove: NotFound e não deleta quando outro município', async () => {
    mockPrisma.imovelReportTemplate.findFirst.mockResolvedValue(null);
    await expect(removeImovelReportTemplate(actorA, 't-de-B')).rejects.toBeInstanceOf(
      ImovelReportTemplateNotFoundError,
    );
    expect(mockPrisma.imovelReportTemplate.delete).not.toHaveBeenCalled();
  });
});
