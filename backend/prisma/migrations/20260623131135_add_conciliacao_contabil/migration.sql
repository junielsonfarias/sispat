-- CreateEnum
CREATE TYPE "CategoriaConciliacao" AS ENUM ('bens_moveis', 'bens_imoveis');

-- CreateEnum
CREATE TYPE "StatusConciliacao" AS ENUM ('conciliada', 'divergente');

-- CreateTable
CREATE TABLE "conciliacoes" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "dataBase" TIMESTAMP(3) NOT NULL,
    "categoria" "CategoriaConciliacao" NOT NULL,
    "valorContabil" DOUBLE PRECISION NOT NULL,
    "valorFisico" DOUBLE PRECISION NOT NULL,
    "divergencia" DOUBLE PRECISION NOT NULL,
    "status" "StatusConciliacao" NOT NULL,
    "observacoes" TEXT,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conciliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conciliacoes_municipalityId_idx" ON "conciliacoes"("municipalityId");

-- CreateIndex
CREATE INDEX "conciliacoes_municipalityId_status_idx" ON "conciliacoes"("municipalityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_municipalityId_competencia_categoria_key" ON "conciliacoes"("municipalityId", "competencia", "categoria");

-- AddForeignKey
ALTER TABLE "conciliacoes" ADD CONSTRAINT "conciliacoes_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
