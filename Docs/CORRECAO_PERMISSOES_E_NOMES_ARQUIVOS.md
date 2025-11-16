# 🔧 Correção: Permissões e Nomes de Arquivos

## 📋 Problema Identificado

O arquivo `blob-1763332759682-136346627.png` existe no servidor, mas:

1. **Permissões incorretas**: Arquivo pertence a `root:root` em vez de `www-data:www-data`
2. **Nome ainda com "blob-"**: Arquivo foi salvo como `blob-...` mesmo após a correção

## ✅ Solução

### 1. Corrigir Permissões

Execute no servidor:

```bash
# Opção 1: Script automatizado
cd /var/www/sispat
git pull origin main
chmod +x scripts/corrigir-permissoes-uploads.sh
sudo ./scripts/corrigir-permissoes-uploads.sh

# Opção 2: Comandos manuais
sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
sudo chmod -R 755 /var/www/sispat/backend/uploads/
sudo find /var/www/sispat/backend/uploads -type f -exec chmod 644 {} \;
```

### 2. Verificar se Backend foi Reiniciado

```bash
# Verificar se o código compilado tem a correção
grep -A 5 "nameWithoutExt = 'image'" /var/www/sispat/backend/dist/middlewares/uploadMiddleware.js

# Se não encontrar, fazer rebuild
cd /var/www/sispat/backend
npm run build
pm2 restart sispat-backend
```

### 3. Verificar Permissões Corrigidas

```bash
ls -lht /var/www/sispat/backend/uploads/ | head -5
# Deve mostrar: www-data www-data (não root root)
```

## 🔍 Diagnóstico

### Verificar se arquivo existe e permissões

```bash
ls -lh /var/www/sispat/backend/uploads/blob-1763332759682-136346627.png
```

**Antes da correção:**
```
-rw-r--r-- 1 root root 85K Nov 16 19:39 blob-1763332759682-136346627.png
```

**Depois da correção:**
```
-rw-r--r-- 1 www-data www-data 85K Nov 16 19:39 blob-1763332759682-136346627.png
```

### Testar acesso via Nginx

```bash
# Testar se Nginx consegue acessar
sudo -u www-data test -r /var/www/sispat/backend/uploads/blob-1763332759682-136346627.png && echo "OK" || echo "ERRO"
```

## 🎯 Resultado Esperado

Após corrigir as permissões:

1. ✅ Arquivo acessível pelo Nginx
2. ✅ Imagem aparece no navegador (sem erro 404)
3. ✅ Novos uploads terão permissões corretas automaticamente

## ⚠️ Importante

- **Arquivos antigos** precisam ter permissões corrigidas manualmente
- **Novos uploads** devem ter permissões corretas se o backend estiver rodando como `www-data`
- Se o backend rodar como `root`, os arquivos serão criados como `root` e precisarão correção

## 🔄 Prevenção Futura

Para evitar o problema de permissões:

1. **Executar backend como www-data** (recomendado):
   ```bash
   pm2 start backend/dist/index.js --name sispat-backend --user www-data
   ```

2. **Ou usar um script de inicialização** que corrige permissões automaticamente

3. **Ou configurar um cron job** para corrigir permissões periodicamente

