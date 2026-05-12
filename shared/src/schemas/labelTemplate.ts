import { z } from 'zod';

// Template de etiqueta de impressão. `model LabelTemplate` em
// `backend/prisma/schema.prisma`. `elementos` é JSON livre (posicionamento
// dos campos na etiqueta) — o front gera, o backend só persiste.

export const labelUnitSchema = z.enum(['mm', 'cm', 'in']);
export type LabelUnit = z.infer<typeof labelUnitSchema>;

const nomeSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(200, 'Nome deve ter no máximo 200 caracteres.');

const descricaoSchema = z
  .string()
  .max(1000, 'Descrição deve ter no máximo 1000 caracteres.')
  .optional();

const dimensionSchema = z
  .coerce.number()
  .positive('Dimensão deve ser positiva.')
  .optional();

export const createLabelTemplateSchema = z.object({
  nome: nomeSchema,
  descricao: descricaoSchema,
  largura: dimensionSchema,
  altura: dimensionSchema,
  unidade: labelUnitSchema.optional(),
  // Estrutura visual livre — o frontend monta o JSON de elementos
  // (posições, fontes, campos a renderizar). Validar profundamente aqui
  // amarraria backend ao formato de UI; deixamos como array livre.
  elementos: z.array(z.unknown()).optional(),
  ativo: z.boolean().optional(),
});
export type CreateLabelTemplateInput = z.infer<typeof createLabelTemplateSchema>;

export const updateLabelTemplateSchema = z
  .object({
    nome: nomeSchema.optional(),
    descricao: descricaoSchema,
    largura: dimensionSchema,
    altura: dimensionSchema,
    unidade: labelUnitSchema.optional(),
    elementos: z.array(z.unknown()).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateLabelTemplateInput = z.infer<typeof updateLabelTemplateSchema>;
