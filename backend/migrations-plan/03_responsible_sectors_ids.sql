-- ============================================================================
-- MIGRATION: ResponsibleSectors - De Nomes para IDs
-- Data: 2025-10-11
-- Versão: 2.0.5
-- ============================================================================
-- 
-- OBJETIVO:
-- Converter User.responsibleSectors de array de nomes para array de IDs
-- 
-- ANTES: responsibleSectors: ['TI', 'Patrimônio', 'RH']
-- DEPOIS: responsibleSectors: ['uuid-1', 'uuid-2', 'uuid-3']
--
-- BENEFÍCIOS:
-- 1. Consistência (renomear setor não quebra permissões)
-- 2. Performance (JOIN direto sem busca por nome)
-- 3. Integridade referencial
--
-- IMPACTO: MÉDIO
-- - Frontend precisa buscar setores por ID
-- - Controllers precisam fazer JOIN com sectors
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- ETAPA 1: CRIAR BACKUP
-- ============================================================================

CREATE TABLE IF NOT EXISTS users_backup_20251011 AS 
SELECT * FROM users;

COMMENT ON TABLE users_backup_20251011 IS 'Backup antes de converter responsibleSectors para IDs - 2025-10-11';

-- ============================================================================
-- ETAPA 2: CRIAR COLUNA TEMPORÁRIA
-- ============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "responsibleSectorIds" TEXT[] DEFAULT '{}';

COMMENT ON COLUMN users."responsibleSectorIds" IS 'Array de IDs dos setores (migração de responsibleSectors)';

-- ============================================================================
-- ETAPA 3: MIGRAR NOMES PARA IDs
-- ============================================================================

DO $$
DECLARE
    user_rec RECORD;
    sector_name TEXT;
    sector_ids TEXT[] := '{}';
    sector_id TEXT;
BEGIN
    -- Para cada usuário
    FOR user_rec IN SELECT id, "responsibleSectors" FROM users LOOP
        sector_ids := '{}'; -- Reset
        
        -- Para cada nome de setor no array
        FOREACH sector_name IN ARRAY user_rec."responsibleSectors" LOOP
            -- Buscar ID do setor
            SELECT id INTO sector_id
            FROM sectors
            WHERE name = sector_name
            LIMIT 1;
            
            -- Se encontrou, adicionar ao array
            IF sector_id IS NOT NULL THEN
                sector_ids := array_append(sector_ids, sector_id);
            ELSE
                RAISE WARNING 'Usuário % tem setor não encontrado: %', user_rec.id, sector_name;
            END IF;
        END LOOP;
        
        -- Atualizar usuário com IDs
        UPDATE users
        SET "responsibleSectorIds" = sector_ids
        WHERE id = user_rec.id;
        
        RAISE NOTICE 'Usuário %: % setores migrados', user_rec.id, array_length(sector_ids, 1);
    END LOOP;
END $$;

-- ============================================================================
-- ETAPA 4: VERIFICAR MIGRAÇÃO
-- ============================================================================

SELECT 
    u.id,
    u.name,
    u."responsibleSectors" AS nomes_antigos,
    u."responsibleSectorIds" AS ids_novos,
    array_length(u."responsibleSectors", 1) AS qtd_nomes,
    array_length(u."responsibleSectorIds", 1) AS qtd_ids
FROM users u
WHERE array_length(u."responsibleSectors", 1) > 0
ORDER BY u.name;

-- ============================================================================
-- ETAPA 5: RENOMEAR COLUNAS (comentado por segurança)
-- ============================================================================
--
-- ⚠️ DESCOMENTE APENAS APÓS:
-- 1. Verificar que todos os IDs foram migrados corretamente
-- 2. Atualizar backend controllers para usar responsibleSectorIds
-- 3. Atualizar frontend para buscar setores por ID
-- 4. Testar em staging
--
-- ALTER TABLE users RENAME COLUMN "responsibleSectors" TO "responsibleSectors_OLD";
-- ALTER TABLE users RENAME COLUMN "responsibleSectorIds" TO "responsibleSectors";

-- ============================================================================
-- ETAPA 6: ATUALIZAR SCHEMA PRISMA
-- ============================================================================
--
-- Após executar esta migration, atualizar backend/src/prisma/schema.prisma:
--
-- model User {
--   // ANTES:
--   // responsibleSectors String[] @default([])
--   
--   // DEPOIS:
--   responsibleSectors String[] @default([]) // Agora são IDs, não nomes!
-- }
--
-- E atualizar os controllers para fazer JOIN:
--
-- // backend/src/controllers/userController.ts
-- const user = await prisma.user.findUnique({
--   where: { id },
--   include: {
--     sectors: {
--       where: {
--         id: { in: user.responsibleSectors }
--       }
--     }
--   }
-- })

-- ============================================================================
-- ROLLBACK (se necessário)
-- ============================================================================
--
-- ROLLBACK;
--
-- -- Restaurar backup:
-- TRUNCATE users CASCADE;
-- INSERT INTO users SELECT * FROM users_backup_20251011;

COMMIT;

-- ============================================================================
-- INSTRUÇÕES DE USO:
-- ============================================================================
-- 
-- 1. STAGING:
--    psql -U postgres -d sispat_staging -f 03_responsible_sectors_ids.sql
--
-- 2. Verificar logs e tabela de verificação
--
-- 3. Testar aplicação com responsibleSectorIds
--
-- 4. Se tudo OK, descomentar ETAPA 5 e executar novamente
--
-- 5. PRODUÇÃO (após testes):
--    psql -U postgres -d sispat_production -f 03_responsible_sectors_ids.sql
--
-- ============================================================================


