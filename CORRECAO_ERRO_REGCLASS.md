# Correção: Erro de Deserialização Prisma (regclass)

## 📋 Problema Identificado

Após iniciar o backend, os logs mostram um erro recorrente a cada 30 segundos:

```
prisma:error
Invalid `prisma.$queryRawUnsafe()` invocation:
Raw query failed. Code: `N/A`. Message: `Failed to deserialize column of type 'regclass'. 
If you're using $queryRaw and this column is explicitly marked as `Unsupported` in your 
Prisma schema, try casting this column to any supported Prisma type such as `String`.`
```

### Causa Raiz

O erro ocorre no arquivo `backend/src/config/metrics.ts` na função que coleta métricas de documentos. A query SQL usa `to_regclass()` que retorna um tipo `regclass` (tipo específico do PostgreSQL para referências de objetos do sistema), que o Prisma não consegue deserializar automaticamente.

**Localização**: `backend/src/config/metrics.ts` linha 221

**Query problemática**:
```sql
SELECT to_regclass('public.documentos_gerais') as regclass
```

---

## ✅ Correção Aplicada

### Antes (Problema)

```typescript
const check: Array<{ regclass: string | null }> = await prisma.$queryRawUnsafe(
  "SELECT to_regclass('public.documentos_gerais') as regclass"
)
```

### Depois (Corrigido)

```typescript
// Corrigir: fazer cast de regclass para text para evitar erro de deserialização
const check: Array<{ regclass: string | null }> = await prisma.$queryRawUnsafe(
  "SELECT to_regclass('public.documentos_gerais')::text as regclass"
)
```

**Mudança**: Adicionado `::text` após `to_regclass()` para converter o tipo `regclass` para `text`, que o Prisma consegue deserializar.

---

## 🔍 Explicação Técnica

### Por que o erro ocorre?

1. **Tipo `regclass`**: É um tipo específico do PostgreSQL que representa referências a objetos do sistema (tabelas, views, etc.)
2. **Prisma**: Não tem suporte nativo para tipos específicos do PostgreSQL como `regclass`
3. **Solução**: Fazer cast explícito para `text` usando `::text` no SQL

### Por que a cada 30 segundos?

O erro ocorre porque:
- O Health Monitoring está configurado para coletar métricas a cada 60 segundos
- A função `collectApplicationMetrics()` é chamada periodicamente
- Essa função verifica se a tabela `documentos_gerais` existe usando `to_regclass()`
- Como a query retorna `regclass` sem cast, o Prisma falha na deserialização

---

## 📝 Arquivo Modificado

**Arquivo**: `backend/src/config/metrics.ts`

**Linha**: 221-222

**Mudança**: Adicionado `::text` após `to_regclass()`

---

## 🧪 Validação

Após a correção:

1. ✅ O erro de deserialização não deve mais aparecer nos logs
2. ✅ A verificação da existência da tabela continua funcionando
3. ✅ O Health Monitoring continua coletando métricas normalmente

**Para verificar após deploy**:
```bash
pm2 logs sispat-backend --lines 50 | grep -i "regclass\|prisma:error"
```

**Resultado esperado**: Nenhum erro relacionado a `regclass` ou `prisma:error`.

---

## 🚀 Próximos Passos

1. ✅ Correção aplicada ao código
2. ⏳ Recompilar backend
3. ⏳ Reiniciar PM2
4. ⏳ Verificar logs para confirmar que erro não aparece mais

---

## 📚 Referências

- [Prisma Raw Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
- [PostgreSQL regclass Type](https://www.postgresql.org/docs/current/datatype-oid.html)
- [PostgreSQL Type Casting](https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-TYPE-CASTS)

---

**Data**: 2025-11-03  
**Versão**: 2.0.0  
**Status**: ✅ Corrigido

