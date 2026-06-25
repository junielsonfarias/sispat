-- Setor: lista de fundos de recurso de onde os bens da secretaria podem vir
-- (ex.: FUNDEB, VAAT, SUS). Usada na importação para classificar/auto-preencher.
ALTER TABLE "sectors" ADD COLUMN "fundos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Patrimônio: nome do fundo/fonte específica do recurso (ex.: FUNDEB, VAAT),
-- detalhando a origem quando for transferência entre entes.
ALTER TABLE "patrimonios" ADD COLUMN "fundo_recurso" TEXT;
