-- AlterTable
ALTER TABLE "patrimonios" ADD COLUMN     "data_baixa" TIMESTAMP(3),
ADD COLUMN     "documentos_baixa" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "motivo_baixa" TEXT;
