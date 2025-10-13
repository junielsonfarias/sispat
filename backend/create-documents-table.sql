-- ============================================================================
-- CRIAR TABELA DOCUMENTS (v2.0.7)
-- Data: 2025-10-11
-- ============================================================================

BEGIN;

-- Criar tabela documents
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "patrimonioId" VARCHAR(36),
  "imovelId" VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  "fileSize" INTEGER,
  description TEXT,
  "uploadedBy" VARCHAR(36) NOT NULL,
  "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_documents_patrimonio ON documents("patrimonioId");
CREATE INDEX IF NOT EXISTS idx_documents_imovel ON documents("imovelId");
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents("uploadedBy");
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents("createdAt");

-- Foreign keys
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS fk_documents_patrimonio;

ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_patrimonio 
  FOREIGN KEY ("patrimonioId") REFERENCES patrimonios(id) ON DELETE CASCADE;

ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS fk_documents_imovel;

ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_imovel 
  FOREIGN KEY ("imovelId") REFERENCES imoveis(id) ON DELETE CASCADE;

ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS fk_documents_uploader;

ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_uploader 
  FOREIGN KEY ("uploadedBy") REFERENCES users(id);

COMMIT;

-- Verificar
SELECT 
  'documents' as tabela,
  COUNT(*) as total
FROM documents;

SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'documents'
ORDER BY indexname;

\echo '✅ Tabela documents criada com sucesso!'

