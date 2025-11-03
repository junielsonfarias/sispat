-- CreateTable
CREATE TABLE "documentos_gerais" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "tags" TEXT[],
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_gerais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_report_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_report_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excel_csv_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "conditionalFormatting" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excel_csv_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_field_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "options" TEXT[],
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_field_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_storage" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "provider" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_storage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_gerais_uploadedById_idx" ON "documentos_gerais"("uploadedById");

-- CreateIndex
CREATE INDEX "documentos_gerais_tipo_idx" ON "documentos_gerais"("tipo");

-- CreateIndex
CREATE INDEX "documentos_gerais_isPublic_idx" ON "documentos_gerais"("isPublic");

-- CreateIndex
CREATE INDEX "user_report_configs_userId_idx" ON "user_report_configs"("userId");

-- CreateIndex
CREATE INDEX "excel_csv_templates_municipalityId_idx" ON "excel_csv_templates"("municipalityId");

-- CreateIndex
CREATE INDEX "form_field_configs_municipalityId_idx" ON "form_field_configs"("municipalityId");

-- CreateIndex
CREATE INDEX "form_field_configs_key_idx" ON "form_field_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_key" ON "role_permissions"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_storage_municipalityId_key" ON "cloud_storage"("municipalityId");

-- CreateIndex
CREATE INDEX "cloud_storage_municipalityId_idx" ON "cloud_storage"("municipalityId");

-- AddForeignKey
ALTER TABLE "documentos_gerais" ADD CONSTRAINT "documentos_gerais_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
