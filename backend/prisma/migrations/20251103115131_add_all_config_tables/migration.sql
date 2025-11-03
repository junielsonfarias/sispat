-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imovel_report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "fields" TEXT[],
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imovel_report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numbering_patterns" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "numbering_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_dashboards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_templates_municipalityId_idx" ON "report_templates"("municipalityId");

-- CreateIndex
CREATE INDEX "imovel_report_templates_municipalityId_idx" ON "imovel_report_templates"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "numbering_patterns_municipalityId_key" ON "numbering_patterns"("municipalityId");

-- CreateIndex
CREATE INDEX "numbering_patterns_municipalityId_idx" ON "numbering_patterns"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "user_dashboards_userId_key" ON "user_dashboards"("userId");

-- CreateIndex
CREATE INDEX "user_dashboards_userId_idx" ON "user_dashboards"("userId");
