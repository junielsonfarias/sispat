# ⚡ RESOLVER ERRO 500 - GUIA RÁPIDO

## 🎯 Problema: Erro 500 ao criar template

---

## ✅ SOLUÇÃO EM 3 PASSOS

### **📌 PASSO 1: Execute o Script Automático**

```powershell
.\ATUALIZAR-BANCO-FICHAS.ps1
```

**O script fará automaticamente:**
- ✅ Parar o sistema
- ✅ Gerar Prisma Client
- ✅ Criar tabela no banco
- ✅ Criar templates padrão
- ✅ Iniciar sistema novamente

**Tempo:** ~2 minutos

---

### **📌 PASSO 2: Aguarde o Sistema Iniciar**

**Aguarde até ver:**
```
✅ Backend rodando na porta 3000
✅ Frontend rodando na porta 8080
✅ Navegador aberto
```

**Tempo:** ~30 segundos

---

### **📌 PASSO 3: Teste o Gerenciador**

1. Faça login
2. Menu → Ferramentas → Gerenciador de Fichas
3. Clique em "Novo Template"
4. Preencha o formulário
5. Clique em "Salvar"

**✅ DEVE FUNCIONAR!**

---

## 🔧 SOLUÇÃO MANUAL (Se preferir)

```powershell
# 1. Parar sistema
.\PARAR-SISTEMA.ps1

# 2. Atualizar banco
cd backend
npx prisma generate
npx prisma migrate dev --name add_ficha_templates
npx prisma db seed

# 3. Iniciar sistema
cd ..
.\INICIAR-SISTEMA-COMPLETO.ps1
```

---

## ⚠️ SE DER ERRO

### **Erro de .env duplicado**
✅ **PODE IGNORAR** - É apenas um aviso

### **Erro de permissão**
✅ **Execute como Administrador**

### **Erro de porta ocupada**
✅ **Execute:** `.\PARAR-SISTEMA.ps1` primeiro

---

## 🎉 PRONTO!

Após executar o script, o Gerenciador de Fichas funcionará **100%**!

**Tempo total:** ~3 minutos

---

## 📞 Ajuda Rápida

**Problema persiste?**
- 📖 Veja: `SOLUCAO-ERRO-500-FICHA-TEMPLATES.md`
- 📖 Ou: `GERENCIADOR-FICHAS-IMPLEMENTACAO.md`

**Tudo OK?**
- 🎉 Comece a criar templates personalizados!

---

**Execute o script e pronto!** ⚡
