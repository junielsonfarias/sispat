import { z } from 'zod';

// Local físico (subdivisão dentro de um setor). Ex: "Sala 101", "Almoxarifado".
// `model Local` em `backend/prisma/schema.prisma`.

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(100, 'Nome deve ter no máximo 100 caracteres.')
  .regex(
    // Permite pontuação comum em nomes de local: . , / ( ) & º ª ° '
    // (ex.: "Sala 1º andar", "Depósito (térreo)", "Bloco A/B").
    /^[a-zA-ZÀ-ÿ0-9\s\-_./()&,ªº°']+$/,
    'Nome contém caractere inválido.',
  );

const descriptionSchema = z
  .string()
  .max(500, 'Descrição deve ter no máximo 500 caracteres.')
  .optional();

export const createLocalSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  sectorId: z.string().uuid('ID do setor deve ser um UUID válido.'),
});
export type CreateLocalInput = z.infer<typeof createLocalSchema>;

export const updateLocalSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    sectorId: z.string().uuid('ID do setor deve ser um UUID válido.').optional(),
  })
  .strict();
export type UpdateLocalInput = z.infer<typeof updateLocalSchema>;
