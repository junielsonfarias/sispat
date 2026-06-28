-- Imóvel: endereço estruturado (além do campo livre `endereco`).
-- Todos opcionais para não quebrar registros existentes.

ALTER TABLE "imoveis" ADD COLUMN "cep" TEXT;
ALTER TABLE "imoveis" ADD COLUMN "bairro" TEXT;
ALTER TABLE "imoveis" ADD COLUMN "cidade" TEXT;
ALTER TABLE "imoveis" ADD COLUMN "estado" TEXT;
