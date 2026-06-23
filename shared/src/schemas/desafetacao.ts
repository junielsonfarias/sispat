import { z } from 'zod';

// Desafetação — Art. 22 da Lei. Retira a destinação de uso comum/especial,
// passando o bem à categoria dominical (passível de alienação). Por lei,
// decreto ou ato administrativo.

export const destinacaoBemSchema = z.enum([
  'uso_comum',
  'uso_especial',
  'dominical',
  'nao_classificado',
]);
export type DestinacaoBem = z.infer<typeof destinacaoBemSchema>;

export const baseLegalTipoSchema = z.enum(['lei', 'decreto', 'ato_administrativo']);
export type BaseLegalTipo = z.infer<typeof baseLegalTipoSchema>;

export const statusDesafetacaoSchema = z.enum(['em_andamento', 'concluida', 'cancelada']);
export type StatusDesafetacao = z.infer<typeof statusDesafetacaoSchema>;

const isoDate = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

export const createDesafetacaoSchema = z
  .object({
    patrimonioId: z.string().uuid().optional().nullable(),
    imovelId: z.string().uuid().optional().nullable(),
    comissaoId: z.string().uuid().optional().nullable(),
    baseLegalTipo: baseLegalTipoSchema,
    baseLegalNumero: z.string().trim().min(1, 'Número do ato é obrigatório.').max(100),
    baseLegalData: isoDate,
    justificativa: z.string().trim().min(10, 'Justificativa muito curta.').max(4000),
    observacoes: z.string().max(2000).optional().nullable(),
  })
  // Exatamente um bem (patrimônio XOR imóvel).
  .refine((d) => !!d.patrimonioId !== !!d.imovelId, {
    message: 'Informe um patrimônio OU um imóvel (exatamente um).',
    path: ['patrimonioId'],
  });
export type CreateDesafetacaoInput = z.infer<typeof createDesafetacaoSchema>;

export const updateDesafetacaoSchema = z
  .object({
    comissaoId: z.string().uuid().optional().nullable(),
    baseLegalTipo: baseLegalTipoSchema.optional(),
    baseLegalNumero: z.string().trim().min(1).max(100).optional(),
    baseLegalData: isoDate.optional(),
    justificativa: z.string().trim().min(10).max(4000).optional(),
    observacoes: z.string().max(2000).optional().nullable(),
  })
  .strict();
export type UpdateDesafetacaoInput = z.infer<typeof updateDesafetacaoSchema>;

// Reclassificação direta da destinação de um bem (revisão do acervo existente,
// que entrou como uso_especial por padrão). Não é desafetação formal.
export const reclassificarDestinacaoSchema = z.object({
  destinacao: destinacaoBemSchema,
});
export type ReclassificarDestinacaoInput = z.infer<typeof reclassificarDestinacaoSchema>;

// Params de /desafetacoes/reclassificar/:tipo/:bemId
export const reclassificarParamsSchema = z.object({
  tipo: z.enum(['patrimonio', 'imovel']),
  bemId: z.string().uuid('ID do bem inválido.'),
});
