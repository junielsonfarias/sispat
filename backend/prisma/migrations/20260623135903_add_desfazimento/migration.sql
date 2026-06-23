-- CreateEnum
CREATE TYPE "ClassificacaoInservivel" AS ENUM ('ocioso', 'recuperavel', 'antieconomico', 'irrecuperavel');

-- CreateEnum
CREATE TYPE "ModalidadeDesfazimento" AS ENUM ('doacao', 'leilao', 'permuta', 'transferencia', 'cessao', 'inutilizacao');

-- CreateEnum
CREATE TYPE "StatusDesfazimento" AS ENUM ('em_andamento', 'concluido', 'cancelado');

-- CreateTable
CREATE TABLE "desfazimentos" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "classificacao" "ClassificacaoInservivel" NOT NULL,
    "modalidade" "ModalidadeDesfazimento" NOT NULL,
    "valorAvaliacao" DOUBLE PRECISION,
    "justificativa" TEXT NOT NULL,
    "laudo" TEXT,
    "comissaoId" TEXT,
    "status" "StatusDesfazimento" NOT NULL DEFAULT 'em_andamento',
    "dataConclusao" TIMESTAMP(3),
    "observacoes" TEXT,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desfazimentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "desfazimentos_municipalityId_idx" ON "desfazimentos"("municipalityId");

-- CreateIndex
CREATE INDEX "desfazimentos_municipalityId_status_idx" ON "desfazimentos"("municipalityId", "status");

-- CreateIndex
CREATE INDEX "desfazimentos_patrimonioId_idx" ON "desfazimentos"("patrimonioId");

-- AddForeignKey
ALTER TABLE "desfazimentos" ADD CONSTRAINT "desfazimentos_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desfazimentos" ADD CONSTRAINT "desfazimentos_comissaoId_fkey" FOREIGN KEY ("comissaoId") REFERENCES "comissoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desfazimentos" ADD CONSTRAINT "desfazimentos_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
