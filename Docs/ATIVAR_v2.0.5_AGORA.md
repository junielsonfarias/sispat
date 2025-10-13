# ⚡ ATIVAR v2.0.5 AGORA - GUIA RÁPIDO

**Versão:** 2.0.5  
**Data:** 11 de Outubro de 2025

---

## 🎯 O QUE FOI IMPLEMENTADO

```
✅ /api/transferencias (criar, aprovar, rejeitar)
✅ /api/documentos (CRUD completo)
✅ /api/patrimonios/gerar-numero (geração atômica)
✅ 4 hooks React Query (use-transferencias, use-documentos, use-inventarios)
✅ 2 migrations SQL (normalização + responsibleSectors)
```

---

## 🚀 COMANDOS PARA PRODUÇÃO

### **1. Atualizar Código:**
```powershell
# No repositório local
git add .
git commit -m "feat: implementar melhorias v2.0.5 - transferencias, documentos, numero patrimonial"
git push origin main
```

### **2. No Servidor (SSH):**
```bash
cd /var/www/sispat

# Puxar alterações
git pull origin main

# Backend
cd backend
npm install
npm run build

# Reiniciar
pm2 restart backend
pm2 restart frontend

# Verificar
pm2 logs backend --lines 50
pm2 logs frontend --lines 20
```

---

## ✅ VERIFICAR FUNCIONAMENTO

### **1. Testar Endpoint de Transferências:**
```bash
# Listar transferências
curl http://localhost:3000/api/transferencias \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta esperada:
{
  "transferencias": [],
  "pagination": { "page": 1, "limit": 50, "total": 0, "pages": 0 }
}
```

### **2. Testar Endpoint de Documentos:**
```bash
# Listar documentos (sem resultados se não houver)
curl http://localhost:3000/api/documentos \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta esperada:
{
  "documentos": []
}
```

### **3. Testar Geração de Número Patrimonial:**
```bash
# Gerar número
curl http://localhost:3000/api/patrimonios/gerar-numero?prefix=PAT&year=2025 \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta esperada:
{
  "numero": "PAT-2025-0001",
  "year": 2025,
  "sequencial": 1
}
```

---

## 🔍 LOGS ESPERADOS

### **Backend (pm2 logs backend):**
```
[HTTP] ✅ GET /api/transferencias 200
[HTTP] ✅ GET /api/documentos 200
[HTTP] ✅ GET /api/patrimonios/gerar-numero 200
```

### **Erros Comuns:**
```
❌ Cannot find module './routes/transferenciaRoutes'
   → Solução: npm run build no backend

❌ 404 Not Found /api/transferencias
   → Solução: Verificar se backend foi reiniciado

❌ TypeError: api.get is not a function
   → Solução: Verificar imports no frontend
```

---

## 📋 CHECKLIST DE ATIVAÇÃO

```
Backend:
□ git pull
□ npm install (backend)
□ npm run build (backend)
□ pm2 restart backend
□ Verificar logs (sem erros)

Frontend:
□ pm2 restart frontend
□ Acessar aplicação no navegador
□ Login funcionando
□ Console sem erros críticos

Testes:
□ Endpoint /api/transferencias responde
□ Endpoint /api/documentos responde
□ Endpoint /api/patrimonios/gerar-numero responde
□ HTTP 200 em todos
```

---

## 🆘 SE ALGO DER ERRADO

### **Rollback Rápido:**
```bash
cd /var/www/sispat

# Voltar para commit anterior
git log --oneline -5
git reset --hard COMMIT_ANTERIOR

# Recompilar
cd backend
npm run build
pm2 restart all

# Verificar
pm2 logs backend --lines 30
```

### **Verificar Status:**
```bash
pm2 status
pm2 logs backend --lines 50 --err
pm2 logs frontend --lines 20
```

---

## 📝 MIGRATIONS (OPCIONAL - NÃO URGENTE)

### **⚠️ Aplicar apenas em staging primeiro!**

```bash
# Staging
psql -U postgres -d sispat_staging \
  -f backend/migrations-plan/02_normalizar_campos_duplicados.sql

psql -U postgres -d sispat_staging \
  -f backend/migrations-plan/03_responsible_sectors_ids.sql

# Verificar warnings e counts
# Testar aplicação
# Se OK, aplicar em produção
```

---

## ✅ SUCESSO

Se você vir:
```
✅ pm2 status: backend online
✅ pm2 status: frontend online
✅ Logs sem erros críticos
✅ Endpoints respondem HTTP 200
✅ Frontend acessível no navegador
```

**🎉 v2.0.5 ATIVADA COM SUCESSO!**

---

## 📞 PRÓXIMOS PASSOS

1. Testar criação de transferência no frontend
2. Testar upload de documento no frontend
3. Testar criação de patrimônio (número gerado automaticamente)
4. Monitorar logs por 24h
5. Aplicar migrations em staging (quando apropriado)

---

**Equipe SISPAT**  
Versão 2.0.5  
11 de Outubro de 2025 🚀


