/**
 * Testes para o middleware zodValidate — Sprint 19.
 *
 * Cobertura:
 *   - Validação de body/params/query.
 *   - Erro retorna formato { error, details: [{ field, message }] }.
 *   - Em sucesso, req.body é SUBSTITUÍDO pelo valor parseado (defaults aplicados).
 *   - Schemas reais do @sispat/shared (loginSchema, changePasswordSchema)
 *     espelham as regras do frontend.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { zodValidate } from '../../middlewares/zodValidate';
import {
  loginSchema,
  changePasswordSchema,
  STRONG_PASSWORD_REGEX,
} from '@sispat/shared';

type MockRes = {
  status: jest.Mock<MockRes, [number]>;
  json: jest.Mock<MockRes, [unknown]>;
  body?: unknown;
  statusCode?: number;
};

function buildRes(): MockRes {
  const res: MockRes = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

function buildReq(parts: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    ...parts,
  } as Request;
}

describe('zodValidate middleware', () => {
  it('chama next() quando body é válido', () => {
    const next: NextFunction = jest.fn();
    const req = buildReq({ body: { email: 'a@b.com', password: 'x' } });
    const res = buildRes();

    zodValidate({ body: loginSchema })(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 400 com lista de details quando body inválido', () => {
    const next: NextFunction = jest.fn();
    const req = buildReq({ body: { email: 'não-é-email', password: '' } });
    const res = buildRes();

    zodValidate({ body: loginSchema })(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    const payload = res.body as { error: string; details: Array<{ field: string }> };
    expect(payload.error).toBe('Dados inválidos');
    expect(payload.details.length).toBeGreaterThanOrEqual(1);
    expect(payload.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('substitui req.body pelo valor parseado (defaults aplicados)', () => {
    const schema = z.object({
      name: z.string(),
      page: z.number().default(1),
    });
    const next: NextFunction = jest.fn();
    const req = buildReq({ body: { name: 'x' } });
    const res = buildRes();

    zodValidate({ body: schema })(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'x', page: 1 });
  });

  it('valida params separadamente do body', () => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const next: NextFunction = jest.fn();
    const req = buildReq({ params: { id: 'não-é-uuid' } });
    const res = buildRes();

    zodValidate({ params: paramsSchema })(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it('coleta erros de body + params + query num único response', () => {
    const next: NextFunction = jest.fn();
    const req = buildReq({
      body: { email: 'inválido', password: 'x' },
      params: { id: 'não-é-uuid' },
      query: { page: 'abc' },
    });
    const res = buildRes();

    zodValidate({
      body: loginSchema,
      params: z.object({ id: z.string().uuid() }),
      query: z.object({ page: z.coerce.number() }),
    })(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    const payload = res.body as { details: Array<unknown> };
    expect(payload.details.length).toBeGreaterThanOrEqual(3);
  });
});

describe('@sispat/shared — schemas espelham regras críticas', () => {
  it('loginSchema rejeita email malformado', () => {
    expect(loginSchema.safeParse({ email: 'x', password: 'y' }).success).toBe(false);
  });

  it('loginSchema aceita email + password mínimos', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('changePasswordSchema exige senha forte (12+ chars, símbolo)', () => {
    // Senha que passava na antiga validação (min 8, sem símbolo) — deve falhar
    const weak = changePasswordSchema.safeParse({
      oldPassword: 'qualquer',
      newPassword: 'Abcd1234',
    });
    expect(weak.success).toBe(false);

    // Senha forte — deve passar
    const strong = changePasswordSchema.safeParse({
      oldPassword: 'qualquer',
      newPassword: 'Abcd1234!XyZ',
    });
    expect(strong.success).toBe(true);
  });

  it('STRONG_PASSWORD_REGEX rejeita senhas curtas', () => {
    expect(STRONG_PASSWORD_REGEX.test('Aa1!aaaa')).toBe(false); // 8 chars
    expect(STRONG_PASSWORD_REGEX.test('Aa1!aaaaaaaa')).toBe(true); // 12 chars
  });

  it('STRONG_PASSWORD_REGEX rejeita senha sem símbolo', () => {
    expect(STRONG_PASSWORD_REGEX.test('Aaaaaaaaaaa1')).toBe(false);
  });
});
