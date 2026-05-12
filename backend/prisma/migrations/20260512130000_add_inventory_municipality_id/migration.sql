-- Adiciona Inventory.municipalityId para eliminar o filtro indireto
-- (responsavel ∈ users do município) usado em inventarioController.
--
-- Estratégia:
--   1. Adicionar coluna NULL.
--   2. Backfill a partir do municipalityId do user responsável.
--   3. Tornar NOT NULL + adicionar FK + index.

-- 1. Coluna nullable
ALTER TABLE "inventarios"
  ADD COLUMN "municipalityId" TEXT;

-- 2. Backfill: responsavel -> users.municipalityId
UPDATE "inventarios" i
SET "municipalityId" = u."municipalityId"
FROM "users" u
WHERE i."responsavel" = u."id"
  AND i."municipalityId" IS NULL;

-- 3. Inventários órfãos (responsavel sem user existente) — pegam o município do
--    primeiro município cadastrado, evitando NULL em prod. Em ambientes vazios,
--    apaga linhas órfãs (não há onde "colar" o tenant).
UPDATE "inventarios"
SET "municipalityId" = (SELECT "id" FROM "municipalities" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "municipalityId" IS NULL;

DELETE FROM "inventarios" WHERE "municipalityId" IS NULL;

-- 4. NOT NULL + FK + index
ALTER TABLE "inventarios"
  ALTER COLUMN "municipalityId" SET NOT NULL;

ALTER TABLE "inventarios"
  ADD CONSTRAINT "inventarios_municipalityId_fkey"
  FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "inventarios_municipalityId_idx" ON "inventarios"("municipalityId");
