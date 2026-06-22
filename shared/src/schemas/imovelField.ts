import { z } from 'zod';

// Campo personalizado de imóvel. `model ImovelCustomField` em
// `backend/prisma/schema.prisma`. Usado na configuração dos formulários de
// imóveis (campos extras definidos por município).

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(100, 'Nome deve ter no máximo 100 caracteres.')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Nome deve conter apenas letras, números e underline (identificador técnico).',
  );

const labelSchema = z
  .string()
  .trim()
  .min(1, 'Rótulo é obrigatório.')
  .max(200, 'Rótulo deve ter no máximo 200 caracteres.');

// Tipos de campo suportados pelo formulário de imóveis.
export const imovelFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect',
]);
export type ImovelFieldType = z.infer<typeof imovelFieldTypeSchema>;

const defaultValueSchema = z
  .string()
  .max(500, 'Valor padrão deve ter no máximo 500 caracteres.')
  .optional();

const placeholderSchema = z
  .string()
  .max(200, 'Placeholder deve ter no máximo 200 caracteres.')
  .optional();

const helpTextSchema = z
  .string()
  .max(500, 'Texto de ajuda deve ter no máximo 500 caracteres.')
  .optional();

// `options` e `validationRules` são serializados como JSON pelo controller;
// aceitamos estruturas livres (o frontend monta), apenas garantindo o tipo.
const optionsSchema = z.array(z.unknown()).optional();
const validationRulesSchema = z.record(z.unknown()).optional();

const displayOrderSchema = z
  .coerce.number()
  .int('Ordem de exibição deve ser um número inteiro.')
  .min(0, 'Ordem de exibição não pode ser negativa.')
  .optional();

export const createImovelFieldSchema = z.object({
  name: nameSchema,
  label: labelSchema,
  type: imovelFieldTypeSchema,
  required: z.boolean().optional(),
  defaultValue: defaultValueSchema,
  options: optionsSchema,
  placeholder: placeholderSchema,
  helpText: helpTextSchema,
  validationRules: validationRulesSchema,
  displayOrder: displayOrderSchema,
  isSystem: z.boolean().optional(),
});
export type CreateImovelFieldInput = z.infer<typeof createImovelFieldSchema>;

export const updateImovelFieldSchema = z
  .object({
    name: nameSchema.optional(),
    label: labelSchema.optional(),
    type: imovelFieldTypeSchema.optional(),
    required: z.boolean().optional(),
    defaultValue: defaultValueSchema,
    options: optionsSchema,
    placeholder: placeholderSchema,
    helpText: helpTextSchema,
    validationRules: validationRulesSchema,
    displayOrder: displayOrderSchema,
    isActive: z.boolean().optional(),
  })
  .strict();
export type UpdateImovelFieldInput = z.infer<typeof updateImovelFieldSchema>;

// Reordenação em lote: array de { id, displayOrder }.
export const reorderImovelFieldsSchema = z.object({
  fieldOrders: z
    .array(
      z.object({
        id: z.string().uuid('ID deve ser um UUID válido.'),
        displayOrder: z
          .coerce.number()
          .int('Ordem de exibição deve ser um número inteiro.')
          .min(0, 'Ordem de exibição não pode ser negativa.'),
      }),
    )
    .min(1, 'fieldOrders deve conter ao menos um item.'),
});
export type ReorderImovelFieldsInput = z.infer<
  typeof reorderImovelFieldsSchema
>;
