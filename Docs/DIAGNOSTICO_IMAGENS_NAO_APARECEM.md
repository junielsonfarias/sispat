# 🔍 Diagnóstico - Imagens Não Aparecem Após Upload

## 📋 Problema

Após salvar uma nova imagem no cadastro de bem, a imagem não aparece na visualização.

## 🔍 Passos de Diagnóstico

### 1. Verificar se o arquivo foi salvo no servidor

```bash
# Conectar ao servidor
ssh usuario@sispat.vps-kinghost.net

# Verificar se a pasta uploads existe
ls -la /var/www/sispat/backend/uploads/

# Verificar arquivos recentes
ls -lht /var/www/sispat/backend/uploads/ | head -10

# Verificar permissões
ls -la /var/www/sispat/backend/uploads/ | head -5
```

**O que verificar:**
- ✅ Pasta `uploads/` existe
- ✅ Arquivos com extensão `.jpg`, `.png`, etc. estão presentes
- ✅ Permissões: `www-data` ou `nginx` deve ter acesso

### 2. Verificar permissões da pasta uploads

```bash
# Verificar proprietário e permissões
ls -ld /var/www/sispat/backend/uploads/

# Se necessário, corrigir permissões
sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
sudo chmod -R 755 /var/www/sispat/backend/uploads/
```

### 3. Verificar configuração do Nginx

```bash
# Verificar configuração do Nginx
sudo cat /etc/nginx/sites-available/sispat | grep -A 5 "location /uploads"

# OU
sudo cat /etc/nginx/conf.d/sispat.conf | grep -A 5 "location /uploads"
```

**Deve conter:**
```nginx
location /uploads/ {
    alias /var/www/sispat/backend/uploads/;
    expires 1y;
    add_header Cache-Control "public";
}
```

### 4. Testar acesso direto à imagem

Após fazer upload, pegue o nome do arquivo do console do navegador e teste:

```bash
# No servidor, verificar se o arquivo existe
ls -lh /var/www/sispat/backend/uploads/NOME_DO_ARQUIVO.jpg

# Testar acesso via curl (no servidor)
curl -I http://localhost/uploads/NOME_DO_ARQUIVO.jpg

# OU testar URL completa
curl -I https://sispat.vps-kinghost.net/uploads/NOME_DO_ARQUIVO.jpg
```

### 5. Verificar logs do backend

```bash
# Verificar logs do PM2
pm2 logs sispat-backend --lines 50 | grep -i upload

# OU verificar logs do sistema
sudo journalctl -u sispat-backend -n 50 | grep -i upload

# Verificar se há erros
pm2 logs sispat-backend --err --lines 50
```

### 6. Verificar no console do navegador

Após fazer upload e tentar visualizar:

1. Abra o console do navegador (F12)
2. Vá para a aba "Network"
3. Filtre por "Img" ou "uploads"
4. Tente visualizar o bem novamente
5. Verifique:
   - Qual URL está sendo requisitada
   - Status da requisição (200, 404, etc.)
   - Headers da resposta

### 7. Verificar variável VITE_API_URL

```bash
# No servidor, verificar .env do frontend
cat /var/www/sispat/.env.production | grep VITE_API_URL

# OU se estiver na raiz
cat /var/www/sispat/frontend/.env.production | grep VITE_API_URL
```

**Deve ser:**
```
VITE_API_URL=https://sispat.vps-kinghost.net/api
# OU
VITE_API_URL=http://sispat.vps-kinghost.net/api
```

## 🔧 Correções Aplicadas

### 1. **Melhoria na Construção de URL**

O código agora:
- Usa `window.location.origin` em produção se `VITE_API_URL` não tiver protocolo
- Adiciona logs de debug para rastrear problemas
- Melhora tratamento de erros

### 2. **Logs de Debug**

O console do navegador agora mostra:
- URL original do arquivo
- URL final construída
- Erros detalhados se a imagem não carregar

## 🚀 Comandos para Aplicar Correção

```bash
# 1. Atualizar código
cd /var/www/sispat
git pull origin main

# 2. Rebuild frontend
npm run build

# 3. Verificar permissões
sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
sudo chmod -R 755 /var/www/sispat/backend/uploads/

# 4. Recarregar Nginx
sudo systemctl reload nginx

# 5. Reiniciar backend (se necessário)
pm2 restart sispat-backend
```

## 📊 Verificação Rápida

Execute este script para verificar tudo:

```bash
#!/bin/bash
echo "🔍 Verificando configuração de imagens..."
echo ""

echo "1. Pasta uploads existe?"
ls -ld /var/www/sispat/backend/uploads/ && echo "✅ Sim" || echo "❌ Não"

echo ""
echo "2. Permissões da pasta:"
ls -ld /var/www/sispat/backend/uploads/

echo ""
echo "3. Arquivos na pasta:"
ls -lh /var/www/sispat/backend/uploads/ | head -5

echo ""
echo "4. Configuração Nginx:"
sudo grep -A 3 "location /uploads" /etc/nginx/sites-available/sispat 2>/dev/null || \
sudo grep -A 3 "location /uploads" /etc/nginx/conf.d/sispat.conf 2>/dev/null || \
echo "❌ Configuração não encontrada"

echo ""
echo "5. VITE_API_URL:"
cat /var/www/sispat/.env.production 2>/dev/null | grep VITE_API_URL || \
cat /var/www/sispat/frontend/.env.production 2>/dev/null | grep VITE_API_URL || \
echo "❌ Não encontrado"

echo ""
echo "✅ Verificação concluída!"
```

## 🐛 Problemas Comuns e Soluções

### Problema: Arquivo não existe no servidor

**Causa:** Upload falhou ou arquivo foi deletado

**Solução:**
```bash
# Verificar logs do backend
pm2 logs sispat-backend --lines 100 | grep -i "upload\|error"

# Verificar se há espaço em disco
df -h

# Verificar se a pasta existe
ls -la /var/www/sispat/backend/uploads/
```

### Problema: 403 Forbidden ao acessar /uploads/

**Causa:** Permissões incorretas

**Solução:**
```bash
sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
sudo chmod -R 755 /var/www/sispat/backend/uploads/
sudo systemctl reload nginx
```

### Problema: 404 Not Found ao acessar /uploads/

**Causa:** Nginx não está configurado corretamente

**Solução:**
```bash
# Verificar configuração
sudo nginx -t

# Verificar se location /uploads/ está configurado
sudo grep -A 5 "location /uploads" /etc/nginx/sites-available/sispat

# Recarregar Nginx
sudo systemctl reload nginx
```

### Problema: URL incorreta sendo construída

**Causa:** `VITE_API_URL` não configurado ou incorreto

**Solução:**
```bash
# Verificar .env.production
cat /var/www/sispat/.env.production | grep VITE_API_URL

# Deve ser:
# VITE_API_URL=https://sispat.vps-kinghost.net/api
# OU
# VITE_API_URL=http://sispat.vps-kinghost.net/api

# Se não estiver correto, editar e rebuild:
nano /var/www/sispat/.env.production
npm run build
```

## 📝 Checklist de Verificação

- [ ] Pasta `uploads/` existe e tem permissões corretas
- [ ] Arquivos estão sendo salvos (verificar com `ls`)
- [ ] Nginx está configurado para servir `/uploads/`
- [ ] Permissões da pasta estão corretas (`www-data:www-data`)
- [ ] `VITE_API_URL` está configurado corretamente
- [ ] Frontend foi rebuildado após atualizações
- [ ] Nginx foi recarregado
- [ ] Backend está rodando (PM2 status)
- [ ] Console do navegador mostra URLs corretas
- [ ] Network tab mostra requisições para `/uploads/`

## 🔄 Próximos Passos

1. **Atualizar código:**
   ```bash
   cd /var/www/sispat
   git pull origin main
   npm run build
   ```

2. **Verificar permissões:**
   ```bash
   sudo chown -R www-data:www-data /var/www/sispat/backend/uploads/
   ```

3. **Recarregar serviços:**
   ```bash
   sudo systemctl reload nginx
   pm2 restart sispat-backend
   ```

4. **Testar upload:**
   - Fazer upload de nova imagem
   - Verificar console do navegador (F12)
   - Verificar Network tab para ver URL requisitada
   - Verificar se arquivo existe no servidor

---

**Última atualização:** $(date +%Y-%m-%d)  
**Commit:** `e449596` - fix: Melhorar construção de URLs de imagens

