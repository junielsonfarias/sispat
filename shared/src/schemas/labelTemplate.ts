import { z } from 'zod';

// Template de etiqueta de impressão. `model LabelTemplate` em
// `backend/prisma/schema.prisma`. `elements` é JSON livre (posicionamento
// dos campos na etiqueta) — o front gera, o backend só persiste.
//
// IMPORTANTE: os nomes seguem o Prisma e o controller (INGLÊS:
// name/width/height/isDefault/elements). O frontend (LabelTemplateContext)
// também envia em inglês. Versões antigas deste schema usavam PT
// (nome/largura/...) e o `zodValidate` substituía o req.body, deixando o
// controller ler `name/width/...` como undefined -> 400 "obrigatórios".

// O banco não tem coluna de unidade; mantido só para tipagem do front.
export const labelUnitSchema = z.enum(['mm', 'cm', 'in']);
export type LabelUnit = z.infer<typeof labelUnitSchema>;

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(200, 'Nome deve ter no máximo 200 caracteres.');

// Prisma: width/height são Int.
const dimensionSchema = z.coerce
  .number()
  .int('Dimensão deve ser um número inteiro.')
  .positive('Dimensão deve ser positiva.');

// Estrutura visual livre — o frontend monta o JSON de elementos (posições,
// fontes, campos a renderizar). Validar profundamente aqui amarraria o
// backend ao formato de UI; deixamos como array livre.
const elementsSchema = z.array(z.unknown());

export const createLabelTemplateSchema = z.object({
  name: nameSchema,
  width: dimensionSchema,
  height: dimensionSchema,
  isDefault: z.boolean().optional(),
  elements: elementsSchema,
});
export type CreateLabelTemplateInput = z.infer<typeof createLabelTemplateSchema>;

export const updateLabelTemplateSchema = z
  .object({
    name: nameSchema.optional(),
    width: dimensionSchema.optional(),
    height: dimensionSchema.optional(),
    isDefault: z.boolean().optional(),
    elements: elementsSchema.optional(),
  })
  .strict();
export type UpdateLabelTemplateInput = z.infer<typeof updateLabelTemplateSchema>;
