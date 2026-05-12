import { z } from 'zod';

// Empréstimo de patrimônio. `model Emprestimo` em `backend/prisma/schema.prisma`.
//
// Datas vêm como string ISO 8601 (frontend usa input type=date que devolve
// YYYY-MM-DD). Não usamos `z.coerce.date()` porque preferimos manter como
// string e o controller faz `new Date(...)` no momento da persistência —
// alinha com como o `transferService` trata `dataTransferencia`.

const isoDateSchema = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Data inválida (use ISO 8601).' });

export const createEmprestimoSchema = z.object({
  patrimonioId: z.string().uuid('patrimonioId deve ser um UUID válido.'),
  responsavel: z
    .string()
    .trim()
    .min(1, 'Responsável é obrigatório.')
    .max(200, 'Responsável deve ter no máximo 200 caracteres.'),
  setor: z.string().max(100).optional(),
  motivo: z.string().max(500).optional(),
  dataEmprestimo: isoDateSchema,
  dataPrevDevolucao: isoDateSchema.optional(),
  observacoes: z.string().max(1000).optional(),
});
export type CreateEmprestimoInput = z.infer<typeof createEmprestimoSchema>;

// Endpoint de devolução: registra a data efetiva e (opcionalmente) anota
// observações sobre o estado do bem na devolução.
export const devolverEmprestimoSchema = z
  .object({
    dataDevolucao: isoDateSchema.optional(),
    observacoes: z.string().max(1000).optional(),
  })
  .strict();
export type DevolverEmprestimoInput = z.infer<typeof devolverEmprestimoSchema>;
