import { z } from 'zod';

// Setor (unidade organizacional). Campos espelham `model Sector` em
// `backend/prisma/schema.prisma`:
//   - name: nome legível (max 100)
//   - codigo: chave única dentro do município (max 20, uppercase only)
//   - description, endereco, cnpj, responsavel, parentId: opcionais
//
// `municipalityId` é injetado pelo backend a partir do JWT — não vem do
// body — por isso não está no schema.

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório.')
  .max(100, 'Nome deve ter no máximo 100 caracteres.')
  .regex(
    // Permite pontuação comum em nomes de setor: . , / ( ) & º ª ° '
    // (ex.: "SEMED (Educação)", "Saúde/Assistência", "1º andar", "Dept. de TI").
    /^[a-zA-ZÀ-ÿ0-9\s\-_./()&,ªº°']+$/,
    'Nome contém caractere inválido.',
  );

const codigoSchema = z
  .string()
  .trim()
  .min(1, 'Código é obrigatório.')
  .max(20, 'Código deve ter no máximo 20 caracteres.')
  .regex(
    /^[A-Z0-9\-_]+$/,
    'Código deve conter apenas letras maiúsculas, números, hífen e underline.',
  );

const descriptionSchema = z
  .string()
  .max(500, 'Descrição deve ter no máximo 500 caracteres.')
  .optional();

// Fundos de recurso da secretaria (ex.: FUNDEB, VAAT, SUS). Lista de rótulos
// curtos usada na importação para classificar/auto-preencher o fundo do bem.
const fundosSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(30, 'No máximo 30 fundos por setor.')
  .optional();

export const createSectorSchema = z.object({
  name: nameSchema,
  codigo: codigoSchema.optional(),
  description: descriptionSchema,
  sigla: z.string().max(20).optional(),
  endereco: z.string().max(300).optional(),
  cnpj: z.string().max(20).optional(),
  responsavel: z.string().max(100).optional(),
  parentId: z.string().uuid().optional().nullable(),
  fundos: fundosSchema,
});
export type CreateSectorInput = z.infer<typeof createSectorSchema>;

export const updateSectorSchema = z
  .object({
    name: nameSchema.optional(),
    codigo: codigoSchema.optional(),
    description: descriptionSchema,
    sigla: z.string().max(20).optional().nullable(),
    endereco: z.string().max(300).optional().nullable(),
    cnpj: z.string().max(20).optional().nullable(),
    responsavel: z.string().max(100).optional().nullable(),
    parentId: z.string().uuid().optional().nullable(),
    fundos: fundosSchema,
  })
  .strict();
export type UpdateSectorInput = z.infer<typeof updateSectorSchema>;
