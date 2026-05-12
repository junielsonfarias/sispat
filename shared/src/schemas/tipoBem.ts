import { z } from 'zod';

// Tipo de bem (categoria). Ex: "Mobiliário", "Equipamento de Informática".
// `model TipoBem` em `backend/prisma/schema.prisma`.

const nomeSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(100, 'Nome deve ter no máximo 100 caracteres.')
  .regex(
    /^[a-zA-ZÀ-ÿ0-9\s\-_]+$/,
    'Nome deve conter apenas letras, números, espaços, hífen e underline.',
  );

const descricaoSchema = z
  .string()
  .max(500, 'Descrição deve ter no máximo 500 caracteres.')
  .optional();

const vidaUtilPadraoSchema = z
  .coerce.number()
  .int('Vida útil deve ser número inteiro.')
  .min(1, 'Vida útil deve ser ≥ 1 ano.')
  .max(100, 'Vida útil deve ser ≤ 100 anos.')
  .optional();

const taxaDepreciacaoSchema = z
  .coerce.number()
  .min(0, 'Taxa de depreciação não pode ser negativa.')
  .max(100, 'Taxa de depreciação não pode passar de 100%.')
  .optional();

export const createTipoBemSchema = z.object({
  nome: nomeSchema,
  descricao: descricaoSchema,
  vidaUtilPadrao: vidaUtilPadraoSchema,
  taxaDepreciacao: taxaDepreciacaoSchema,
});
export type CreateTipoBemInput = z.infer<typeof createTipoBemSchema>;

export const updateTipoBemSchema = z
  .object({
    nome: nomeSchema.optional(),
    descricao: descricaoSchema,
    vidaUtilPadrao: vidaUtilPadraoSchema,
    taxaDepreciacao: taxaDepreciacaoSchema,
  })
  .strict();
export type UpdateTipoBemInput = z.infer<typeof updateTipoBemSchema>;
