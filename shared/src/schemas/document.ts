import { z } from 'zod';

// Documentos anexados a patrimônios ou imóveis. Upload do arquivo é
// tratado pelo multer; aqui validamos só os campos textuais que
// acompanham o multipart.
//
// XOR-ish: o controller cobra que ao menos um de `patrimonioId` ou
// `imovelId` venha presente, mas a regra é deferida (multipart-friendly).

const tituloSchema = z
  .string()
  .trim()
  .min(1, 'Título é obrigatório.')
  .max(200, 'Título deve ter no máximo 200 caracteres.');

const descricaoSchema = z
  .string()
  .max(1000, 'Descrição deve ter no máximo 1000 caracteres.')
  .optional();

const tipoSchema = z
  .string()
  .max(50, 'Tipo deve ter no máximo 50 caracteres.')
  .optional();

// `publico` chega como string ('true'/'false') no multipart, ou bool no JSON.
// `z.coerce.boolean()` aceita os dois.
const publicoSchema = z.coerce.boolean().optional();

export const createDocumentSchema = z.object({
  titulo: tituloSchema.optional(),
  descricao: descricaoSchema,
  patrimonioId: z.string().uuid('patrimonioId deve ser UUID.').optional(),
  imovelId: z.string().uuid('imovelId deve ser UUID.').optional(),
  tipo: tipoSchema,
  publico: publicoSchema,
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z
  .object({
    titulo: tituloSchema.optional(),
    descricao: descricaoSchema,
    tipo: tipoSchema,
    publico: publicoSchema,
  })
  .strict();
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
