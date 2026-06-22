/**
 * Caracterização dos services extraídos do configController (batch 2):
 * userReportConfig, rolePermission, numberingPattern, userDashboard.
 */

const mockPrisma = {
  userReportConfig: {
    findMany: jest.fn(() => []),
    create: jest.fn((a: { data: Record<string, unknown> }) => ({ id: 'urc1', ...a.data })),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  rolePermission: {
    findMany: jest.fn(() => []),
    upsert: jest.fn((a: { update: Record<string, unknown> }) => ({ id: 'rp1', ...a.update })),
  },
  numberingPattern: {
    findUnique: jest.fn(),
    create: jest.fn((a: { data: Record<string, unknown> }) => ({ id: 'np1', ...a.data })),
    upsert: jest.fn((a: { update: Record<string, unknown> }) => ({ id: 'np1', ...a.update })),
  },
  userDashboard: {
    findUnique: jest.fn(),
    create: jest.fn((a: { data: Record<string, unknown> }) => ({ id: 'ud1', ...a.data })),
    upsert: jest.fn((a: { update: Record<string, unknown> }) => ({ id: 'ud1', ...a.update })),
  },
};
jest.mock('../../index', () => ({ prisma: mockPrisma }));

import {
  listUserReportConfigs,
  createUserReportConfig,
  removeUserReportConfig,
  UserReportConfigNotFoundError,
} from '../../services/userReportConfigService';
import { listRolePermissions, upsertRolePermission } from '../../services/rolePermissionService';
import { getNumberingPattern, upsertNumberingPattern } from '../../services/numberingPatternService';
import { getUserDashboard, upsertUserDashboard } from '../../services/userDashboardService';

beforeEach(() => jest.clearAllMocks());

describe('userReportConfigService', () => {
  it('list escopa por userId', async () => {
    await listUserReportConfigs('user-1');
    expect(mockPrisma.userReportConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('create usa o userId e aplica defaults (filters {}, format csv)', async () => {
    await createUserReportConfig('user-1', { name: 'R', columns: [] });
    const data = (mockPrisma.userReportConfig.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.userId).toBe('user-1');
    expect(data.filters).toEqual({});
    expect(data.format).toBe('csv');
  });

  it('remove: NotFound quando a config é de outro usuário (não deleta)', async () => {
    mockPrisma.userReportConfig.findUnique.mockResolvedValue({ id: 'c1', userId: 'outro' });
    await expect(removeUserReportConfig('user-1', 'c1')).rejects.toBeInstanceOf(
      UserReportConfigNotFoundError,
    );
    expect(mockPrisma.userReportConfig.delete).not.toHaveBeenCalled();
  });

  it('remove: deleta quando é do próprio usuário', async () => {
    mockPrisma.userReportConfig.findUnique.mockResolvedValue({ id: 'c1', userId: 'user-1' });
    await removeUserReportConfig('user-1', 'c1');
    expect(mockPrisma.userReportConfig.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});

describe('rolePermissionService', () => {
  it('list ordena por roleId', async () => {
    await listRolePermissions();
    expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({ orderBy: { roleId: 'asc' } });
  });

  it('upsert usa roleId como chave', async () => {
    await upsertRolePermission('admin', { name: 'Admin', permissions: ['bens:read'] });
    expect(mockPrisma.rolePermission.upsert.mock.calls[0][0]).toMatchObject({
      where: { roleId: 'admin' },
    });
  });
});

describe('numberingPatternService', () => {
  it('get retorna o existente', async () => {
    mockPrisma.numberingPattern.findUnique.mockResolvedValue({ id: 'np1', municipalityId: 'mun-A' });
    const r = await getNumberingPattern('mun-A');
    expect(r).toEqual({ id: 'np1', municipalityId: 'mun-A' });
    expect(mockPrisma.numberingPattern.create).not.toHaveBeenCalled();
  });

  it('get cria padrão vazio quando não existe', async () => {
    mockPrisma.numberingPattern.findUnique.mockResolvedValue(null);
    await getNumberingPattern('mun-A');
    const data = (mockPrisma.numberingPattern.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toEqual({ municipalityId: 'mun-A', components: [] });
  });

  it('upsert keyed por municipalityId', async () => {
    await upsertNumberingPattern('mun-A', []);
    expect(mockPrisma.numberingPattern.upsert.mock.calls[0][0]).toMatchObject({
      where: { municipalityId: 'mun-A' },
    });
  });
});

describe('userDashboardService', () => {
  it('get cria dashboard vazio quando não existe', async () => {
    mockPrisma.userDashboard.findUnique.mockResolvedValue(null);
    await getUserDashboard('user-1');
    const data = (mockPrisma.userDashboard.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toEqual({ userId: 'user-1', widgets: [] });
  });

  it('upsert keyed por userId', async () => {
    await upsertUserDashboard('user-1', []);
    expect(mockPrisma.userDashboard.upsert.mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-1' },
    });
  });
});
