/**
 * Testes de validação das rotas de email-config (achado 22/40).
 *
 * Contexto: PUT /api/email-config (updateEmailConfig) e POST
 * /api/email-config/test (testEmailConfig) não tinham validação de body —
 * o /test recebia um email do usuário sem validação de formato. Agora ambas
 * passam por `zodValidate` no nível da rota.
 *
 * Cobertura:
 *   - updateEmailConfigSchema: exige host/port/user/fromAddress, valida faixa
 *     de porta e formato de fromAddress; password é opcional (o controller
 *     mantém a senha atual em updates e exige na criação).
 *   - testEmailConfigSchema: exige email com formato válido.
 */

import { updateEmailConfigSchema, testEmailConfigSchema } from '@sispat/shared';

describe('EmailConfig — validação da rota PUT', () => {
  const valid = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'app@gmail.com',
    password: 'segredo',
    fromAddress: 'SISPAT <noreply@dominio.com>',
    enabled: true,
  };

  it('aceita configuração SMTP completa válida', () => {
    expect(updateEmailConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('aceita update sem password (mantém senha atual no controller)', () => {
    const { password, ...rest } = valid;
    expect(updateEmailConfigSchema.safeParse(rest).success).toBe(true);
  });

  it('rejeita host ausente/vazio', () => {
    expect(updateEmailConfigSchema.safeParse({ ...valid, host: '' }).success).toBe(false);
    const { host, ...semHost } = valid;
    expect(updateEmailConfigSchema.safeParse(semHost).success).toBe(false);
  });

  it('rejeita porta fora da faixa 1-65535', () => {
    expect(updateEmailConfigSchema.safeParse({ ...valid, port: 0 }).success).toBe(false);
    expect(updateEmailConfigSchema.safeParse({ ...valid, port: 70000 }).success).toBe(false);
  });

  it('rejeita porta não-inteira ou como string', () => {
    expect(updateEmailConfigSchema.safeParse({ ...valid, port: 587.5 }).success).toBe(false);
    expect(updateEmailConfigSchema.safeParse({ ...valid, port: '587' }).success).toBe(false);
  });

  it('rejeita fromAddress sem @', () => {
    expect(updateEmailConfigSchema.safeParse({ ...valid, fromAddress: 'sem-arroba' }).success).toBe(
      false,
    );
  });

  it('rejeita user ausente', () => {
    const { user, ...semUser } = valid;
    expect(updateEmailConfigSchema.safeParse(semUser).success).toBe(false);
  });
});

describe('EmailConfig — validação da rota POST /test', () => {
  it('aceita email de teste válido', () => {
    expect(testEmailConfigSchema.safeParse({ email: 'teste@exemplo.com' }).success).toBe(true);
  });

  it('rejeita email ausente', () => {
    expect(testEmailConfigSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita email com formato inválido', () => {
    expect(testEmailConfigSchema.safeParse({ email: 'nao-eh-email' }).success).toBe(false);
    expect(testEmailConfigSchema.safeParse({ email: 'falta@arroba' }).success).toBe(false);
  });

  it('rejeita email não-string', () => {
    expect(testEmailConfigSchema.safeParse({ email: 123 }).success).toBe(false);
  });
});
