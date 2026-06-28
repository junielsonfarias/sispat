import { z } from 'zod';

// Comissões da gestão patrimonial — Art. 19 da Lei / Art. 8 do Decreto.
// Espelha o model Comissao/ComissaoMembro em backend/prisma/schema.prisma.

export const tipoComissaoSchema = z.enum([
  'inventario',
  'avaliacao',
  'regularizacao',
  'desfazimento_desafetacao',
]);
export type TipoComissao = z.infer<typeof tipoComissaoSchema>;

export const statusComissaoSchema = z.enum(['ativa', 'encerrada', 'suspensa']);
export type StatusComissao = z.infer<typeof statusComissaoSchema>;

export const papelMembroSchema = z.enum(['presidente', 'secretario', 'membro']);
export type PapelMembro = z.infer<typeof papelMembroSchema>;

const isoDate = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

export const comissaoMembroSchema = z.object({
  // id não-vazio (não só UUID): pode referenciar usuários do seed (user-superuser,
  // user-supervisor). A FK é garantida pelo Prisma; o formato não agrega segurança.
  userId: z.string().trim().min(1).optional().nullable(),
  nome: z.string().trim().min(1, 'Nome do membro é obrigatório.').max(150),
  matricula: z.string().max(50).optional().nullable(),
  cargo: z.string().max(100).optional().nullable(),
  papel: papelMembroSchema.default('membro'),
});
export type ComissaoMembroInput = z.infer<typeof comissaoMembroSchema>;

export const createComissaoSchema = z
  .object({
    tipo: tipoComissaoSchema,
    nome: z.string().max(200).optional().nullable(),
    portariaNumero: z.string().trim().min(1, 'Número da portaria é obrigatório.').max(100),
    portariaData: isoDate,
    mandatoInicio: isoDate,
    mandatoFim: isoDate,
    observacoes: z.string().max(2000).optional().nullable(),
    // Mínimo de 3 membros (Art. 19). Permite criar sem membros e adicionar
    // depois, mas avisa via alerta de conformidade se ficar abaixo de 3.
    membros: z.array(comissaoMembroSchema).max(30).optional(),
  })
  .refine((d) => Date.parse(d.mandatoFim) > Date.parse(d.mandatoInicio), {
    message: 'O fim do mandato deve ser posterior ao início.',
    path: ['mandatoFim'],
  });
export type CreateComissaoInput = z.infer<typeof createComissaoSchema>;

export const updateComissaoSchema = z
  .object({
    tipo: tipoComissaoSchema.optional(),
    nome: z.string().max(200).optional().nullable(),
    portariaNumero: z.string().trim().min(1).max(100).optional(),
    portariaData: isoDate.optional(),
    mandatoInicio: isoDate.optional(),
    mandatoFim: isoDate.optional(),
    status: statusComissaoSchema.optional(),
    observacoes: z.string().max(2000).optional().nullable(),
  })
  .strict();
export type UpdateComissaoInput = z.infer<typeof updateComissaoSchema>;

// Adição de membro a uma comissão existente.
export const addComissaoMembroSchema = comissaoMembroSchema;
export type AddComissaoMembroInput = z.infer<typeof addComissaoMembroSchema>;

// Params de /comissoes/:id/membros/:membroId
export const comissaoMembroParamsSchema = z.object({
  id: z.string().uuid('ID da comissão inválido.'),
  membroId: z.string().uuid('ID do membro inválido.'),
});
