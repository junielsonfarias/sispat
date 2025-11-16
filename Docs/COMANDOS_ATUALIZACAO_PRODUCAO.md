# 📥 Comandos para Atualizar Produção via Git

## ✅ Correções Aplicadas no Repositório

**Commit:** `02d3940` - fix: Corrigir visualização de imagens em produção - URLs blob inválidas

**Arquivos Modificados:**
- `src/lib/utils.ts` - Validação de URLs blob inválidas
- `src/components/bens/PatrimonioPDFGenerator.tsx` - Tratamento de erros em PDFs
- `Docs/CORRECAO_IMAGENS_PRODUCAO.md` - Documentação completa
- `scripts/deploy-correcao-imagens.sh` - Script automatizado

**Repositório:** `https://github.com/junielsonfarias/sispat.git`  
**Branch:** `main`

---

## 🚀 Comandos para Atualizar em Produção

### Opção 1: Atualização Manual (Recomendado)

```bash
# 1. Conectar ao servidor
ssh usuario@sispat.vps-kinghost.net

# 2. Navegar para o diretório do projeto
cd /var/www/sispat

# 3. Fazer backup do código atual
sudo cp -r frontend frontend.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup criado"

# 4. Atualizar código do repositório
git fetch origin
git pull origin main

# 5. Verificar se a atualização foi bem-sucedida
git log --oneline -1
# Deve mostrar: 02d3940 fix: Corrigir visualização de imagens em produção...

# 6. Rebuild do frontend
cd frontend
npm install  # Apenas se necessário
npm run build

# 7. Verificar se o build foi bem-sucedido
ls -lh dist/ | head -5

# 8. Reiniciar serviços (escolha uma opção)

# Opção A: Se estiver usando PM2
pm2 restart sispat-frontend
pm2 status

# Opção B: Se estiver usando Nginx diretamente
sudo systemctl reload nginx
sudo systemctl status nginx

# 9. Verificar logs (opcional)
pm2 logs sispat-frontend --lines 20
# OU
sudo tail -f /var/log/nginx/error.log
```

### Opção 2: Usando o Script Automatizado

```bash
# 1. Conectar ao servidor
ssh usuario@sispat.vps-kinghost.net

# 2. Navegar para o diretório do projeto
cd /var/www/sispat

# 3. Atualizar código primeiro
git fetch origin
git pull origin main

# 4. Dar permissão de execução ao script (se necessário)
chmod +x scripts/deploy-correcao-imagens.sh

# 5. Executar o script
./scripts/deploy-correcao-imagens.sh

# 6. Reiniciar serviços
pm2 restart sispat-frontend
# OU
sudo systemctl reload nginx
```

---

## 📋 Checklist de Atualização

Execute os comandos na ordem e marque cada item:

- [ ] **Backup criado** - Código atual salvo em backup
- [ ] **Git pull executado** - Código atualizado do repositório
- [ ] **Commit verificado** - Último commit é `02d3940`
- [ ] **Build executado** - `npm run build` concluído sem erros
- [ ] **Arquivos verificados** - Diretório `dist/` criado com sucesso
- [ ] **Serviço reiniciado** - PM2 ou Nginx reiniciado
- [ ] **Teste realizado** - Acessar bem cadastrado e verificar imagens
- [ ] **Console verificado** - Sem erros 404 no console do navegador
- [ ] **PDF testado** - Geração de PDF funciona sem erros

---

## 🔍 Verificações Pós-Deploy

### 1. Verificar se o código foi atualizado

```bash
cd /var/www/sispat
git log --oneline -1
# Deve mostrar: 02d3940 fix: Corrigir visualização de imagens...
```

### 2. Verificar se o build foi bem-sucedido

```bash
cd /var/www/sispat/frontend
ls -lh dist/assets/*.js | head -3
# Deve mostrar arquivos JavaScript compilados
```

### 3. Verificar se a correção está presente

```bash
cd /var/www/sispat/frontend
grep -r "blob-" dist/assets/*.js | grep -i "invalid\|placeholder" | head -1
# Deve encontrar referências à validação de URLs blob
```

### 4. Testar no navegador

1. Acesse: `https://sispat.vps-kinghost.net`
2. Faça login no sistema
3. Vá para um bem cadastrado que tenha imagens
4. Verifique:
   - ✅ Imagens válidas aparecem normalmente
   - ✅ Imagens inválidas mostram placeholder (não erro 404)
   - ✅ Console do navegador sem erros 404
   - ✅ Geração de PDF funciona sem erros

### 5. Limpar cache do navegador

**Importante:** Os usuários precisam limpar o cache para ver as correções:

- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`
- **Ou:** Limpar cache manualmente nas configurações do navegador

---

## 🐛 Troubleshooting

### Problema: Git pull falha com "Your local changes would be overwritten"

**Solução:**
```bash
# Fazer stash das alterações locais
git stash

# Fazer pull
git pull origin main

# Se necessário, aplicar alterações locais depois
git stash pop
```

### Problema: Build falha

**Solução:**
```bash
cd /var/www/sispat/frontend

# Limpar cache e node_modules
rm -rf node_modules package-lock.json
npm cache clean --force

# Reinstalar dependências
npm install

# Tentar build novamente
npm run build
```

### Problema: Serviço não reinicia

**Solução:**
```bash
# Verificar status do PM2
pm2 status
pm2 logs sispat-frontend --lines 50

# Verificar status do Nginx
sudo systemctl status nginx
sudo nginx -t  # Verificar configuração

# Reiniciar manualmente
pm2 restart all
# OU
sudo systemctl restart nginx
```

### Problema: Imagens ainda não aparecem

**Solução:**
1. Verificar se o build foi bem-sucedido:
   ```bash
   ls -lh /var/www/sispat/frontend/dist/
   ```

2. Verificar se o Nginx está servindo os arquivos corretos:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. Limpar cache do navegador (Ctrl+Shift+R)

4. Verificar console do navegador para erros específicos

---

## 📊 Informações do Commit

```
Commit: 02d3940
Mensagem: fix: Corrigir visualização de imagens em produção - URLs blob inválidas

Arquivos alterados:
- src/lib/utils.ts (validação de URLs blob)
- src/components/bens/PatrimonioPDFGenerator.tsx (tratamento de erros)
- Docs/CORRECAO_IMAGENS_PRODUCAO.md (documentação)
- scripts/deploy-correcao-imagens.sh (script de deploy)

Linhas alteradas: +399, -4
```

---

## ⚠️ Importante

1. **Sempre fazer backup** antes de atualizar
2. **Testar em ambiente de desenvolvimento** primeiro (se possível)
3. **Fazer deploy em horário de baixo tráfego** (se aplicável)
4. **Comunicar usuários** sobre necessidade de limpar cache
5. **Monitorar logs** após o deploy

---

## 📞 Suporte

Se encontrar problemas durante o deploy:

1. Verificar logs: `pm2 logs` ou `sudo journalctl -u nginx`
2. Reverter para backup: `cp -r frontend.backup.* frontend`
3. Consultar documentação: `Docs/CORRECAO_IMAGENS_PRODUCAO.md`

---

**Última atualização:** $(date +%Y-%m-%d)  
**Versão:** 2.0.x  
**Status:** ✅ Pronto para Deploy

