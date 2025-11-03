-- AlterTable
ALTER TABLE "patrimonios" ADD COLUMN     "ano_licitacao" INTEGER,
ADD COLUMN     "numero_licitacao" TEXT;

-- CreateIndex
CREATE INDEX "patrimonios_numero_licitacao_idx" ON "patrimonios"("numero_licitacao");

-- CreateIndex
CREATE INDEX "patrimonios_ano_licitacao_idx" ON "patrimonios"("ano_licitacao");
