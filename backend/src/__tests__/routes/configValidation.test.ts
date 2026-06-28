/**
 * Testes de validação das rotas mutantes de /api/config (achado 23/40).
 *
 * Contexto: diversas rotas POST/PUT em `configRoutes.ts` só tinham
 * `authorize()` aplicado, sem validação de body/params. Passaram a usar
 * `zodValidate({ body, params })` com schemas dedicados em `@sispat/shared`
 * (`schemas/config.ts`) + `uuidParamSchema`/`roleIdParamSchema` nos params.
 *
 * Cobertura (nível schema, espelhando systemConfigValidation.test.ts):
 *   - schemas aceitam bodies válidos.
 *   - rejeitam ausência de campos obrigatórios e tipos inválidos.
 *   - params :id exigem UUID; :roleId exige string textual.
 *   - schemas NÃO são strict (parity com os controllers, que desestruturam
 *     campos explicitamente — sem mass-assignment): campos extras (ex.
 *     municipalityId, id) passam pelo parse mas são ignorados pelo controller.
 */

import {
  uuidParamSchema,
  roleIdParamSchema,
  createUserReportConfigSchema,
  upsertExcelCsvTemplateSchema,
  createFormFieldConfigSchema,
  updateFormFieldConfigSchema,
  updateRolePermissionsSchema,
  updateCloudStorageSchema,
  upsertReportTemplateSchema,
  updateReportTemplateSchema,
  upsertImovelReportTemplateSchema,
  updateNumberingPatternSchema,
  updateUserDashboardSchema,
} from '@sispat/shared';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('Config — validação das rotas mutantes', () => {
  describe('params', () => {
    it('uuidParamSchema aceita qualquer id não-vazio (UUID ou amigável do seed) e rejeita vazio', () => {
      expect(uuidParamSchema.safeParse({ id: VALID_UUID }).success).toBe(true);
      // IDs amigáveis do seed (ex.: municipality-1) precisam ser aceitos.
      expect(uuidParamSchema.safeParse({ id: 'municipality-1' }).success).toBe(true);
      expect(uuidParamSchema.safeParse({ id: '' }).success).toBe(false);
    });

    it('roleIdParamSchema aceita string textual (não UUID) e rejeita vazio', () => {
      expect(roleIdParamSchema.safeParse({ roleId: 'admin' }).success).toBe(true);
      expect(roleIdParamSchema.safeParse({ roleId: '' }).success).toBe(false);
    });
  });

  describe('createUserReportConfigSchema', () => {
    it('aceita body válido', () => {
      const r = createUserReportConfigSchema.safeParse({ name: 'Rel', columns: ['a', 'b'] });
      expect(r.success).toBe(true);
    });
    it('rejeita name ausente e columns não-array', () => {
      expect(createUserReportConfigSchema.safeParse({ columns: [] }).success).toBe(false);
      expect(createUserReportConfigSchema.safeParse({ name: 'x', columns: 'a' }).success).toBe(false);
    });
  });

  describe('upsertExcelCsvTemplateSchema', () => {
    it('aceita body válido', () => {
      expect(
        upsertExcelCsvTemplateSchema.safeParse({ name: 'T', columns: [{ key: 'a' }] }).success,
      ).toBe(true);
    });
    it('rejeita name vazio', () => {
      expect(upsertExcelCsvTemplateSchema.safeParse({ name: '   ', columns: [] }).success).toBe(false);
    });
  });

  describe('formFieldConfig', () => {
    it('create aceita campos mínimos e rejeita key ausente', () => {
      expect(
        createFormFieldConfigSchema.safeParse({ key: 'placa', label: 'Placa', type: 'text' }).success,
      ).toBe(true);
      expect(createFormFieldConfigSchema.safeParse({ label: 'x', type: 'text' }).success).toBe(false);
    });
    it('update é parcial (aceita body vazio)', () => {
      expect(updateFormFieldConfigSchema.safeParse({}).success).toBe(true);
      expect(updateFormFieldConfigSchema.safeParse({ required: 'sim' }).success).toBe(false);
    });
  });

  describe('updateRolePermissionsSchema', () => {
    it('aceita name + permissions', () => {
      expect(
        updateRolePermissionsSchema.safeParse({ name: 'Admin', permissions: { read: true } }).success,
      ).toBe(true);
    });
    it('rejeita permissions ausente', () => {
      expect(updateRolePermissionsSchema.safeParse({ name: 'Admin' }).success).toBe(false);
    });
  });

  describe('updateCloudStorageSchema', () => {
    it('aceita body parcial', () => {
      expect(updateCloudStorageSchema.safeParse({ isConnected: true }).success).toBe(true);
    });
    it('rejeita isConnected não-boolean', () => {
      expect(updateCloudStorageSchema.safeParse({ isConnected: 'sim' }).success).toBe(false);
    });
  });

  describe('reportTemplate', () => {
    it('upsert exige name; update é parcial', () => {
      expect(upsertReportTemplateSchema.safeParse({ name: 'R', fields: ['a'] }).success).toBe(true);
      expect(upsertReportTemplateSchema.safeParse({ fields: ['a'] }).success).toBe(false);
      expect(updateReportTemplateSchema.safeParse({ isDefault: true }).success).toBe(true);
    });
    it('rejeita name vazio no update quando enviado', () => {
      expect(updateReportTemplateSchema.safeParse({ name: '   ' }).success).toBe(false);
    });
  });

  describe('upsertImovelReportTemplateSchema', () => {
    it('aceita name + fields e rejeita fields ausente', () => {
      expect(upsertImovelReportTemplateSchema.safeParse({ name: 'I', fields: ['x'] }).success).toBe(true);
      expect(upsertImovelReportTemplateSchema.safeParse({ name: 'I' }).success).toBe(false);
    });
  });

  describe('updateNumberingPatternSchema', () => {
    it('exige components array', () => {
      expect(updateNumberingPatternSchema.safeParse({ components: [] }).success).toBe(true);
      expect(updateNumberingPatternSchema.safeParse({ components: 'x' }).success).toBe(false);
    });
  });

  describe('updateUserDashboardSchema', () => {
    it('exige widgets array', () => {
      expect(updateUserDashboardSchema.safeParse({ widgets: [] }).success).toBe(true);
      expect(updateUserDashboardSchema.safeParse({}).success).toBe(false);
    });
  });

  it('schemas não são strict: campos extras não fazem o parse falhar', () => {
    const r = createFormFieldConfigSchema.safeParse({
      key: 'k',
      label: 'l',
      type: 'text',
      municipalityId: 'malicioso',
      id: 'injetado',
    });
    expect(r.success).toBe(true);
  });
});
