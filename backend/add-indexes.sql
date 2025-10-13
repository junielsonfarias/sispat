-- Migration: Adicionar índices de performance
-- Data: 11/10/2025
-- Versão: 2.0.4

-- Patrimônios - Novos índices
CREATE INDEX IF NOT EXISTS "patrimonios_createdAt_idx" ON "patrimonios"("createdAt");
CREATE INDEX IF NOT EXISTS "patrimonios_data_aquisicao_idx" ON "patrimonios"("data_aquisicao");
CREATE INDEX IF NOT EXISTS "patrimonios_municipalityId_status_idx" ON "patrimonios"("municipalityId", "status");
CREATE INDEX IF NOT EXISTS "patrimonios_sectorId_status_idx" ON "patrimonios"("sectorId", "status");

-- Imóveis - Novos índices
CREATE INDEX IF NOT EXISTS "imoveis_createdAt_idx" ON "imoveis"("createdAt");
CREATE INDEX IF NOT EXISTS "imoveis_data_aquisicao_idx" ON "imoveis"("data_aquisicao");
CREATE INDEX IF NOT EXISTS "imoveis_municipalityId_sectorId_idx" ON "imoveis"("municipalityId", "sectorId");

-- Verificar índices criados
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('patrimonios', 'imoveis')
ORDER BY tablename, indexname;

