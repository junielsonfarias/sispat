import { z } from 'zod';

// Regularização de bem pré-existente / origem desconhecida — Cap XIII da Lei /
// Cap IX do Decreto. Constatação + avaliação a valor justo + incorporação.

export const tipoOrigemBemSchema = z.enum(['origem_desconhecida', 'pre_existente']);
export type TipoOrigemBem = z.infer<typeof tipoOrigemBemSchema>;

export const statusRegularizacaoSchema = z.enum(['em_andamento', 'incorporado', 'cancelado']);
export type StatusRegularizacao = z.infer<typeof statusRegularizacaoSchema>;

const isoDate = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

export const createRegularizacaoSchema = z.object({
  descricao: z.string().trim().min(3, 'Descrição obrigatória.').max(500),
  caracteristicas: z.string().max(2000).optional().nullable(),
  estadoConservacao: z.string().max(100).optional().nullable(),
  localizacao: z.string().max(200).optional().nullable(),
  tipoOrigem: tipoOrigemBemSchema.default('pre_existente'),
  valorJusto: z.coerce.number().min(0, 'Valor justo não pode ser negativo.'),
  comissaoId: z.string().uuid().optional().nullable(),
  termoConstatacao: z.string().max(100).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  fotos: z.array(z.string()).max(20).optional(),
  dataConstatacao: isoDate.optional(),
});
export type CreateRegularizacaoInput = z.infer<typeof createRegularizacaoSchema>;

export const updateRegularizacaoSchema = z
  .object({
    descricao: z.string().trim().min(3).max(500).optional(),
    caracteristicas: z.string().max(2000).optional().nullable(),
    estadoConservacao: z.string().max(100).optional().nullable(),
    localizacao: z.string().max(200).optional().nullable(),
    tipoOrigem: tipoOrigemBemSchema.optional(),
    valorJusto: z.coerce.number().min(0).optional(),
    comissaoId: z.string().uuid().optional().nullable(),
    termoConstatacao: z.string().max(100).optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
    fotos: z.array(z.string()).max(20).optional(),
  })
  .strict();
export type UpdateRegularizacaoInput = z.infer<typeof updateRegularizacaoSchema>;

// Incorporação: cria o Patrimônio a partir da regularização (Art. 31 IV-V).
// O valor vem do valorJusto da regularização; numero_patrimonio é gerado se ausente.
export const incorporarRegularizacaoSchema = z.object({
  sectorId: z.string().uuid('Setor é obrigatório.'),
  localId: z.string().uuid().optional().nullable(),
  setor_responsavel: z.string().trim().min(1, 'Setor responsável é obrigatório.').max(150),
  local_objeto: z.string().trim().min(1, 'Local do objeto é obrigatório.').max(200),
  tipo: z.string().trim().min(1, 'Tipo/categoria do bem é obrigatório.').max(100),
  numero_patrimonio: z.string().max(50).optional().nullable(),
});
export type IncorporarRegularizacaoInput = z.infer<typeof incorporarRegularizacaoSchema>;

// Incorporação em LOTE — agiliza a regularização do acervo antigo: incorpora
// várias regularizações ao mesmo setor/local/tipo de uma vez. Cada regularização
// vira um patrimônio (numero_patrimonio gerado se ausente). Atômico (tudo ou nada).
export const incorporarRegularizacaoLoteSchema = z.object({
  itens: z
    .array(
      z.object({
        regularizacaoId: z.string().uuid('Regularização inválida.'),
        numero_patrimonio: z.string().max(50).optional().nullable(),
      }),
    )
    .min(1, 'Informe ao menos uma regularização.')
    .max(200, 'Máximo de 200 regularizações por lote.'),
  sectorId: z.string().uuid('Setor é obrigatório.'),
  localId: z.string().uuid().optional().nullable(),
  setor_responsavel: z.string().trim().min(1, 'Setor responsável é obrigatório.').max(150),
  local_objeto: z.string().trim().min(1, 'Local do objeto é obrigatório.').max(200),
  tipo: z.string().trim().min(1, 'Tipo/categoria do bem é obrigatório.').max(100),
});
export type IncorporarRegularizacaoLoteInput = z.infer<typeof incorporarRegularizacaoLoteSchema>;
