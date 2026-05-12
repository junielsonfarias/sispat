# 🔧 Aplicar Correção regclass - Instruções para Servidor

## ⚠️ Problema

O build não completou devido a problemas de permissão, então o código antigo ainda está em execução.

---

## 🚀 SOLUÇÃO PASSO A PASSO

Execute **cada comando** no servidor:

### **Passo 1: Verificar se correção foi aplicada**

```bash
cd /var/www/sispat/backend
grep -n "to_regclass.*documentos_gerais" src/config/metrics.ts
```

**Deve mostrar:**
```
222:          "SELECT to_regclass('public.documentos_gerais')::text as regclass
```

**Se NÃO tiver `::text`, execute:**
```bash
sed -i "s/to_regclass('public.documentos_gerais') as regclass/to_regclass('public.documentos_gerais')::text as regclass/g" src/config/metrics.ts
```

---

### **Passo 2: Corrigir permissões**

```bash
cd /var/www/sispat/backend

# Corrigir permissões de todos os binários
chmod -R +x node_modules/.bin/
chmod +x node_modules/typescript/bin/tsc
chmod +x node_modules/prisma/build/index.js

# Corrigir permissões do diretório
chown -R root:root node_modules/.bin/
```

---

### **Passo 3: Limpar build anterior**

```bash
cd /var/www/sispat/backend
rm -rf dist
```

---

### **Passo 4: Gerar Prisma Client**

```bash
cd /var/www/sispat/backend

# Tentar com npx
npx prisma generate

# Se falhar, tentar com caminho completo
/usr/bin/node node_modules/prisma/build/index.js generate

# Ou usar npm
npm run prisma:generate
```

---

### **Passo 5: Compilar TypeScript**

```bash
cd /var/www/sispat/backend

# Tentar com npx
npx tsc

# Se falhar, tentar com caminho completo
node_modules/.bin/tsc

# Ou usar npm
npm run build
```

---

### **Passo 6: Verificar se build foi criado**

```bash
cd /var/www/sispat/backend
ls -lh dist/index.js
```

**Deve mostrar o arquivo:** `dist/index.js`

---

### **Passo 7: Verificar se correção está no código compilado**

```bash
cd /var/www/sispat/backend
grep -n "::text as regclass" dist/config/metrics.js
```

**Deve mostrar algo como:**
```
22: SELECT to_regclass('public.documentos_gerais')::text as regclass
```

**Se NÃO mostrar, o build não foi atualizado. Repita Passo 3-5.**

---

### **Passo 8: Reiniciar PM2**

```bash
cd /var/www/sispat/backend

# Parar processo atual
pm2 delete sispat-backend

# Iniciar novamente
pm2 start ecosystem.config.js --env production

# Salvar configuração
pm2 save

# Verificar status
pm2 status
```

---

### **Passo 9: Verificar se erro desapareceu**

Aguarde 1-2 minutos após reiniciar e execute:

```bash
pm2 logs sispat-backend --lines 50 | grep -i "regclass\|prisma:error"
```

**Resultado esperado:** Nenhuma linha deve aparecer.

---

## 🔄 SCRIPT AUTOMÁTICO COMPLETO

Se preferir, execute tudo de uma vez:

```bash
cd /var/www/sispat/backend

# Aplicar correção
sed -i "s/to_regclass('public.documentos_gerais') as regclass/to_regclass('public.documentos_gerais')::text as regclass/g" src/config/metrics.ts

# Corrigir permissões
chmod -R +x node_modules/.bin/
chmod +x node_modules/typescript/bin/tsc
chmod +x node_modules/prisma/build/index.js 2>/dev/null || true

# Limpar e recompilar
rm -rf dist
npx prisma generate || npm run prisma:generate
npx tsc || npm run build

# Verificar build
if [ -f "dist/index.js" ]; then
    echo "✅ Build criado"
    # Verificar se correção está no código compilado
    if grep -q "::text as regclass" dist/config/metrics.js 2>/dev/null; then
        echo "✅ Correção no código compilado confirmada"
        # Reiniciar
        pm2 delete sispat-backend
        pm2 start ecosystem.config.js --env production
        pm2 save
        echo "✅ Backend reiniciado. Aguarde 1 minuto e verifique logs."
    else
        echo "❌ Correção não encontrada no código compilado!"
        echo "Execute manualmente os passos acima."
    fi
else
    echo "❌ Build falhou! Verifique erros acima."
fi
```

---

## 🆘 SE AINDA NÃO FUNCIONAR

### Opção 1: Editar manualmente o arquivo compilado

```bash
cd /var/www/sispat/backend
nano dist/config/metrics.js
```

Busque por `to_regclass('public.documentos_gerais')` e adicione `::text` antes de `as regclass`.

**Salve e reinicie:**
```bash
pm2 restart sispat-backend
```

---

### Opção 2: Desabilitar Health Monitoring temporariamente

Se o problema persistir, você pode desabilitar temporariamente o Health Monitoring:

```bash
cd /var/www/sispat/backend
nano .env
```

Adicione ou altere:
```
ENABLE_HEALTH_MONITOR=false
```

Reinicie:
```bash
pm2 restart sispat-backend
```

---

**Data**: 2025-11-03

