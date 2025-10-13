# 🚀 COMANDOS PARA DEPLOY DAS MELHORIAS MOBILE

**Data:** 10 de Outubro de 2025  
**Versão:** 2.0.1

---

## 📦 DEPLOY EM PRODUÇÃO

### 1. **Backup do Sistema Atual**

```bash
# Fazer backup do banco de dados
cd /var/www/sispat/backend
node -e "require('./scripts/backup-database.js')"

# Ou usar o script de backup
cd /var/www/sispat
./scripts/backup-sispat.sh
```

### 2. **Atualizar Código do Repositório**

```bash
# Navegar para o diretório
cd /var/www/sispat

# Verificar status atual
git status

# Salvar alterações locais (se houver)
git stash

# Atualizar código
git pull origin main

# Restaurar alterações locais (se necessário)
git stash pop
```

### 3. **Instalar Dependências (se necessário)**

```bash
# Frontend
cd /var/www/sispat
npm install

# Backend
cd /var/www/sispat/backend
npm install
```

### 4. **Rebuild do Frontend**

```bash
# Navegar para o diretório raiz
cd /var/www/sispat

# Limpar build anterior
rm -rf dist

# Rebuild com otimizações
npm run build

# Verificar se o build foi criado
ls -lh dist/
```

### 5. **Reiniciar Backend**

```bash
# Reiniciar backend com PM2
cd /var/www/sispat/backend
pm2 restart sispat-backend

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs sispat-backend --lines 50
```

### 6. **Verificar Nginx (se aplicável)**

```bash
# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx

# Ver status
sudo systemctl status nginx
```

### 7. **Limpar Cache do Navegador**

Após o deploy, instruir usuários a:
- **Chrome/Edge:** `Ctrl + Shift + Delete` → Limpar cache
- **Safari iOS:** Ajustes → Safari → Limpar Histórico
- **Firefox:** `Ctrl + Shift + Delete` → Limpar cache

---

## 🧪 TESTAR MELHORIAS

### 1. **Teste Rápido no Desktop**

```bash
# Abrir no navegador com DevTools
# 1. Abrir http://seu-dominio.com
# 2. Pressionar F12
# 3. Clicar no ícone de dispositivo móvel
# 4. Selecionar "iPhone 12 Pro"
# 5. Testar navegação
```

### 2. **Teste em Dispositivo Real**

```bash
# Acessar do smartphone:
# 1. Abrir navegador (Chrome/Safari)
# 2. Acessar http://seu-dominio.com
# 3. Fazer login
# 4. Verificar:
#    ✅ Header compacto (64px)
#    ✅ Botão de menu (hamburguer) visível
#    ✅ Bottom navigation funcionando
#    ✅ Touch targets grandes (≥44px)
#    ✅ Formulários com campos grandes
```

### 3. **Checklist de Validação**

```bash
✅ Header mobile tem 64px de altura
✅ Botão hamburguer está visível no canto esquerdo
✅ Bottom navigation tem 5 itens
✅ Bottom navigation não cobre conteúdo
✅ Listas mostram cards em mobile
✅ Formulários têm campos grandes (48px)
✅ Todos os botões são clicáveis facilmente
✅ Menu lateral abre com o hamburguer
✅ Transições são suaves
✅ Cores e temas estão corretos
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: CSS não atualizado

```bash
# Limpar cache do vite
cd /var/www/sispat
rm -rf node_modules/.vite
npm run build
```

### Problema 2: Menu não abre

```bash
# Verificar console do navegador (F12)
# Procurar por erros JavaScript
# Verificar se MobileNavigation está importado no Header

# Ver logs do backend
pm2 logs sispat-backend --err --lines 100
```

### Problema 3: Bottom navigation não aparece

```bash
# Verificar se o componente está sendo renderizado
# No Header.tsx deve ter: <BottomNavigation />
# Verificar classes CSS: .mobile-only .fixed .bottom-0

# Rebuild forçado
cd /var/www/sispat
npm run build -- --force
```

### Problema 4: Layout quebrado

```bash
# Verificar se o Tailwind CSS está processando
# Ver arquivo src/main.css

# Limpar e rebuildar
rm -rf dist
npm run build

# Verificar se não há conflitos de CSS
grep -r "h-24" src/components/Header.tsx
# Deve retornar apenas linhas de tablet/desktop
```

---

## 📊 MONITORAMENTO PÓS-DEPLOY

### 1. **Verificar Logs**

```bash
# Logs do PM2 em tempo real
pm2 logs sispat-backend

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs do sistema
sudo journalctl -u nginx -f
```

### 2. **Métricas de Performance**

```bash
# Verificar uso de recursos
pm2 monit

# Ver detalhes do processo
pm2 show sispat-backend

# Verificar memória
free -h

# Verificar disco
df -h
```

### 3. **Analytics (se configurado)**

```bash
# Google Analytics
# - Pageviews em dispositivos móveis
# - Tempo médio de sessão
# - Taxa de rejeição

# Logs de acesso
cd /var/www/sispat/backend
grep "mobile" logs/access.log | wc -l
```

---

## 🔐 ROLLBACK (SE NECESSÁRIO)

### Opção 1: Voltar para versão anterior

```bash
# Ver commits recentes
git log --oneline -5

# Voltar para commit específico
git reset --hard <commit-hash>

# Rebuild
npm run build

# Reiniciar backend
pm2 restart sispat-backend
```

### Opção 2: Restaurar backup

```bash
# Restaurar banco de dados
cd /var/www/sispat/backend
node -e "require('./scripts/restore-database.js')"

# Ou usar script de restore
cd /var/www/sispat
./scripts/restore-sispat.sh
```

---

## 📱 COMANDOS ESPECÍFICOS PARA MOBILE

### Testar em diferentes resoluções:

```bash
# Usar Chrome DevTools
# 1. F12 → Device Toolbar
# 2. Testar em:
#    - iPhone SE (375px)
#    - iPhone 12 (390px)
#    - iPhone 14 Pro Max (430px)
#    - Galaxy S21 (360px)
#    - iPad Mini (768px)
```

### Simular conexão lenta:

```bash
# Chrome DevTools → Network
# Throttling: "Fast 3G" ou "Slow 3G"
# Verificar se o app carrega rapidamente
```

### Testar orientações:

```bash
# Device Toolbar → Rotate
# Testar em Portrait e Landscape
# Verificar se o layout se adapta
```

---

## ✅ COMANDO ÚNICO COMPLETO

Para fazer o deploy completo em uma única linha:

```bash
cd /var/www/sispat && git stash && git pull origin main && npm install && npm run build && cd backend && pm2 restart sispat-backend && pm2 status && echo "✅ Deploy concluído! Testar em: http://$(hostname -I | awk '{print $1}')"
```

### Com verificações:

```bash
cd /var/www/sispat && \
echo "🔄 Atualizando código..." && \
git stash && git pull origin main && \
echo "📦 Instalando dependências..." && \
npm install && \
echo "🏗️ Buildando frontend..." && \
npm run build && \
echo "🔄 Reiniciando backend..." && \
cd backend && pm2 restart sispat-backend && \
sleep 3 && \
echo "📊 Status dos processos:" && \
pm2 status && \
echo "" && \
echo "🧪 Testando API..." && \
curl -s http://localhost:3000/api/health | grep -q '"status":"ok"' && \
echo "✅ API funcionando!" || echo "❌ API com problemas" && \
echo "" && \
echo "✅ Deploy concluído!" && \
echo "🌐 Frontend: http://$(hostname -I | awk '{print $1}')" && \
echo "🔌 Backend: http://$(hostname -I | awk '{print $1}'):3000"
```

---

## 🎓 BOAS PRÁTICAS

1. **Sempre fazer backup antes do deploy**
2. **Testar em ambiente de desenvolvimento primeiro**
3. **Fazer deploy em horário de baixo tráfego**
4. **Monitorar logs após o deploy**
5. **Ter plano de rollback preparado**
6. **Comunicar usuários sobre atualizações**
7. **Limpar cache do navegador após deploy**

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verificar logs:**
   ```bash
   pm2 logs sispat-backend --err --lines 100
   ```

2. **Verificar status:**
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

3. **Testar API:**
   ```bash
   curl http://localhost:3000/api/health
   ```

4. **Rollback se necessário:**
   ```bash
   git reset --hard HEAD~1
   npm run build
   pm2 restart sispat-backend
   ```

---

**✅ DEPLOY DAS MELHORIAS MOBILE CONCLUÍDO!**

Agora o SISPAT está otimizado para dispositivos móveis! 📱🎉

