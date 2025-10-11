-- Migration para corrigir a tabela customizations
-- Adiciona colunas em camelCase para compatibilidade com o frontend

-- Adicionar colunas em camelCase
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "activeLogoUrl" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "secondaryLogoUrl" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "municipalityId" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "primaryColor" VARCHAR(7);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "backgroundColor" VARCHAR(7);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "buttonTextColor" VARCHAR(7);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "backgroundType" VARCHAR(50);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "backgroundImageUrl" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "backgroundVideoUrl" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "videoLoop" BOOLEAN DEFAULT true;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "videoMuted" BOOLEAN DEFAULT true;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "layout" VARCHAR(50) DEFAULT 'center';
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "welcomeTitle" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "welcomeSubtitle" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "fontFamily" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "browserTitle" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "loginFooterText" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "systemFooterText" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "superUserFooterText" TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "prefeituraName" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "secretariaResponsavel" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "departamentoResponsavel" VARCHAR(255);
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Copiar dados das colunas snake_case para camelCase
UPDATE customizations SET "municipalityId" = municipality_id WHERE "municipalityId" IS NULL;
UPDATE customizations SET "activeLogoUrl" = logo_url WHERE "activeLogoUrl" IS NULL AND logo_url IS NOT NULL;
UPDATE customizations SET "primaryColor" = primary_color WHERE "primaryColor" IS NULL AND primary_color IS NOT NULL;
UPDATE customizations SET "updatedAt" = updated_at WHERE "updatedAt" IS NULL AND updated_at IS NOT NULL;
