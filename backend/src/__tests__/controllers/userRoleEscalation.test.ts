/**
 * Testes de anti-escalada de privilégio no userController (auditoria 2026, achado 4/21).
 *
 * Invariante verificada: createUser/updateUser não podem atribuir um papel de
 * nível superior ao do ator. Um 'supervisor' NÃO pode criar/promover para
 * 'admin' ou 'superuser' (o que daria bypass de municipalityId). Somente o
 * 'superuser' pode conceder papéis 'admin'/'superuser'.
 */

jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('../../config/redis', () => ({
  redisCache: { get: jest.fn(), set: jest.fn() },
  CacheUtils: { invalidateByPrefix: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => 'hashed'),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(() => ({ id: 'new-1', name: 'n', email: 'e@a.gov' })),
    update: jest.fn(() => ({ id: 'u1', name: 'n' })),
  },
  activityLog: { create: jest.fn() },
};
jest.mock('../../index', () => ({ prisma: mockPrisma }));

import { createUser, updateUser, resetUserPassword } from '../../controllers/userController';

type Role = 'usuario' | 'visualizador' | 'admin' | 'supervisor' | 'superuser';

function makeReq(
  user: { role: Role; municipalityId?: string } | null,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {},
) {
  return {
    user: user
      ? { role: user.role, municipalityId: user.municipalityId ?? 'mun-A', email: 'u@a.gov', userId: 'actor-1' }
      : undefined,
    params,
    body,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    get: () => 'jest',
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
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createUser — anti-escalada de privilégio', () => {
  it('supervisor NÃO pode criar superuser (403, sem create)', async () => {
    const res = makeRes();
    await createUser(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, {}, {
        email: 'novo@a.gov', name: 'Novo', password: 'x', role: 'superuser',
      }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('supervisor NÃO pode criar admin (403, sem create)', async () => {
    const res = makeRes();
    await createUser(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, {}, {
        email: 'novo@a.gov', name: 'Novo', password: 'x', role: 'admin',
      }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('supervisor PODE criar usuario (papel de nível inferior)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = makeRes();
    await createUser(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, {}, {
        email: 'novo@a.gov', name: 'Novo', password: 'x', role: 'usuario',
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('superuser PODE criar admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = makeRes();
    await createUser(
      makeReq({ role: 'superuser', municipalityId: 'mun-A' }, {}, {
        email: 'novo@a.gov', name: 'Novo', password: 'x', role: 'admin',
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });
});

describe('updateUser — anti-escalada de privilégio', () => {
  it('supervisor NÃO pode promover usuario existente para superuser (403, sem update)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'usuario', municipalityId: 'mun-A' });
    const res = makeRes();
    await updateUser(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, { id: 'u1' }, { role: 'superuser' }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('supervisor NÃO pode promover-se/promover para admin (403, sem update)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'usuario', municipalityId: 'mun-A' });
    const res = makeRes();
    await updateUser(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, { id: 'u1' }, { role: 'admin' }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('supervisor NÃO pode editar usuário cujo papel atual é superior (admin) — 403', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'admin', municipalityId: 'mun-A' });
    const res = makeRes();
    await updateUser(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, { id: 'u1' }, { name: 'Renomear' }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('supervisor PODE atualizar usuario para visualizador (nível inferior)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'usuario', municipalityId: 'mun-A' });
    const res = makeRes();
    await updateUser(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, { id: 'u1' }, { role: 'visualizador' }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it('superuser PODE promover usuario para admin', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'usuario', municipalityId: 'mun-A' });
    const res = makeRes();
    await updateUser(
      makeReq({ role: 'superuser', municipalityId: 'mun-A' }, { id: 'u1' }, { role: 'admin' }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });
});

describe('updateUser — persistência de email', () => {
  it('admin atualiza email (persiste em lowercase) quando não há colisão', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'usuario', email: 'velho@a.gov', municipalityId: 'mun-A' });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null); // email livre
    const res = makeRes();
    await updateUser(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, { id: 'u1' }, { email: 'Novo@A.gov' }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'novo@a.gov' }) }),
    );
  });

  it('rejeita email já usado por OUTRO usuário (400, sem update)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'usuario', email: 'velho@a.gov', municipalityId: 'mun-A' });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'outro', email: 'dup@a.gov' });
    const res = makeRes();
    await updateUser(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, { id: 'u1' }, { email: 'dup@a.gov' }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe('resetUserPassword — gestor redefine senha de terceiro', () => {
  it('alvo de OUTRO município retorna 404 e NÃO atualiza (escopo por municipalityId)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    const res = makeRes();
    await resetUserPassword(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, { id: 'u1' }, { password: 'NovaSenha@123' }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('supervisor NÃO pode redefinir senha de admin (nível superior) — 403, sem update', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'admin', municipalityId: 'mun-A' });
    const res = makeRes();
    await resetUserPassword(
      makeReq({ role: 'supervisor', municipalityId: 'mun-A' }, { id: 'u1' }, { password: 'NovaSenha@123' }),
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('admin PODE redefinir senha de usuario (nível inferior) e grava hash', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', role: 'usuario', municipalityId: 'mun-A' });
    const res = makeRes();
    await resetUserPassword(
      makeReq({ role: 'admin', municipalityId: 'mun-A' }, { id: 'u1' }, { password: 'NovaSenha@123' }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { password: 'hashed' } }),
    );
  });

  it('não autenticado retorna 401', async () => {
    const res = makeRes();
    await resetUserPassword(makeReq(null, { id: 'u1' }, { password: 'NovaSenha@123' }), res);
    expect(res.statusCode).toBe(401);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
