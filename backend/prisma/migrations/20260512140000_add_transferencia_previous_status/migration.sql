-- Adiciona Transferencia.previousStatus para eliminar o marker
-- "[__prev_status__:X]" gravado em observacoes pelo createTransfer.
--
-- Backfill:
--   1) Extrai o conteúdo do marker das observacoes existentes.
--   2) Remove o marker do texto.
--   3) Linhas sem marker recebem 'ativo' (default histórico antes do Sprint 15).

-- 1. Coluna nullable (default 'ativo' já cobre novas linhas)
ALTER TABLE "transferencias"
  ADD COLUMN "previousStatus" TEXT NOT NULL DEFAULT 'ativo';

-- 2. Backfill a partir do marker no campo observacoes
UPDATE "transferencias"
SET "previousStatus" = COALESCE(
  (regexp_match("observacoes", '\[__prev_status__:([^\]]+)\]'))[1],
  'ativo'
)
WHERE "observacoes" ~ '\[__prev_status__:[^\]]+\]';

-- 3. Limpa o marker das observacoes (remove o trecho + eventual \n antes)
UPDATE "transferencias"
SET "observacoes" = NULLIF(
  TRIM(regexp_replace("observacoes", E'\\n?\\[__prev_status__:[^\\]]+\\]', '', 'g')),
  ''
)
WHERE "observacoes" ~ '\[__prev_status__:[^\]]+\]';
