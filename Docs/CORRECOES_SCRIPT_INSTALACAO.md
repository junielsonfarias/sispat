# 📋 Correções Aplicadas no Script de Instalação

**Data:** 19/11/2025  
**Arquivo:** `install.sh`

---

## ✅ **CORREÇÕES APLICADAS**

### **1. Permissões de Uploads e Logs** ✅

**Problema:** Diretórios criados sem permissões específicas para arquivos.

**Correção:**
- Diretórios: `755` (rwxr-xr-x)
- Arquivos: `644` (rw-r--r--)
- Proprietário: `www-data:www-data`

**Localização:** `configure_permissions()`

```bash
# Diretórios: 755
chmod 755 "$INSTALL_DIR/backend/uploads"
chmod 755 "$INSTALL_DIR/backend/logs"

# Arquivos em uploads: 644
find "$INSTALL_DIR/backend/uploads" -type f -exec chmod 644 {} \;
find "$INSTALL_DIR/backend/uploads" -type d -exec chmod 755 {} \;

# Arquivos em logs: 644
find "$INSTALL_DIR/backend/logs" -type f -exec chmod 644 {} \;
find "$INSTALL_DIR/backend/logs" -type d -exec chmod 755 {} \;
```

---

### **2. PM2 com Usuário www-data** ✅

**Problema:** PM2 rodando como root, causando problemas de permissão.

**Correção:**
- Verificar se existe `ecosystem.config.js`
- Iniciar PM2 com `--user www-data`
- Fallback para iniciar diretamente como www-data

**Localização:** `start_application()`

```bash
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production --name sispat-backend --user www-data
else
    pm2 start dist/index.js --name sispat-backend --user www-data
fi
```

---

### **3. Restauração de Uploads com Permissões Corretas** ✅

**Problema:** Uploads restaurados sem permissões específicas.

**Correção:**
- Aplicar mesmas permissões do `configure_permissions()`
- Garantir `www-data:www-data` e `755/644`

**Localização:** `restore_uploads()`

```bash
chown -R www-data:www-data "$INSTALL_DIR/backend/uploads"
chmod 755 "$INSTALL_DIR/backend/uploads"
find "$INSTALL_DIR/backend/uploads" -type f -exec chmod 644 {} \;
find "$INSTALL_DIR/backend/uploads" -type d -exec chmod 755 {} \;
```

---

### **4. Verificação de Permissões na Instalação** ✅

**Problema:** Instalação não verificava permissões após configuração.

**Correção:**
- Adicionar verificação de permissões de uploads e logs
- Verificar usuário do processo PM2
- Verificar ordem de locations no Nginx
- Testar acesso a `/uploads` via Nginx

**Localização:** `verify_installation()`

**Novas verificações:**
- `[10/14]` Verificar permissões de uploads e logs
- `[11/14]` Verificar usuário do processo PM2
- `[14/14]` Verificar acesso a uploads via Nginx

---

### **5. Verificação de Configuração do Nginx** ✅

**Problema:** Não verificava ordem correta de locations.

**Correção:**
- Verificar se `/api` vem antes de `/uploads`
- Verificar se `location ^~ /uploads` existe
- Testar acesso a uploads via HTTP

**Localização:** `verify_installation()`

```bash
# Verificar ordem de locations
local api_line=$(grep -n "location /api" /etc/nginx/sites-enabled/sispat | head -1 | cut -d: -f1)
local uploads_line=$(grep -n "location ^~ /uploads" /etc/nginx/sites-enabled/sispat | head -1 | cut -d: -f1)
if [ "$api_line" -lt "$uploads_line" ]; then
    success "Nginx configurado corretamente (ordem de locations OK)"
fi
```

---

## 📝 **CONFIGURAÇÕES DO NGINX (JÁ CORRETAS)**

O script já configura o Nginx corretamente:

1. ✅ **Ordem de locations:**
   - `/api` antes de `/uploads`
   - `/uploads` com `^~` antes de `~* \.(...)`

2. ✅ **Configuração `/uploads`:**
   - `location ^~ /uploads`
   - `alias` com trailing slash
   - `access_log off;`
   - `client_max_body_size 10M;`

3. ✅ **Teste de sintaxe:**
   - `nginx -t` antes de recarregar
   - Remoção de backups do Nginx

---

## 🔍 **VERIFICAÇÕES ADICIONADAS**

### **Durante a Instalação:**
1. ✅ Verificar status do PM2 após iniciar
2. ✅ Verificar permissões de diretórios criados
3. ✅ Testar health check da API

### **Após a Instalação:**
1. ✅ Verificar permissões de uploads (www-data:www-data, 755)
2. ✅ Verificar permissões de logs (www-data:www-data, 755)
3. ✅ Verificar usuário do processo PM2
4. ✅ Verificar ordem de locations no Nginx
5. ✅ Testar acesso a `/uploads` via Nginx

---

## 🎯 **RESULTADO ESPERADO**

Após a instalação, o sistema deve ter:

1. ✅ **Permissões corretas:**
   - Uploads: `www-data:www-data`, `755` (dirs), `644` (files)
   - Logs: `www-data:www-data`, `755` (dirs), `644` (files)

2. ✅ **PM2 rodando:**
   - Processo como `www-data` ou `root` (aceitável)
   - Auto-start configurado

3. ✅ **Nginx configurado:**
   - Ordem correta de locations
   - `/uploads` acessível via HTTP
   - `/api` funcionando

4. ✅ **Backend funcionando:**
   - Health check respondendo (HTTP 200)
   - Uploads salvando com permissões corretas
   - Logs sendo escritos corretamente

---

## 📚 **REFERÊNCIAS**

- `Docs/ANALISE_SEGURANCA_UPLOAD_IMAGENS.md` - Análise completa do fluxo de upload
- `scripts/setup-server.sh` - Script de setup do servidor (também atualizado)
- `scripts/corrigir-permissoes-logs.sh` - Script de correção manual

---

## ✅ **PRÓXIMOS PASSOS**

1. ✅ Testar instalação em servidor limpo
2. ✅ Verificar se todas as verificações passam
3. ✅ Confirmar que uploads funcionam corretamente
4. ✅ Confirmar que logs são escritos corretamente

---

**Status:** ✅ **TODAS AS CORREÇÕES APLICADAS**
