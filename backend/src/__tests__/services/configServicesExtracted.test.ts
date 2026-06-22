/**
 * Caracterização dos services extraídos do configController nesta rodada:
 * formFieldConfigService e cloudStorageService. Garantem que a extração
 * preserva comportamento (escopo por município, ownership/superuser, NotFound,
 * auto-create do cloud storage).
 */

const mockPrisma = {
  formFieldConfig: {
    findMany: jest.fn(() => []),
    create: jest.fn((a: { data: Record<string, unknown> }) => ({ id: 'f1', ...a.data })),
    findFirst: jest.fn(),
    update: jest.fn((a: { where: { id: string } }) => ({ id: a.where.id })),
    delete: jest.fn(),
  },
  cloudStorage: {
    findUnique: jest.fn(),
    create: jest.fn((a: { data: Record<string, unknown> }) => ({ id: 'cs1', ...a.data })),
    upsert: jest.fn((a: { update: Record<string, unknown> }) => ({ id: 'cs1', ...a.update })),
  },
};
jest.mock('../../index', () => ({ prisma: mockPrisma }));

import {
  listFormFieldConfigs,
  createFormFieldConfig,
  updateFormFieldConfig,
  removeFormFieldConfig,
  FormFieldConfigNotFoundError,
} from '../../services/formFieldConfigService';
import { getCloudStorage, upsertCloudStorage } from '../../services/cloudStorageService';

const actorA = { role: 'admin', municipalityId: 'mun-A' };
const superuser = { role: 'superuser', municipalityId: 'mun-Z' };

beforeEach(() => jest.clearAllMocks());

describe('formFieldConfigService', () => {
  it('list escopa por município', async () => {
    await listFormFieldConfigs(actorA);
    expect(mockPrisma.formFieldConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { municipalityId: 'mun-A' } }),
    );
  });

  it('create usa o município do actor e aplica defaults', async () => {
    await createFormFieldConfig(actorA, { key: 'k', label: 'L', type: 'text' });
    const data = (mockPrisma.formFieldConfig.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.municipalityId).toBe('mun-A');
    expect(data.required).toBe(false);
    expect(data.options).toEqual([]);
  });

  it('update: NotFound quando é de outro município (não atualiza)', async () => {
    mockPrisma.formFieldConfig.findFirst.mockResolvedValue(null);
    await expect(updateFormFieldConfig(actorA, 'f-de-B', { label: 'X' })).rejects.toBeInstanceOf(
      FormFieldConfigNotFoundError,
    );
    expect(mockPrisma.formFieldConfig.update).not.toHaveBeenCalled();
  });

  it('update: ownership escopa por município; superuser bypassa', async () => {
    mockPrisma.formFieldConfig.findFirst.mockResolvedValue({ id: 'f1' });
    await updateFormFieldConfig(actorA, 'f1', { label: 'X' });
    expect((mockPrisma.formFieldConfig.findFirst.mock.calls[0][0] as { where: { municipalityId?: string } }).where.municipalityId).toBe('mun-A');

    mockPrisma.formFieldConfig.findFirst.mockClear();
    mockPrisma.formFieldConfig.findFirst.mockResolvedValue({ id: 'f1' });
    await updateFormFieldConfig(superuser, 'f1', { label: 'X' });
    expect((mockPrisma.formFieldConfig.findFirst.mock.calls[0][0] as { where: { municipalityId?: string } }).where.municipalityId).toBeUndefined();
  });

  it('remove: NotFound e não deleta quando outro município', async () => {
    mockPrisma.formFieldConfig.findFirst.mockResolvedValue(null);
    await expect(removeFormFieldConfig(actorA, 'f-de-B')).rejects.toBeInstanceOf(
      FormFieldConfigNotFoundError,
    );
    expect(mockPrisma.formFieldConfig.delete).not.toHaveBeenCalled();
  });
});

describe('cloudStorageService', () => {
  it('getCloudStorage retorna o existente quando há', async () => {
    mockPrisma.cloudStorage.findUnique.mockResolvedValue({ id: 'cs1', municipalityId: 'mun-A' });
    const r = await getCloudStorage('mun-A');
    expect(r).toEqual({ id: 'cs1', municipalityId: 'mun-A' });
    expect(mockPrisma.cloudStorage.create).not.toHaveBeenCalled();
  });

  it('getCloudStorage cria config vazia (desconectada) quando não existe', async () => {
    mockPrisma.cloudStorage.findUnique.mockResolvedValue(null);
    const r = await getCloudStorage('mun-A');
    const data = (mockPrisma.cloudStorage.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toEqual({ municipalityId: 'mun-A', isConnected: false });
    expect(r.isConnected).toBe(false);
  });

  it('upsertCloudStorage usa municipalityId como chave', async () => {
    await upsertCloudStorage('mun-A', { provider: 'google_drive', isConnected: true });
    const arg = mockPrisma.cloudStorage.upsert.mock.calls[0][0] as unknown as {
      where: { municipalityId: string };
    };
    expect(arg.where.municipalityId).toBe('mun-A');
  });
});
