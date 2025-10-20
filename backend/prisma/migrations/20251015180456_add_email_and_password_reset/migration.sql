-- CreateTable
CREATE TABLE "customizations" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "activeLogoUrl" TEXT,
    "secondaryLogoUrl" TEXT,
    "backgroundType" TEXT NOT NULL DEFAULT 'color',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f1f5f9',
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "videoLoop" BOOLEAN NOT NULL DEFAULT true,
    "videoMuted" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'center',
    "welcomeTitle" TEXT NOT NULL DEFAULT 'Bem-vindo ao SISPAT',
    "welcomeSubtitle" TEXT NOT NULL DEFAULT 'Sistema de Gestão de Patrimônio',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "fontFamily" TEXT NOT NULL DEFAULT '''Inter var'', sans-serif',
    "browserTitle" TEXT NOT NULL DEFAULT 'SISPAT - Sistema de Gestão de Patrimônio',
    "faviconUrl" TEXT,
    "loginFooterText" TEXT NOT NULL DEFAULT '© 2025 Curling. Todos os direitos reservados.',
    "systemFooterText" TEXT NOT NULL DEFAULT 'SISPAT - Desenvolvido por Curling',
    "superUserFooterText" TEXT,
    "prefeituraName" TEXT NOT NULL DEFAULT 'PREFEITURA DE SÃO SEBASTIÃO DA BOA VISTA',
    "secretariaResponsavel" TEXT NOT NULL DEFAULT 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO',
    "departamentoResponsavel" TEXT NOT NULL DEFAULT 'DEPARTAMENTO DE PATRIMÔNIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT,
    "imovelId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileSize" INTEGER,
    "description" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ficha_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "elements" JSONB NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customizations_municipalityId_key" ON "customizations"("municipalityId");

-- CreateIndex
CREATE INDEX "documents_patrimonioId_idx" ON "documents"("patrimonioId");

-- CreateIndex
CREATE INDEX "documents_imovelId_idx" ON "documents"("imovelId");

-- CreateIndex
CREATE INDEX "documents_uploadedBy_idx" ON "documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "ficha_templates_municipalityId_idx" ON "ficha_templates"("municipalityId");

-- CreateIndex
CREATE INDEX "ficha_templates_type_idx" ON "ficha_templates"("type");

-- CreateIndex
CREATE INDEX "ficha_templates_isDefault_idx" ON "ficha_templates"("isDefault");

-- CreateIndex
CREATE INDEX "ficha_templates_isActive_idx" ON "ficha_templates"("isActive");

-- CreateIndex
CREATE INDEX "label_templates_municipalityId_idx" ON "label_templates"("municipalityId");

-- CreateIndex
CREATE INDEX "label_templates_isDefault_idx" ON "label_templates"("isDefault");

-- CreateIndex
CREATE INDEX "label_templates_isActive_idx" ON "label_templates"("isActive");

-- CreateIndex
CREATE INDEX "imoveis_createdAt_idx" ON "imoveis"("createdAt");

-- CreateIndex
CREATE INDEX "imoveis_data_aquisicao_idx" ON "imoveis"("data_aquisicao");

-- CreateIndex
CREATE INDEX "imoveis_municipalityId_sectorId_idx" ON "imoveis"("municipalityId", "sectorId");

-- CreateIndex
CREATE INDEX "imovel_custom_fields_displayOrder_idx" ON "imovel_custom_fields"("displayOrder");

-- CreateIndex
CREATE INDEX "patrimonios_createdAt_idx" ON "patrimonios"("createdAt");

-- CreateIndex
CREATE INDEX "patrimonios_data_aquisicao_idx" ON "patrimonios"("data_aquisicao");

-- CreateIndex
CREATE INDEX "patrimonios_municipalityId_status_idx" ON "patrimonios"("municipalityId", "status");

-- CreateIndex
CREATE INDEX "patrimonios_sectorId_status_idx" ON "patrimonios"("sectorId", "status");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_templates" ADD CONSTRAINT "ficha_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
