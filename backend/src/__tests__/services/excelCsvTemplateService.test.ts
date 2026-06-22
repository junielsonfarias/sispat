/**
 * Testes de caracterização do excelCsvTemplateService (extraído do
 * configController). Garantem que a extração preserva o comportamento:
 * escopo por município, ownership com bypass de superuser, e NotFound no
 * cross-tenant (mapeado a 404 pelo controller).
 */

const mockPrisma = {
  excelCsvTemplate: {
    findMany: jest.fn(() => []),
    create: jest.fn((args: { data: Record<string, unknown> }) => ({ id: 't1', ...args.data })),
    findFirst: jest.fn(),
    update: jest.fn((args: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: args.where.id,
      ...args.data,
    })),
    delete: jest.fn(),
  },
};
jest.mock('../../index', () => ({ prisma: mockPrisma }));

import {
  listExcelCsvTemplates,
  createExcelCsvTemplate,
  updateExcelCsvTemplate,
  removeExcelCsvTemplate,
  ExcelCsvTemplateNotFoundError,
} from '../../services/excelCsvTemplateService';

const actorA = { role: 'admin', municipalityId: 'mun-A' };
const superuser = { role: 'superuser', municipalityId: 'mun-Z' };

beforeEach(() => jest.clearAllMocks());

describe('excelCsvTemplateService', () => {
  it('list escopa por município do actor', async () => {
    await listExcelCsvTemplates(actorA);
    expect(mockPrisma.excelCsvTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { municipalityId: 'mun-A' } }),
    );
  });

  it('create usa o município do actor (não confia em input)', async () => {
    await createExcelCsvTemplate(actorA, { name: 'X', columns: [] });
    const data = (mockPrisma.excelCsvTemplate.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.municipalityId).toBe('mun-A');
    expect(data.name).toBe('X');
  });

  it('update: lança NotFound quando o template é de outro município (cross-tenant)', async () => {
    mockPrisma.excelCsvTemplate.findFirst.mockResolvedValue(null);
    await expect(updateExcelCsvTemplate(actorA, 't-de-B', { name: 'Y' })).rejects.toBeInstanceOf(
      ExcelCsvTemplateNotFoundError,
    );
    expect(mockPrisma.excelCsvTemplate.update).not.toHaveBeenCalled();
  });

  it('update: ownership escopa por município (não-superuser)', async () => {
    mockPrisma.excelCsvTemplate.findFirst.mockResolvedValue({ id: 't1' });
    await updateExcelCsvTemplate(actorA, 't1', { name: 'Y' });
    const where = (mockPrisma.excelCsvTemplate.findFirst.mock.calls[0][0] as { where: { municipalityId?: string } }).where;
    expect(where.municipalityId).toBe('mun-A');
    expect(mockPrisma.excelCsvTemplate.update).toHaveBeenCalled();
  });

  it('update: superuser bypassa o filtro de município', async () => {
    mockPrisma.excelCsvTemplate.findFirst.mockResolvedValue({ id: 't1' });
    await updateExcelCsvTemplate(superuser, 't1', { name: 'Y' });
    const where = (mockPrisma.excelCsvTemplate.findFirst.mock.calls[0][0] as { where: { municipalityId?: string } }).where;
    expect(where.municipalityId).toBeUndefined();
  });

  it('remove: lança NotFound e NÃO deleta quando é de outro município', async () => {
    mockPrisma.excelCsvTemplate.findFirst.mockResolvedValue(null);
    await expect(removeExcelCsvTemplate(actorA, 't-de-B')).rejects.toBeInstanceOf(
      ExcelCsvTemplateNotFoundError,
    );
    expect(mockPrisma.excelCsvTemplate.delete).not.toHaveBeenCalled();
  });

  it('remove: deleta quando é do próprio município', async () => {
    mockPrisma.excelCsvTemplate.findFirst.mockResolvedValue({ id: 't1' });
    await removeExcelCsvTemplate(actorA, 't1');
    expect(mockPrisma.excelCsvTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});
