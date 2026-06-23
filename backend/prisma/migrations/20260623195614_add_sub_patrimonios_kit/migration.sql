-- AlterTable
ALTER TABLE "patrimonios" ADD COLUMN     "eh_kit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantidade_unidades" INTEGER;

-- AlterTable: sub_patrimonios passa do conceito antigo (descricao/quantidade/valor)
-- para o conceito real de unidades de kit (numero/localizacao). Tabela vazia
-- (feature nunca persistiu — era mock no frontend), então o drop é seguro.
ALTER TABLE "sub_patrimonios" DROP COLUMN "descricao",
DROP COLUMN "quantidade",
DROP COLUMN "valor",
ADD COLUMN     "localizacao_especifica" TEXT,
ADD COLUMN     "numero" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sub_patrimonios_patrimonioId_numero_key" ON "sub_patrimonios"("patrimonioId", "numero");
