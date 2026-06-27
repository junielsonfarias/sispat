import { z } from 'zod';

// Schemas de validação para as rotas de configuração (`backend/src/routes/
// configRoutes.ts` → `configController.ts`). Cobrem os recursos "estilo config"
// que historicamente não tinham validação de body, apenas `authorize()`.
//
// Convenções:
//   - Os controllers desestruturam campos explicitamente (sem mass-assignment),
//     então NÃO usamos `.strict()`: campos extras são tolerados e descartados
//     pelo controller, preservando o comportamento atual.
//   - `municipalityId`/`userId` NUNCA vêm do body — derivam de `req.user`.
//     Por isso não aparecem aqui.
//   - Campos JSON livres (colunas, layout, widgets) são validados como
//     estruturas (array/record/unknown) para barrar payloads grosseiramente
//     inválidos sem acoplar à forma interna exata.

// Reutilizáveis ----------------------------------------------------------------

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(255, 'Nome deve ter no máximo 255 caracteres.');

// JSON livre: objeto ou array. Usado para `filters`, `defaultValue`, etc.
const jsonValueSchema: z.ZodType<unknown> = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

// ============================================
// USER REPORT CONFIGS
// ============================================

export const createUserReportConfigSchema = z.object({
  name: nameSchema,
  columns: z.array(z.unknown(), {
    required_error: 'columns é obrigatório.',
    invalid_type_error: 'columns deve ser uma lista.',
  }),
  filters: z.record(z.string(), z.unknown()).optional(),
  format: z.string().trim().max(50).optional(),
});
export type CreateUserReportConfigInput = z.infer<typeof createUserReportConfigSchema>;

// ============================================
// EXCEL CSV TEMPLATES
// ============================================

export const upsertExcelCsvTemplateSchema = z.object({
  name: nameSchema,
  columns: z.array(z.unknown(), {
    required_error: 'columns é obrigatório.',
    invalid_type_error: 'columns deve ser uma lista.',
  }),
  conditionalFormatting: jsonValueSchema.optional().nullable(),
});
export type UpsertExcelCsvTemplateInput = z.infer<typeof upsertExcelCsvTemplateSchema>;

// ============================================
// FORM FIELD CONFIGS
// ============================================

export const createFormFieldConfigSchema = z.object({
  key: z.string().trim().min(1, 'key é obrigatório.').max(255),
  label: z.string().trim().min(1, 'label é obrigatório.').max(255),
  type: z.string().trim().min(1, 'type é obrigatório.').max(50),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(z.unknown()).optional(),
  isCustom: z.boolean().optional(),
  isSystem: z.boolean().optional(),
});
export type CreateFormFieldConfigInput = z.infer<typeof createFormFieldConfigSchema>;

// No update todos os campos são opcionais (atualização parcial).
export const updateFormFieldConfigSchema = z.object({
  key: z.string().trim().min(1).max(255).optional(),
  label: z.string().trim().min(1).max(255).optional(),
  type: z.string().trim().min(1).max(50).optional(),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(z.unknown()).optional(),
  isCustom: z.boolean().optional(),
  isSystem: z.boolean().optional(),
});
export type UpdateFormFieldConfigInput = z.infer<typeof updateFormFieldConfigSchema>;

// Reordenação em lote dos campos: array de { id, order }. Persistido na coluna
// `order` do model FormFieldConfig.
export const reorderFormFieldConfigsSchema = z.object({
  fieldOrders: z
    .array(
      z.object({
        id: z.string().uuid('id deve ser um UUID válido.'),
        order: z.coerce.number().int('order deve ser inteiro.').min(0),
      }),
    )
    .min(1, 'fieldOrders deve conter ao menos um item.'),
});
export type ReorderFormFieldConfigsInput = z.infer<
  typeof reorderFormFieldConfigsSchema
>;

// ============================================
// ROLE PERMISSIONS
// ============================================

// O `:roleId` é o identificador textual do papel (ex.: 'admin'), NÃO um UUID.
export const roleIdParamSchema = z.object({
  roleId: z.string().trim().min(1, 'roleId é obrigatório.').max(50),
});
export type RoleIdParam = z.infer<typeof roleIdParamSchema>;

export const updateRolePermissionsSchema = z.object({
  name: nameSchema,
  permissions: z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
  ]),
});
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;

// ============================================
// CLOUD STORAGE
// ============================================

export const updateCloudStorageSchema = z.object({
  provider: z.string().trim().max(50).optional().nullable(),
  isConnected: z.boolean().optional(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});
export type UpdateCloudStorageInput = z.infer<typeof updateCloudStorageSchema>;

// ============================================
// REPORT TEMPLATES
// ============================================

export const upsertReportTemplateSchema = z.object({
  name: nameSchema,
  layout: z.array(z.unknown()).optional(),
  fields: z.array(z.unknown()).optional(),
  filters: z.record(z.string(), z.unknown()).optional().nullable(),
  isDefault: z.boolean().optional(),
});
export type UpsertReportTemplateInput = z.infer<typeof upsertReportTemplateSchema>;

// No update o nome é opcional (atualização parcial; o controller só valida
// não-vazio quando enviado).
export const updateReportTemplateSchema = z.object({
  name: nameSchema.optional(),
  layout: z.array(z.unknown()).optional(),
  fields: z.array(z.unknown()).optional(),
  filters: z.record(z.string(), z.unknown()).optional().nullable(),
  isDefault: z.boolean().optional(),
});
export type UpdateReportTemplateInput = z.infer<typeof updateReportTemplateSchema>;

// ============================================
// IMOVEL REPORT TEMPLATES
// ============================================

export const upsertImovelReportTemplateSchema = z.object({
  name: nameSchema,
  fields: z.array(z.unknown(), {
    required_error: 'fields é obrigatório.',
    invalid_type_error: 'fields deve ser uma lista.',
  }),
  filters: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type UpsertImovelReportTemplateInput = z.infer<typeof upsertImovelReportTemplateSchema>;

// ============================================
// NUMBERING PATTERNS
// ============================================

export const updateNumberingPatternSchema = z.object({
  components: z.array(z.unknown(), {
    required_error: 'components é obrigatório.',
    invalid_type_error: 'components deve ser uma lista.',
  }),
});
export type UpdateNumberingPatternInput = z.infer<typeof updateNumberingPatternSchema>;

// ============================================
// USER DASHBOARDS
// ============================================

export const updateUserDashboardSchema = z.object({
  widgets: z.array(z.unknown(), {
    required_error: 'widgets é obrigatório.',
    invalid_type_error: 'widgets deve ser uma lista.',
  }),
});
export type UpdateUserDashboardInput = z.infer<typeof updateUserDashboardSchema>;
