# 🔧 CORRIGIR ERRO 404 NAS ROTAS DE MÉTRICAS

## ❌ Problema
Após corrigir as permissões das rotas de métricas, o erro mudou de **403 (Forbidden)** para **404 (Not Found)**, indicando que a rota não está sendo encontrada no backend em execução.

## 🔍 Causa
O backend no servidor não foi recompilado/reiniciado após as alterações no código.

## ✅ Solução

### Opção 1: Script Automatizado (RECOMENDADO)

Execute no servidor:

```bash
cd /var/www/sispat
chmod +x CORRIGIR_METRICAS_404.sh
./CORRIGIR_METRICAS_404.sh
```

Este script irá:
1. ✅ Verificar se os arquivos estão corretos
2. ✅ Atualizar o código (git pull)
3. ✅ Compilar o backend
4. ✅ Reiniciar o PM2
5. ✅ Testar os endpoints

### Opção 2: Manual (Passo a Passo)

Execute os seguintes comandos no servidor:

```bash
# 1. Navegar para o diretório do projeto
cd /var/www/sispat

# 2. Atualizar código
git pull origin main

# 3. Compilar backend
cd backend
npm run build

# 4. Verificar se compilou corretamente
ls -la dist/index.js

# 5. Reiniciar PM2
pm2 restart sispat-backend

# 6. Aguardar 5 segundos
sleep 5

# 7. Verificar status
pm2 status

# 8. Ver logs
pm2 logs sispat-backend --lines 30
```

### Opção 3: Se o PM2 não reiniciar corretamente

```bash
cd /var/www/sispat/backend

# Parar completamente
pm2 stop sispat-backend
pm2 delete sispat-backend

# Aguardar
sleep 2

# Recompilar
npm run build

# Iniciar novamente
pm2 start ecosystem.config.js --env production

# Salvar configuração
pm2 save
```

## 🧪 Verificar se Funcionou

### Teste 1: Verificar se o endpoint existe (deve retornar 401 ou 403, NÃO 404)

```bash
curl -v http://localhost:3000/api/metrics/summary
```

**Esperado:**
- ✅ Status 401 ou 403 = Rota existe e está protegida (CORRETO)
- ❌ Status 404 = Rota não encontrada (PROBLEMA)

### Teste 2: Verificar logs do PM2

```bash
pm2 logs sispat-backend --lines 50 | grep -i "metrics\|route"
```

Deve mostrar mensagens de inicialização das rotas.

### Teste 3: Testar no frontend

1. Faça login como supervisor
2. Acesse `/admin/metrics`
3. Deve carregar as métricas (não deve mais dar 404)

## 🔍 Diagnóstico

Se o problema persistir, verifique:

### 1. O arquivo foi compilado corretamente?

```bash
cd /var/www/sispat/backend
grep -r "metricsRoutes" dist/
```

Deve encontrar referências ao arquivo de rotas.

### 2. O PM2 está rodando a versão correta?

```bash
pm2 describe sispat-backend | grep "script path"
```

Deve apontar para `dist/index.js`.

### 3. Há erros na compilação?

```bash
cd /var/www/sispat/backend
npm run build 2>&1 | tail -50
```

Não deve haver erros de TypeScript.

### 4. O backend está realmente rodando?

```bash
curl http://localhost:3000/api/health
```

Deve retornar status 200.

## 📝 Arquivos Modificados

- ✅ `backend/src/routes/metricsRoutes.ts` - Adicionado `supervisor` às permissões
- ✅ `backend/src/index.ts` - Já registra as rotas corretamente

## ⚠️ Importante

Após qualquer alteração no código TypeScript do backend, é **OBRIGATÓRIO**:

1. Compilar: `npm run build`
2. Reiniciar PM2: `pm2 restart sispat-backend`

O PM2 não recompila automaticamente o código TypeScript!

