# 🚀 INSTALAÇÃO EM PRODUÇÃO - SISPAT 2.0

**Data:** 09/10/2025  
**Versão:** 2.0.0  
**Status:** ✅ Testado e Funcionando

---

## 📋 PRÉ-REQUISITOS

- **Node.js:** 18.x ou superior
- **PostgreSQL:** 13.x ou superior
- **PM2:** Para gerenciamento de processos
- **Nginx:** Para proxy reverso (opcional)

---

## 🔧 INSTALAÇÃO RÁPIDA

### **1. Clone o repositório:**
```bash
git clone <repository-url>
cd sispat
```

### **2. Execute o script de setup automático:**
```bash
chmod +x backend/scripts/setup-production.sh
./backend/scripts/setup-production.sh
```

### **3. Configure as variáveis de ambiente:**
```bash
cp .env.example .env
nano .env
```

**Variáveis obrigatórias:**
```env
# Banco de dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/sispat"

# JWT
JWT_SECRET="sua-chave-secreta-de-256-bits-aqui"

# Ambiente
NODE_ENV="production"
```

### **4. Iniciar o sistema:**
```bash
# Backend
cd backend
pm2 start src/server.js --name sispat-backend

# Verificar status
pm2 status
pm2 logs sispat-backend
```

---

## 🔧 INSTALAÇÃO MANUAL

### **1. Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push

# Executar correção da tabela customizations
node scripts/fix-customization-table.js

pm2 start src/server.js --name sispat-backend
```

### **2. Frontend:**
```bash
cd ..
npm install
cp src/assets/images/logo-government.svg public/
npm run build
```

### **3. Testar:**
```bash
# Testar API
curl http://localhost:3000/api/health

# Testar customização
curl http://localhost:3000/api/customization/public
```

---

## ✅ CORREÇÕES APLICADAS

### **Problemas Resolvidos:**

1. **✅ Tabela customizations**
   - Adicionadas colunas em camelCase
   - Mapeamento correto entre frontend e backend
   - Logo persiste entre navegadores

2. **✅ Sistema de permissões**
   - Supervisor tem acesso total aos setores
   - Filtros corretos por usuário e setor

3. **✅ Dashboard**
   - Informações do sistema carregando
   - Contabilização de setores criados

4. **✅ Upload de logo**
   - Salva no banco de dados
   - Persiste entre navegadores
   - Persiste entre sessões

### **Estrutura da Tabela customizations:**
```sql
- id (integer, PK)
- municipality_id (varchar, snake_case)
- municipalityId (varchar, camelCase)
- activeLogoUrl (text, camelCase)
- secondaryLogoUrl (text, camelCase)
- primaryColor (varchar, camelCase)
- backgroundColor (varchar, camelCase)
- backgroundType (varchar, camelCase)
- welcomeTitle (text, camelCase)
- welcomeSubtitle (text, camelCase)
- layout (varchar, camelCase)
- browserTitle (varchar, camelCase)
- faviconUrl (text, camelCase)
- prefeituraName (varchar, camelCase)
- secretariaResponsavel (varchar, camelCase)
- departamentoResponsavel (varchar, camelCase)
- updatedAt (timestamp, camelCase)
- created_at (timestamp, snake_case)
- updated_at (timestamp, snake_case)
```

---

## 🔧 COMANDOS ÚTEIS

### **Gerenciamento do Backend:**
```bash
# Iniciar
pm2 start backend/src/server.js --name sispat-backend

# Parar
pm2 stop sispat-backend

# Reiniciar
pm2 restart sispat-backend

# Ver logs
pm2 logs sispat-backend

# Status
pm2 status

# Monitoramento
pm2 monit
```

### **Banco de Dados:**
```bash
# Aplicar migrações
cd backend
npx prisma db push

# Reset do banco (CUIDADO!)
npx prisma db push --force-reset

# Visualizar banco
npx prisma studio
```

### **Correções:**
```bash
# Corrigir tabela customizations
cd backend
node scripts/fix-customization-table.js

# Setup completo
./backend/scripts/setup-production.sh
```

---

## 🧪 TESTES

### **1. Teste de Saúde da API:**
```bash
curl http://localhost:3000/api/health
# Deve retornar: {"status":"ok"}
```

### **2. Teste de Customização:**
```bash
curl http://localhost:3000/api/customization/public
# Deve retornar dados de customização
```

### **3. Teste de Upload de Logo:**
1. Acesse o sistema
2. Vá em Configurações > Personalização > Gerenciar Logos
3. Faça upload de uma logo
4. Salve
5. Abra outro navegador
6. ✅ A logo deve aparecer

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### **Erro 500 na API customization:**
```bash
cd backend
node scripts/fix-customization-table.js
pm2 restart sispat-backend
```

### **Logo não persiste entre navegadores:**
```bash
# Verificar se colunas existem
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT column_name FROM information_schema.columns WHERE table_name = 'customizations'\`.then(cols => {
  console.log('Colunas:', cols.map(c => c.column_name));
  prisma.\$disconnect();
});
"
```

### **Backend não inicia:**
```bash
# Verificar logs
pm2 logs sispat-backend --lines 50

# Verificar porta
netstat -tlnp | grep :3000

# Verificar banco
cd backend
npx prisma db push
```

---

## 📊 MONITORAMENTO

### **Logs importantes:**
```bash
# Logs do backend
pm2 logs sispat-backend

# Logs do sistema
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Métricas:**
```bash
# Uso de recursos
pm2 monit

# Status dos processos
pm2 status

# Informações detalhadas
pm2 show sispat-backend
```

---

## 🔄 ATUALIZAÇÕES

### **Atualizar o sistema:**
```bash
# Backup do banco (RECOMENDADO)
pg_dump sispat > backup_$(date +%Y%m%d_%H%M%S).sql

# Atualizar código
git pull origin main

# Aplicar correções
./backend/scripts/setup-production.sh

# Reiniciar
pm2 restart sispat-backend
```

---

## 📞 SUPORTE

### **Arquivos de Log:**
- Backend: `~/.pm2/logs/sispat-backend-*.log`
- Nginx: `/var/log/nginx/`

### **Comandos de Debug:**
```bash
# Verificar estrutura da tabela
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT * FROM customizations LIMIT 1\`.then(result => {
  console.log('Dados:', result);
  prisma.\$disconnect();
});
"
```

---

**SISPAT 2.0 - Sistema de Gestão de Patrimônio**  
**Versão:** 2.0.0  
**Última atualização:** 09/10/2025  
**Status:** ✅ Produção Ready
