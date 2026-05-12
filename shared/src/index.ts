// @sispat/shared — Schemas Zod e tipos compartilhados entre frontend e backend.
//
// Convenção:
//   - Todo schema vive em `schemas/`. O nome do arquivo é o domínio
//     (auth, patrimonio, imovel, etc.).
//   - Tipos derivados (`z.infer`) ficam exportados ao lado do schema.
//   - Regras compartilhadas (regex de senha forte, etc.) ficam em `rules/`.
//
// Backend consome via `express-validator`? Não — usa o middleware
// `zodValidate` (backend/src/middlewares/zodValidate.ts). Express-validator
// continua válido em rotas que ainda não migraram.
//
// Frontend consome via `zodResolver` do react-hook-form, como já fazia
// com schemas locais.

export * from './rules/password';
export * from './schemas/auth';
export * from './schemas/common';
export * from './schemas/user';
export * from './schemas/sector';
export * from './schemas/local';
export * from './schemas/tipoBem';
export * from './schemas/formaAquisicao';
export * from './schemas/emprestimo';
export * from './schemas/labelTemplate';
export * from './schemas/document';
export * from './schemas/notification';
export * from './schemas/customization';
export * from './schemas/inventario';
export * from './schemas/transfer';
export * from './schemas/manutencao';
