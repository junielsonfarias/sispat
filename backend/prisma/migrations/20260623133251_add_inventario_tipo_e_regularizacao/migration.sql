-- CreateEnum
CREATE TYPE "TipoInventario" AS ENUM ('anual', 'transferencia', 'extraordinario', 'inicial');

-- CreateEnum
CREATE TYPE "TipoOrigemBem" AS ENUM ('origem_desconhecida', 'pre_existente');

-- CreateEnum
CREATE TYPE "StatusRegularizacao" AS ENUM ('em_andamento', 'incorporado', 'cancelado');

-- AlterTable
ALTER TABLE "inventarios" ADD COLUMN     "agenteAnterior" TEXT,
ADD COLUMN     "agenteNovo" TEXT,
ADD COLUMN     "dataBase" TIMESTAMP(3),
ADD COLUMN     "exercicio" INTEGER,
ADD COLUMN     "tipo" "TipoInventario" NOT NULL DEFAULT 'extraordinario';

-- CreateTable
CREATE TABLE "regularizacoes" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "caracteristicas" TEXT,
    "estadoConservacao" TEXT,
    "localizacao" TEXT,
    "tipoOrigem" "TipoOrigemBem" NOT NULL DEFAULT 'pre_existente',
    "valorJusto" DOUBLE PRECISION NOT NULL,
    "comissaoId" TEXT,
    "termoConstatacao" TEXT,
    "observacoes" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "StatusRegularizacao" NOT NULL DEFAULT 'em_andamento',
    "patrimonioId" TEXT,
    "dataConstatacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataIncorporacao" TIMESTAMP(3),
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regularizacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regularizacoes_municipalityId_idx" ON "regularizacoes"("municipalityId");

-- CreateIndex
CREATE INDEX "regularizacoes_municipalityId_status_idx" ON "regularizacoes"("municipalityId", "status");

-- CreateIndex
CREATE INDEX "regularizacoes_patrimonioId_idx" ON "regularizacoes"("patrimonioId");

-- CreateIndex
CREATE INDEX "inventarios_municipalityId_tipo_idx" ON "inventarios"("municipalityId", "tipo");

-- AddForeignKey
ALTER TABLE "regularizacoes" ADD CONSTRAINT "regularizacoes_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regularizacoes" ADD CONSTRAINT "regularizacoes_comissaoId_fkey" FOREIGN KEY ("comissaoId") REFERENCES "comissoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regularizacoes" ADD CONSTRAINT "regularizacoes_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
