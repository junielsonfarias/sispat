-- CreateEnum
CREATE TYPE "DestinacaoBem" AS ENUM ('uso_comum', 'uso_especial', 'dominical', 'nao_classificado');

-- CreateEnum
CREATE TYPE "TipoComissao" AS ENUM ('inventario', 'avaliacao', 'regularizacao', 'desfazimento_desafetacao');

-- CreateEnum
CREATE TYPE "StatusComissao" AS ENUM ('ativa', 'encerrada', 'suspensa');

-- CreateEnum
CREATE TYPE "PapelMembro" AS ENUM ('presidente', 'secretario', 'membro');

-- CreateEnum
CREATE TYPE "BaseLegalTipo" AS ENUM ('lei', 'decreto', 'ato_administrativo');

-- CreateEnum
CREATE TYPE "StatusDesafetacao" AS ENUM ('em_andamento', 'concluida', 'cancelada');

-- AlterTable
ALTER TABLE "imoveis" ADD COLUMN     "destinacao" "DestinacaoBem" NOT NULL DEFAULT 'uso_especial',
ADD COLUMN     "destinacaoRevisada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "patrimonios" ADD COLUMN     "destinacao" "DestinacaoBem" NOT NULL DEFAULT 'uso_especial',
ADD COLUMN     "destinacaoRevisada" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoComissao" NOT NULL,
    "nome" TEXT,
    "portariaNumero" TEXT NOT NULL,
    "portariaData" TIMESTAMP(3) NOT NULL,
    "mandatoInicio" TIMESTAMP(3) NOT NULL,
    "mandatoFim" TIMESTAMP(3) NOT NULL,
    "status" "StatusComissao" NOT NULL DEFAULT 'ativa',
    "observacoes" TEXT,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissao_membros" (
    "id" TEXT NOT NULL,
    "comissaoId" TEXT NOT NULL,
    "userId" TEXT,
    "nome" TEXT NOT NULL,
    "matricula" TEXT,
    "cargo" TEXT,
    "papel" "PapelMembro" NOT NULL DEFAULT 'membro',
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comissao_membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desafetacoes" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT,
    "imovelId" TEXT,
    "comissaoId" TEXT,
    "baseLegalTipo" "BaseLegalTipo" NOT NULL,
    "baseLegalNumero" TEXT NOT NULL,
    "baseLegalData" TIMESTAMP(3) NOT NULL,
    "justificativa" TEXT NOT NULL,
    "destinacaoAnterior" "DestinacaoBem" NOT NULL,
    "status" "StatusDesafetacao" NOT NULL DEFAULT 'em_andamento',
    "dataConclusao" TIMESTAMP(3),
    "observacoes" TEXT,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desafetacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comissoes_municipalityId_idx" ON "comissoes"("municipalityId");

-- CreateIndex
CREATE INDEX "comissoes_municipalityId_status_idx" ON "comissoes"("municipalityId", "status");

-- CreateIndex
CREATE INDEX "comissoes_tipo_idx" ON "comissoes"("tipo");

-- CreateIndex
CREATE INDEX "comissao_membros_comissaoId_idx" ON "comissao_membros"("comissaoId");

-- CreateIndex
CREATE INDEX "comissao_membros_userId_idx" ON "comissao_membros"("userId");

-- CreateIndex
CREATE INDEX "desafetacoes_municipalityId_idx" ON "desafetacoes"("municipalityId");

-- CreateIndex
CREATE INDEX "desafetacoes_municipalityId_status_idx" ON "desafetacoes"("municipalityId", "status");

-- CreateIndex
CREATE INDEX "desafetacoes_patrimonioId_idx" ON "desafetacoes"("patrimonioId");

-- CreateIndex
CREATE INDEX "desafetacoes_imovelId_idx" ON "desafetacoes"("imovelId");

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao_membros" ADD CONSTRAINT "comissao_membros_comissaoId_fkey" FOREIGN KEY ("comissaoId") REFERENCES "comissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao_membros" ADD CONSTRAINT "comissao_membros_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desafetacoes" ADD CONSTRAINT "desafetacoes_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desafetacoes" ADD CONSTRAINT "desafetacoes_comissaoId_fkey" FOREIGN KEY ("comissaoId") REFERENCES "comissoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desafetacoes" ADD CONSTRAINT "desafetacoes_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desafetacoes" ADD CONSTRAINT "desafetacoes_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
