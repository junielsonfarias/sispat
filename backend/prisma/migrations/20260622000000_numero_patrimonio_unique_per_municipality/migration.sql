-- numero_patrimonio: de unico GLOBAL para unico POR MUNICIPIO.
-- Acompanha @@unique([municipalityId, numero_patrimonio]) no schema.prisma.
-- O indice de busca (@@index([numero_patrimonio]) -> *_idx) e mantido.
--
-- PRE-REQUISITO: nenhum numero_patrimonio duplicado ENTRE municipios diferentes
-- (seguro em modo municipio unico). Em multi-municipio, validar antes de aplicar.

-- Patrimonio
DROP INDEX "patrimonios_numero_patrimonio_key";
CREATE UNIQUE INDEX "patrimonios_municipalityId_numero_patrimonio_key" ON "patrimonios"("municipalityId", "numero_patrimonio");

-- Imovel
DROP INDEX "imoveis_numero_patrimonio_key";
CREATE UNIQUE INDEX "imoveis_municipalityId_numero_patrimonio_key" ON "imoveis"("municipalityId", "numero_patrimonio");
