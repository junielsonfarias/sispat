-- ============================================================================
-- MIGRATION: Normalizar Campos Duplicados
-- Data: 2025-10-11
-- Versão: 2.0.5
-- ============================================================================
-- 
-- OBJETIVO:
-- Remover campos string duplicados que têm FK correspondente
-- 
-- CAMPOS AFETADOS:
-- 1. Patrimonio.tipo (string) + Patrimonio.tipoId (FK)
-- 2. Patrimonio.forma_aquisicao (string) + Patrimonio.acquisitionFormId (FK)
-- 3. Patrimonio.setor_responsavel (string) + Patrimonio.sectorId (FK)
-- 4. Patrimonio.local_objeto (string) + Patrimonio.localId (FK)
-- 5. Imovel.setor (string) + Imovel.sectorId (FK)
--
-- IMPACTO: MÉDIO
-- - Frontend precisa ser atualizado para usar apenas FKs
-- - Queries existentes precisam ser modificadas
--
-- RISCO: BAIXO (com backup)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ETAPA 1: BACKUP DAS TABELAS AFETADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS patrimonio_backup_20251011 AS 
SELECT * FROM patrimonios;

CREATE TABLE IF NOT EXISTS imovel_backup_20251011 AS 
SELECT * FROM imoveis;

COMMENT ON TABLE patrimonio_backup_20251011 IS 'Backup antes de normalizar campos duplicados - 2025-10-11';
COMMENT ON TABLE imovel_backup_20251011 IS 'Backup antes de normalizar campos duplicados - 2025-10-11';

-- ============================================================================
-- ETAPA 2: GARANTIR QUE TODOS OS FKs ESTÃO POPULADOS
-- ============================================================================

-- 2.1: Patrimonio.tipoId a partir de Patrimonio.tipo
UPDATE patrimonios p
SET "tipoId" = tb.id
FROM tipos_bens tb
WHERE p.tipo = tb.nome
  AND p."tipoId" IS NULL;

-- 2.2: Patrimonio.sectorId a partir de Patrimonio.setor_responsavel
UPDATE patrimonios p
SET "sectorId" = s.id
FROM sectors s
WHERE p.setor_responsavel = s.name
  AND p."sectorId" IS NULL;

-- 2.3: Patrimonio.localId a partir de Patrimonio.local_objeto
UPDATE patrimonios p
SET "localId" = l.id
FROM locais l
WHERE p.local_objeto = l.name
  AND p."localId" IS NULL;

-- 2.4: Patrimonio.acquisitionFormId a partir de Patrimonio.forma_aquisicao
UPDATE patrimonios p
SET "acquisitionFormId" = fa.id
FROM formas_aquisicao fa
WHERE p.forma_aquisicao = fa.nome
  AND p."acquisitionFormId" IS NULL;

-- 2.5: Imovel.sectorId a partir de Imovel.setor
UPDATE imoveis i
SET "sectorId" = s.id
FROM sectors s
WHERE i.setor = s.name
  AND i."sectorId" IS NULL;

-- ============================================================================
-- ETAPA 3: VERIFICAR SE HÁ REGISTROS ÓRFÃOS (sem FK)
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar Patrimonio.tipo sem tipoId
    SELECT COUNT(*) INTO v_count
    FROM patrimonios
    WHERE tipo IS NOT NULL AND "tipoId" IS NULL;
    
    IF v_count > 0 THEN
        RAISE WARNING 'ATENÇÃO: % patrimônios com tipo mas sem tipoId', v_count;
    END IF;

    -- Verificar Patrimonio.setor_responsavel sem sectorId
    SELECT COUNT(*) INTO v_count
    FROM patrimonios
    WHERE setor_responsavel IS NOT NULL AND "sectorId" IS NULL;
    
    IF v_count > 0 THEN
        RAISE WARNING 'ATENÇÃO: % patrimônios com setor_responsavel mas sem sectorId', v_count;
    END IF;

    -- Verificar Imovel.setor sem sectorId
    SELECT COUNT(*) INTO v_count
    FROM imoveis
    WHERE setor IS NOT NULL AND "sectorId" IS NULL;
    
    IF v_count > 0 THEN
        RAISE WARNING 'ATENÇÃO: % imóveis com setor mas sem sectorId', v_count;
    END IF;
END $$;

-- ============================================================================
-- ETAPA 4: REMOVER COLUNAS STRING (comentado por segurança)
-- ============================================================================
-- 
-- ⚠️ DESCOMENTE APENAS APÓS:
-- 1. Verificar que todos os FKs estão populados
-- 2. Atualizar o frontend para usar apenas FKs
-- 3. Testar em ambiente de staging
--
-- ALTER TABLE patrimonios DROP COLUMN IF EXISTS tipo;
-- ALTER TABLE patrimonios DROP COLUMN IF EXISTS forma_aquisicao;
-- ALTER TABLE patrimonios DROP COLUMN IF EXISTS setor_responsavel;
-- ALTER TABLE patrimonios DROP COLUMN IF EXISTS local_objeto;
-- ALTER TABLE imoveis DROP COLUMN IF EXISTS setor;

-- ============================================================================
-- ETAPA 5: ATUALIZAR SCHEMA PRISMA
-- ============================================================================
--
-- Após executar esta migration, atualizar backend/src/prisma/schema.prisma:
--
-- model Patrimonio {
--   // REMOVER:
--   // tipo                String?
--   // forma_aquisicao     String?
--   // setor_responsavel   String?
--   // local_objeto        String?
--   
--   // MANTER APENAS:
--   tipoId              String?
--   acquisitionFormId   String?
--   sectorId            String
--   localId             String?
-- }
--
-- model Imovel {
--   // REMOVER:
--   // setor               String?
--   
--   // MANTER APENAS:
--   sectorId            String
-- }
--
-- Executar: npx prisma generate

-- ============================================================================
-- ETAPA 6: CRIAR VIEWS DE COMPATIBILIDADE (opcional)
-- ============================================================================
--
-- Se quiser manter compatibilidade temporária com queries antigas:
--
-- CREATE OR REPLACE VIEW patrimonios_compat AS
-- SELECT 
--   p.*,
--   tb.nome AS tipo,
--   fa.nome AS forma_aquisicao,
--   s.name AS setor_responsavel,
--   l.name AS local_objeto
-- FROM patrimonios p
-- LEFT JOIN tipos_bens tb ON p."tipoId" = tb.id
-- LEFT JOIN formas_aquisicao fa ON p."acquisitionFormId" = fa.id
-- LEFT JOIN sectors s ON p."sectorId" = s.id
-- LEFT JOIN locais l ON p."localId" = l.id;

-- ============================================================================
-- ROLLBACK (se necessário)
-- ============================================================================
--
-- ROLLBACK;
--
-- -- Restaurar a partir do backup:
-- TRUNCATE patrimonios CASCADE;
-- INSERT INTO patrimonios SELECT * FROM patrimonio_backup_20251011;
--
-- TRUNCATE imoveis CASCADE;
-- INSERT INTO imoveis SELECT * FROM imovel_backup_20251011;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================================================

-- Contar registros
SELECT 
  'patrimonios' AS tabela,
  COUNT(*) AS total,
  COUNT("tipoId") AS com_tipoId,
  COUNT(tipo) AS com_tipo_string
FROM patrimonios

UNION ALL

SELECT 
  'imoveis' AS tabela,
  COUNT(*) AS total,
  COUNT("sectorId") AS com_sectorId,
  COUNT(setor) AS com_setor_string
FROM imoveis;

-- ============================================================================
-- INSTRUÇÕES DE USO:
-- ============================================================================
-- 
-- 1. STAGING:
--    psql -U postgres -d sispat_staging -f 02_normalizar_campos_duplicados.sql
--
-- 2. PRODUÇÃO (após testes):
--    psql -U postgres -d sispat_production -f 02_normalizar_campos_duplicados.sql
--
-- 3. Verificar logs e warnings
--
-- 4. Se tudo OK, descomentar ETAPA 4 e executar novamente
--
-- ============================================================================


