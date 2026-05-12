-- Converte Patrimonio.status de TEXT para o enum tipado PatrimonioStatus.
--
-- Valores aceitos (união do que o schema/comentário documenta + o que o código
-- de transferência e empréstimo grava):
--   ativo, inativo, manutencao, baixado, extraviado, em_transferencia, emprestado
--
-- Estratégia:
--   1. Criar o tipo enum.
--   2. Normalizar quaisquer linhas com valor fora do conjunto para 'ativo'
--      (defesa contra dados legados; falhar a migration por má-fé histórica
--      bloqueia o deploy inteiro).
--   3. Remover o DEFAULT (necessário antes do ALTER TYPE em PG).
--   4. ALTER TYPE com USING.
--   5. Restaurar o DEFAULT como enum.

-- 1. Tipo enum
CREATE TYPE "PatrimonioStatus" AS ENUM (
  'ativo',
  'inativo',
  'manutencao',
  'baixado',
  'extraviado',
  'em_transferencia',
  'emprestado'
);

-- 2. Normaliza órfãos (defensivo — não deve haver em ambientes sãos)
UPDATE "patrimonios"
SET "status" = 'ativo'
WHERE "status" NOT IN (
  'ativo', 'inativo', 'manutencao', 'baixado', 'extraviado', 'em_transferencia', 'emprestado'
);

-- 3. Drop default antes do cast
ALTER TABLE "patrimonios"
  ALTER COLUMN "status" DROP DEFAULT;

-- 4. Cast da coluna
ALTER TABLE "patrimonios"
  ALTER COLUMN "status" TYPE "PatrimonioStatus"
  USING "status"::"PatrimonioStatus";

-- 5. Default tipado
ALTER TABLE "patrimonios"
  ALTER COLUMN "status" SET DEFAULT 'ativo';
