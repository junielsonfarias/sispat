-- CHECK constraints para garantir integridade de domínio em Patrimonio.
-- valor_aquisicao não pode ser negativo; quantidade tem que ser > 0.
-- IF NOT EXISTS torna a migration idempotente em ambientes que já têm os checks.

ALTER TABLE "patrimonios"
  ADD CONSTRAINT "patrimonios_valor_aquisicao_check"
  CHECK ("valor_aquisicao" >= 0);

ALTER TABLE "patrimonios"
  ADD CONSTRAINT "patrimonios_quantidade_check"
  CHECK ("quantidade" > 0);
