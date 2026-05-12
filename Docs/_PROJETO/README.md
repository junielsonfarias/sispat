# Documentação do Projeto — SISPAT 2.0

Esta pasta é a **fonte canônica** de documentação do projeto. Tudo o que está fora daqui em `Docs/` é histórico legado (553 arquivos acumulados).

## Índice

| Arquivo | Para quê |
|---------|----------|
| [`ARQUITETURA.md`](ARQUITETURA.md) | Stack, camadas, modelo de dados, fluxos críticos |
| [`REGRAS_NEGOCIO.md`](REGRAS_NEGOCIO.md) | Domínio funcional: papéis, fluxos, validações |
| [`CONVENCOES_CODIGO.md`](CONVENCOES_CODIGO.md) | Estrutura de pastas, nomenclatura, padrões de código |
| [`INFRAESTRUTURA.md`](INFRAESTRUTURA.md) | Deploy, Nginx, PM2, env vars, backups, monitoramento |
| [`SEGURANCA.md`](SEGURANCA.md) | Auditoria, controles, checklist pré-produção |
| [`HISTORICO_CORRECOES.md`](HISTORICO_CORRECOES.md) | Log de bugs encontrados e correções aplicadas |
| [`PLANO_CORRECOES.md`](PLANO_CORRECOES.md) | Roadmap priorizado P0→P3 com esforços |

## Regras de manutenção

1. **Atualize, não duplique.** Se algo mudou, edite o arquivo existente. Não crie `ARQUITETURA_v2.md`, `ARQUITETURA_FINAL.md`, etc.
2. **Toda correção não-trivial** vai em `HISTORICO_CORRECOES.md` — não em arquivo novo na raiz.
3. **Nova decisão arquitetural** vai em `ARQUITETURA.md` na seção "Decisões arquiteturais".
4. **Nova convenção** vai em `CONVENCOES_CODIGO.md`.
5. **Item resolvido do plano** marca como ✅ em `PLANO_CORRECOES.md` (não remove — para histórico).

## Para Claude Code

- Leia primeiro `/CLAUDE.md` (raiz).
- Em mudanças backend → confira `ARQUITETURA.md` + `REGRAS_NEGOCIO.md`.
- Em mudanças infra → confira `INFRAESTRUTURA.md` + `HISTORICO_CORRECOES.md`.
- Antes de cada PR → confira `CONVENCOES_CODIGO.md`.
