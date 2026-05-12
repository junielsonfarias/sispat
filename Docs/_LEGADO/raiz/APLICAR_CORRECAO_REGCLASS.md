# 🔧 Aplicar Correção regclass no Servidor

## ⚠️ Problema

O `git pull` e `npm run build` falharam por problemas de permissão. Vamos aplicar a correção manualmente.

---

## 🚀 SOLUÇÃO RÁPIDA (Aplicar no Servidor)

Execute estes comandos no VPS:

```bash
cd /var/www/sispat/backend

# 1. Corrigir permissões do Git (se necessário)
git config --global --add safe.directory /var/www/sispat

# 2. Aplicar correção manualmente no arquivo
sed -i "s/to_regclass('public.documentos_gerais') as regclass/to_regclass('public.documentos_gerais')::text as regclass/g" src/config/metrics.ts

# 3. Corrigir permissões do TypeScript
chmod +x node_modules/.bin/tsc 2>/dev/null || true
chmod +x node_modules/typescript/bin/tsc 2>/dev/null || true

# 4. Recompilar backend
npm run build:prod

# 5. Reiniciar PM2
pm2 restart sispat-backend

# 6. Verificar se erro desapareceu (aguardar 1 minuto)
sleep 60
pm2 logs sispat-backend --lines 20 | grep -i "regclass\|prisma:error" || echo "✅ Nenhum erro encontrado!"
```

---

## 📝 Alternativa: Editar Manualmente

Se o `sed` não funcionar, edite manualmente:

```bash
cd /var/www/sispat/backend
nano src/config/metrics.ts
```

**Localizar linha 222** e alterar:

**Antes:**
```typescript
"SELECT to_regclass('public.documentos_gerais') as regclass"
```

**Depois:**
```typescript
"SELECT to_regclass('public.documentos_gerais')::text as regclass"
```

Salvar (Ctrl+O, Enter, Ctrl+X) e executar:

```bash
chmod +x node_modules/.bin/tsc
npm run build:prod
pm2 restart sispat-backend
```

---

## ✅ Verificação

Após aplicar a correção e reiniciar, aguarde 1-2 minutos e verifique:

```bash
pm2 logs sispat-backend --lines 50 | grep -i "regclass\|prisma:error"
```

**Resultado esperado**: Nenhuma linha deve aparecer.

---

## 🔍 Se Ainda Aparecer Erro

Verifique se a correção foi aplicada:

```bash
cd /var/www/sispat/backend
grep -n "to_regclass.*documentos_gerais" src/config/metrics.ts
```

**Deve mostrar:**
```
222:          "SELECT to_regclass('public.documentos_gerais')::text as regclass"
```

Se não tiver `::text`, a correção não foi aplicada. Edite manualmente como mostrado acima.

---

**Data**: 2025-11-03

