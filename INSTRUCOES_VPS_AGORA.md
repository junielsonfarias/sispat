# 🚀 EXECUTE NO SERVIDOR AGORA

**Problema:** Git pull bloqueado por mudanças locais

---

## ✅ SOLUÇÃO (Execute no servidor SSH)

```bash
# 1. Descartar mudanças locais e atualizar
cd /var/www/sispat
git reset --hard HEAD
git pull origin main

# 2. Dar permissão de execução
chmod +x install-low-memory.sh

# 3. Executar instalador corrigido
./install-low-memory.sh
```

---

## 📋 COMANDOS COMPLETOS (Copie e Cole)

```bash
cd /var/www/sispat && git reset --hard HEAD && git pull origin main && chmod +x install-low-memory.sh && ./install-low-memory.sh
```

**Este comando único vai:**
1. ✅ Descartar mudanças locais
2. ✅ Baixar versão corrigida
3. ✅ Dar permissão de execução
4. ✅ Executar instalação

---

## ⏱️ O QUE ESPERAR

```
[7/10] Instalando dependências do frontend...
  ⏱️  Isso pode demorar 3-5 minutos...
Packages: +310
✅ Dependências do frontend instaladas

[8/10] Compilando frontend...
  ⏱️  Isso pode demorar 5-10 minutos...
  ☕ Esta é a hora do café!
vite v5.4.20 building for production...
✓ 1234 modules transformed.
✅ Frontend compilado com sucesso

[9/10] Backend...
✅ Backend compilado com sucesso

[10/10] Iniciando aplicação...
✅ INSTALAÇÃO CONCLUÍDA!
```

**Tempo total: 15-20 minutos**

---

**Cole o comando acima no servidor SSH e aguarde! 🚀**

