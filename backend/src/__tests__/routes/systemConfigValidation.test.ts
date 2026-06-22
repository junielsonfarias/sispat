/**
 * Testes de validação da rota PUT /api/system-config (achado 21/40).
 *
 * Contexto: a rota mutante (PUT '/') passou a ter `zodValidate({ body:
 * updateSystemConfigSchema })` aplicado no nível da rota, que antes só tinha
 * authenticateToken + authorize, sem validação de body.
 *
 * Cobertura:
 *   - updateSystemConfigSchema aceita body parcial válido.
 *   - rejeita tipos inválidos (boolean como string, número negativo).
 *   - rejeita enum inválido em backupFrequency.
 *   - NÃO é strict: campos extras (id/updatedAt) passam pelo parse mas são
 *     descartados pelo whitelist ALLOWED_CONFIG_FIELDS do controller — o
 *     parse não pode falhar por causa deles (parity com o controller).
 */

import { updateSystemConfigSchema } from '@sispat/shared';

describe('SystemConfig — validação da rota PUT', () => {
  it('aceita body parcial válido', () => {
    const result = updateSystemConfigSchema.safeParse({ maintenanceMode: true });
    expect(result.success).toBe(true);
  });

  it('aceita body vazio (nenhum campo a atualizar)', () => {
    expect(updateSystemConfigSchema.safeParse({}).success).toBe(true);
  });

  it('rejeita boolean enviado como string', () => {
    const result = updateSystemConfigSchema.safeParse({ maintenanceMode: 'true' });
    expect(result.success).toBe(false);
  });

  it('rejeita maxUploadSize não-positivo', () => {
    expect(updateSystemConfigSchema.safeParse({ maxUploadSize: 0 }).success).toBe(false);
    expect(updateSystemConfigSchema.safeParse({ maxUploadSize: -1 }).success).toBe(false);
  });

  it('rejeita sessionTimeout não-inteiro', () => {
    expect(updateSystemConfigSchema.safeParse({ sessionTimeout: 1.5 }).success).toBe(false);
  });

  it('rejeita passwordExpiryDays negativo', () => {
    expect(updateSystemConfigSchema.safeParse({ passwordExpiryDays: -10 }).success).toBe(false);
  });

  it('rejeita backupFrequency fora do enum', () => {
    expect(updateSystemConfigSchema.safeParse({ backupFrequency: 'hourly' }).success).toBe(false);
  });

  it('aceita backupFrequency válido', () => {
    expect(updateSystemConfigSchema.safeParse({ backupFrequency: 'weekly' }).success).toBe(true);
  });

  it('não é strict: campos extras não fazem o parse falhar (whitelist no controller descarta)', () => {
    const result = updateSystemConfigSchema.safeParse({
      maintenanceMode: true,
      id: 'malicioso',
      updatedAt: '2020-01-01',
    });
    expect(result.success).toBe(true);
  });
});
