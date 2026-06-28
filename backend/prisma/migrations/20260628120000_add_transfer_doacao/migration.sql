-- Transferência: suporte a doação (saída do bem do município).
-- Na doação não há setor de destino (o bem deixa o patrimônio do município),
-- então setorDestino passa a ser opcional e adicionamos os campos da doação.

ALTER TABLE "transferencias" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'transferencia';
ALTER TABLE "transferencias" ADD COLUMN "destinatarioExterno" TEXT;
ALTER TABLE "transferencias" ADD COLUMN "documentosAnexos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "transferencias" ALTER COLUMN "setorDestino" DROP NOT NULL;
