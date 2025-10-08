-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL,
    "responsibleSectors" TEXT[],
    "municipalityId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipalities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "logoUrl" TEXT,
    "footerText" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "description" TEXT,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sectorId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_bens" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "vidaUtilPadrao" INTEGER,
    "taxaDepreciacao" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_bens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formas_aquisicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formas_aquisicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrimonios" (
    "id" TEXT NOT NULL,
    "numero_patrimonio" TEXT NOT NULL,
    "descricao_bem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "cor" TEXT,
    "numero_serie" TEXT,
    "data_aquisicao" TIMESTAMP(3) NOT NULL,
    "valor_aquisicao" DOUBLE PRECISION NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "numero_nota_fiscal" TEXT,
    "forma_aquisicao" TEXT NOT NULL,
    "setor_responsavel" TEXT NOT NULL,
    "local_objeto" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "situacao_bem" TEXT,
    "observacoes" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metodo_depreciacao" TEXT DEFAULT 'Linear',
    "vida_util_anos" INTEGER,
    "valor_residual" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "municipalityId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "localId" TEXT,
    "tipoId" TEXT,
    "acquisitionFormId" TEXT,

    CONSTRAINT "patrimonios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imoveis" (
    "id" TEXT NOT NULL,
    "numero_patrimonio" TEXT NOT NULL,
    "denominacao" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "data_aquisicao" TIMESTAMP(3) NOT NULL,
    "valor_aquisicao" DOUBLE PRECISION NOT NULL,
    "area_terreno" DOUBLE PRECISION NOT NULL,
    "area_construida" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "descricao" TEXT,
    "observacoes" TEXT,
    "tipo_imovel" TEXT,
    "situacao" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url_documentos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "municipalityId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,

    CONSTRAINT "imoveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "origem" TEXT,
    "destino" TEXT,
    "patrimonioId" TEXT,
    "imovelId" TEXT,

    CONSTRAINT "historico_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "numero_patrimonio" TEXT NOT NULL,
    "descricao_bem" TEXT NOT NULL,
    "setorOrigem" TEXT NOT NULL,
    "setorDestino" TEXT NOT NULL,
    "localOrigem" TEXT NOT NULL,
    "localDestino" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "dataTransferencia" TIMESTAMP(3) NOT NULL,
    "responsavelOrigem" TEXT NOT NULL,
    "responsavelDestino" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "numero_patrimonio" TEXT NOT NULL,
    "descricao_bem" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "dataEmprestimo" TIMESTAMP(3) NOT NULL,
    "dataPrevDevolucao" TIMESTAMP(3) NOT NULL,
    "dataDevolucao" TIMESTAMP(3),
    "motivo" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_patrimonios" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_patrimonios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventarios" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsavel" TEXT NOT NULL,
    "setor" TEXT,
    "local" TEXT,
    "scope" TEXT NOT NULL,
    "specificLocationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'em_andamento',
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "encontrado" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "verificadoEm" TIMESTAMP(3),
    "verificadoPor" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencao_tasks" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT,
    "imovelId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "responsavel" TEXT,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "dataConclusao" TIMESTAMP(3),
    "custo" DOUBLE PRECISION,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manutencao_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configuration" (
    "id" TEXT NOT NULL,
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "allowPublicSearch" BOOLEAN NOT NULL DEFAULT true,
    "maxUploadSize" INTEGER NOT NULL DEFAULT 10485760,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 3600,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "requirePasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_municipalityId_idx" ON "users"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_codigo_key" ON "sectors"("codigo");

-- CreateIndex
CREATE INDEX "sectors_municipalityId_idx" ON "sectors"("municipalityId");

-- CreateIndex
CREATE INDEX "sectors_codigo_idx" ON "sectors"("codigo");

-- CreateIndex
CREATE INDEX "locais_sectorId_idx" ON "locais"("sectorId");

-- CreateIndex
CREATE INDEX "locais_municipalityId_idx" ON "locais"("municipalityId");

-- CreateIndex
CREATE INDEX "tipos_bens_municipalityId_idx" ON "tipos_bens"("municipalityId");

-- CreateIndex
CREATE INDEX "formas_aquisicao_municipalityId_idx" ON "formas_aquisicao"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "patrimonios_numero_patrimonio_key" ON "patrimonios"("numero_patrimonio");

-- CreateIndex
CREATE INDEX "patrimonios_numero_patrimonio_idx" ON "patrimonios"("numero_patrimonio");

-- CreateIndex
CREATE INDEX "patrimonios_municipalityId_idx" ON "patrimonios"("municipalityId");

-- CreateIndex
CREATE INDEX "patrimonios_sectorId_idx" ON "patrimonios"("sectorId");

-- CreateIndex
CREATE INDEX "patrimonios_status_idx" ON "patrimonios"("status");

-- CreateIndex
CREATE UNIQUE INDEX "imoveis_numero_patrimonio_key" ON "imoveis"("numero_patrimonio");

-- CreateIndex
CREATE INDEX "imoveis_numero_patrimonio_idx" ON "imoveis"("numero_patrimonio");

-- CreateIndex
CREATE INDEX "imoveis_municipalityId_idx" ON "imoveis"("municipalityId");

-- CreateIndex
CREATE INDEX "imoveis_sectorId_idx" ON "imoveis"("sectorId");

-- CreateIndex
CREATE INDEX "historico_entries_patrimonioId_idx" ON "historico_entries"("patrimonioId");

-- CreateIndex
CREATE INDEX "historico_entries_imovelId_idx" ON "historico_entries"("imovelId");

-- CreateIndex
CREATE INDEX "notes_patrimonioId_idx" ON "notes"("patrimonioId");

-- CreateIndex
CREATE INDEX "transferencias_patrimonioId_idx" ON "transferencias"("patrimonioId");

-- CreateIndex
CREATE INDEX "transferencias_status_idx" ON "transferencias"("status");

-- CreateIndex
CREATE INDEX "emprestimos_patrimonioId_idx" ON "emprestimos"("patrimonioId");

-- CreateIndex
CREATE INDEX "emprestimos_status_idx" ON "emprestimos"("status");

-- CreateIndex
CREATE INDEX "sub_patrimonios_patrimonioId_idx" ON "sub_patrimonios"("patrimonioId");

-- CreateIndex
CREATE INDEX "inventarios_status_idx" ON "inventarios"("status");

-- CreateIndex
CREATE INDEX "inventarios_setor_idx" ON "inventarios"("setor");

-- CreateIndex
CREATE INDEX "inventory_items_inventoryId_idx" ON "inventory_items"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_items_patrimonioId_idx" ON "inventory_items"("patrimonioId");

-- CreateIndex
CREATE INDEX "manutencao_tasks_patrimonioId_idx" ON "manutencao_tasks"("patrimonioId");

-- CreateIndex
CREATE INDEX "manutencao_tasks_imovelId_idx" ON "manutencao_tasks"("imovelId");

-- CreateIndex
CREATE INDEX "manutencao_tasks_status_idx" ON "manutencao_tasks"("status");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_lida_idx" ON "notifications"("lida");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locais" ADD CONSTRAINT "locais_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locais" ADD CONSTRAINT "locais_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonios" ADD CONSTRAINT "patrimonios_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonios" ADD CONSTRAINT "patrimonios_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonios" ADD CONSTRAINT "patrimonios_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonios" ADD CONSTRAINT "patrimonios_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipos_bens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonios" ADD CONSTRAINT "patrimonios_acquisitionFormId_fkey" FOREIGN KEY ("acquisitionFormId") REFERENCES "formas_aquisicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonios" ADD CONSTRAINT "patrimonios_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_entries" ADD CONSTRAINT "historico_entries_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_entries" ADD CONSTRAINT "historico_entries_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_patrimonios" ADD CONSTRAINT "sub_patrimonios_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao_tasks" ADD CONSTRAINT "manutencao_tasks_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao_tasks" ADD CONSTRAINT "manutencao_tasks_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
