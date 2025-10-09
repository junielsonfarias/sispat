-- AlterTable
ALTER TABLE "sectors" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "responsavel" TEXT,
ADD COLUMN     "sigla" TEXT;

-- CreateTable
CREATE TABLE "imovel_custom_fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "options" TEXT,
    "placeholder" TEXT,
    "helpText" TEXT,
    "validationRules" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imovel_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imovel_custom_fields_municipalityId_idx" ON "imovel_custom_fields"("municipalityId");

-- CreateIndex
CREATE INDEX "imovel_custom_fields_isActive_idx" ON "imovel_custom_fields"("isActive");
