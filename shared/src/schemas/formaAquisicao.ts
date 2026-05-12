import { z } from 'zod';

// Forma de aquisição (compra, doação, transferência, etc.). Lista mantida
// pelo município. `model FormaAquisicao` em `backend/prisma/schema.prisma`.

const nomeSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(100, 'Nome deve ter no máximo 100 caracteres.');

const descricaoSchema = z
  .string()
  .max(500, 'Descrição deve ter no máximo 500 caracteres.')
  .optional();

export const createFormaAquisicaoSchema = z.object({
  nome: nomeSchema,
  descricao: descricaoSchema,
  ativo: z.boolean().optional(),
});
export type CreateFormaAquisicaoInput = z.infer<typeof createFormaAquisicaoSchema>;

export const updateFormaAquisicaoSchema = z
  .object({
    nome: nomeSchema.optional(),
    descricao: descricaoSchema,
    ativo: z.boolean().optional(),
  })
  .strict();
export type UpdateFormaAquisicaoInput = z.infer<typeof updateFormaAquisicaoSchema>;
