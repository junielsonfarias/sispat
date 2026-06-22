/**
 * Guardrail de defesa-em-profundidade no authenticateToken: rejeita requisição
 * de não-superuser que tente operar em município diferente do JWT (via
 * body/params), sem injetar nada no body (não interfere com schemas strict).
 */

jest.mock('../../config/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logDebug: jest.fn(),
}));

const mockPrisma = { user: { findUnique: jest.fn() } };
jest.mock('../../index', () => ({ prisma: mockPrisma }));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(() => ({ userId: 'u1' })),
    JsonWebTokenError: class JsonWebTokenError extends Error {},
    TokenExpiredError: class TokenExpiredError extends Error {},
  },
}));

import { authenticateToken } from '../../middlewares/auth';

type Role = 'usuario' | 'admin' | 'supervisor' | 'superuser';

function makeReq(body: Record<string, unknown>, params: Record<string, unknown> = {}) {
  return {
    headers: { authorization: 'Bearer fake-token' },
    cookies: {},
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
  return res;
}

function setUser(role: Role, municipalityId: string) {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'u1',
    email: 'u@a.gov',
    name: 'U',
    role,
    municipalityId,
    isActive: true,
    responsibleSectors: [],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-chars';
});

describe('authenticateToken — guardrail de município', () => {
  it('bloqueia (403) body.municipalityId divergente para não-superuser', async () => {
    setUser('usuario', 'mun-A');
    const res = makeRes();
    const next = jest.fn();
    await authenticateToken(makeReq({ municipalityId: 'mun-B' }), res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('bloqueia (403) params.municipalityId divergente para não-superuser', async () => {
    setUser('admin', 'mun-A');
    const res = makeRes();
    const next = jest.fn();
    await authenticateToken(makeReq({}, { municipalityId: 'mun-B' }), res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite quando municipalityId do body bate com o do usuário', async () => {
    setUser('usuario', 'mun-A');
    const res = makeRes();
    const next = jest.fn();
    await authenticateToken(makeReq({ municipalityId: 'mun-A' }), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('permite quando body não informa municipalityId (não injeta nada)', async () => {
    setUser('usuario', 'mun-A');
    const req = makeReq({ nome: 'X' });
    const next = jest.fn();
    await authenticateToken(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.body.municipalityId).toBeUndefined(); // não-mutante
  });

  it('superuser pode operar em qualquer município (bypass)', async () => {
    setUser('superuser', 'mun-A');
    const res = makeRes();
    const next = jest.fn();
    await authenticateToken(makeReq({ municipalityId: 'mun-B' }), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
