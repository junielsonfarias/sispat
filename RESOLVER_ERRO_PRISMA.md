# 🔧 RESOLVER ERRO PRISMA - Windows

## ❌ **ERRO QUE VOCÊ TEVE:**

```
EPERM: operation not permitted, rename 
'query_engine-windows.dll.node.tmp...' -> 'query_engine-windows.dll.node'
```

---

## 🎯 **CAUSA**

O arquivo `.dll.node` do Prisma está sendo usado por:
- ✅ Processo Node.js rodando
- ✅ VS Code
- ✅ Antivírus
- ✅ Outro terminal

---

## ✅ **SOLUÇÕES (DO MAIS SIMPLES AO MAIS COMPLETO)**

### **SOLUÇÃO 1: Fechar Tudo e Rodar Como Admin (RECOMENDADO)**

```bash
# 1. FECHE TUDO:
#    - VS Code
#    - Todos os terminais
#    - Todos os navegadores com localhost:8080

# 2. Abra PowerShell/CMD como ADMINISTRADOR
#    (Botão direito > "Executar como administrador")

# 3. Vá para o diretório do projeto
cd "D:\novo ambiente\sispat - Copia"

# 4. Execute o script ADMIN
.\setup-dev-ADMIN.bat

# PRONTO! ✅
```

---

### **SOLUÇÃO 2: Limpar Manualmente**

```bash
# 1. Fechar TODOS os processos Node
taskkill /F /IM node.exe

# 2. Esperar 5 segundos
timeout /t 5

# 3. Deletar cache Prisma
cd "D:\novo ambiente\sispat - Copia\backend"
rd /s /q "node_modules\.prisma"

# 4. Aguardar 3 segundos
timeout /t 3

# 5. Gerar novamente
npx prisma generate

# Se funcionar, continue:
npx prisma migrate reset --force
npm run prisma:seed
```

---

### **SOLUÇÃO 3: Desabilitar Antivírus Temporariamente**

Se o erro persistir:

1. **Desabilite temporariamente** o antivírus (Windows Defender ou outro)
2. Execute: `.\setup-dev-ADMIN.bat`
3. **Reative** o antivírus depois

**Como desabilitar Windows Defender:**
```
1. Configurações > Privacidade e Segurança > Segurança do Windows
2. Proteção contra vírus e ameaças
3. Gerenciar configurações
4. Desligar "Proteção em tempo real" por 15 minutos
```

---

### **SOLUÇÃO 4: Setup Manual Completo**

Se nada funcionar, faça manualmente:

```bash
# 1. Fechar TUDO (VS Code, terminais, navegadores)

# 2. Abrir PowerShell COMO ADMINISTRADOR

# 3. Ir para backend
cd "D:\novo ambiente\sispat - Copia\backend"

# 4. Matar Node
taskkill /F /IM node.exe
timeout /t 5

# 5. Limpar
rd /s /q "node_modules\.prisma"
del /f /q "node_modules\.prisma\client\*.tmp*"
timeout /t 3

# 6. Gerar Prisma (pode demorar)
npx prisma generate

# SE DER ERRO AQUI:
#   - Feche PowerShell
#   - Reinicie o computador
#   - Abra PowerShell como Admin novamente
#   - Execute npx prisma generate novamente

# 7. Reset banco
npx prisma migrate reset --force --skip-seed

# 8. Aplicar migrations
npx prisma migrate deploy

# 9. Seed manual
# Criar arquivo backend/seed-manual.js:
```

Crie `backend/seed-manual.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Criar município
  const municipality = await prisma.municipality.upsert({
    where: { id: 'municipality-1' },
    update: {},
    create: {
      id: 'municipality-1',
      name: 'Município de Teste',
      state: 'PA',
    },
  });

  // Admin
  const adminPassword = await bcrypt.hash('Admin@123!Dev', 10);
  await prisma.user.upsert({
    where: { email: 'admin@dev.com' },
    update: {},
    create: {
      email: 'admin@dev.com',
      name: 'Admin Desenvolvimento',
      password: adminPassword,
      role: 'superuser',
      municipalityId: municipality.id,
    },
  });

  console.log('✅ Seed concluído!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Execute:
```bash
node seed-manual.js
```

---

## 🚀 **TESTE FINAL**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (novo terminal)
cd "D:\novo ambiente\sispat - Copia"
npm run dev

# Navegador
# http://localhost:8080
# Login: admin@dev.com / Admin@123!Dev
```

---

## 📋 **CHECKLIST SE AINDA DER ERRO**

- [ ] Fechou VS Code completamente?
- [ ] Fechou todos os terminais?
- [ ] Executou como Administrador?
- [ ] Aguardou 5 segundos após `taskkill`?
- [ ] Deletou pasta `node_modules\.prisma`?
- [ ] Antivírus está desabilitado temporariamente?
- [ ] Reiniciou o computador?

---

## ⚡ **ATALHO RÁPIDO**

```bash
# Execute estes comandos UM POR VEZ como ADMIN:

taskkill /F /IM node.exe
timeout /t 5
cd "D:\novo ambiente\sispat - Copia\backend"
rd /s /q "node_modules\.prisma"
timeout /t 3
npx prisma generate
npx prisma migrate reset --force
npm run prisma:seed
```

---

## 🆘 **SE NADA FUNCIONAR**

Cole aqui:
1. Screenshot do erro completo
2. Resultado de: `tasklist | findstr node`
3. Versão do Windows: `winver`
4. Antivírus instalado

Vou criar uma solução específica para seu caso! 🚀

