# Docs/_LEGADO — quarentena histórica

> **Não apague nada daqui sem revisar.** São arquivos que poluíam a raiz/`Docs/` mas
> podem conter informação valiosa para troubleshooting futuro.

## Estrutura

### `raiz/` (78 arquivos)
Scripts shell e documentos `.md`/`.txt` que estavam na raiz do projeto.
Categorias:
- `ANALISAR_*`, `DIAGNOSTICAR_*`, `VERIFICAR_*` — diagnóstico pontual em produção
- `CORRIGIR_*`, `CORRECAO_*` — correções avulsas (consolidadas em `install.sh` e no controller)
- `ATUALIZAR_*`, `CONTINUAR_*`, `EXECUTAR_*`, `INSTALAR_*` — scripts de operação one-off
- `RESOLVER_*`, `ENCONTRAR_*`, `TESTAR_*`, `REMOVER_*` — utilitários ad-hoc
- `*_COMANDOS_*.txt`, `*_GUIA_*.md`, `*_RESUMO_*.md` — cheat-sheets antigos

### `docs-dup/` (56 arquivos)
Arquivos com sufixo ` copy`, ` copy 2`, `_FINAL_ATUALIZADA` que duplicavam outros em `Docs/`.
Mantidos por segurança — em geral o arquivo sem sufixo em `Docs/` é a versão mais nova.

## Por que mover em vez de deletar

1. **Git já tem o histórico** — mas mover preserva acessibilidade direta.
2. **Documentos `.md` antigos** podem conter diagnóstico de bug específico ainda útil.
3. **Scripts shell** documentam comandos que funcionaram em incidentes reais.

## Política

- Estes arquivos **não são fonte de verdade.** Fonte de verdade está em `Docs/_PROJETO/`.
- Antes de ressuscitar um `.sh` daqui, verifique se a funcionalidade já está em `install.sh`,
  `scripts/rollback.sh`, ou no código atualizado.
- A partir de 2026-05-12, **nada novo deve ser criado aqui** — quarentena de uma única vez.
