# 🎨 Instruções para Ativar Persistência de Logo no Banco de Dados

## ✅ O Que Já Foi Feito

1. ✅ **Tabela no Banco**: `customizations` criada com 26 colunas
2. ✅ **Registro Padrão**: Criado para o município
3. ✅ **API Backend**: Implementada com SQL raw queries
4. ✅ **Frontend**: Atualizado para usar API com fallback para localStorage
5. ✅ **Prisma Client**: Regenerado

## 🚀 Como Iniciar o Backend

### **Opção 1: Terminal PowerShell/CMD**

```bash
# Entre na pasta do backend
cd "D:\novo ambiente\sispat - Copia\backend"

# Inicie o servidor
npm run dev
```

### **Opção 2: Se der erro, execute diretamente:**

```bash
cd "D:\novo ambiente\sispat - Copia\backend"
npx ts-node src/index.ts
```

## 🧪 Como Testar

1. **Abra o navegador** em http://localhost:5173 (ou sua porta do frontend)
2. **Faça login** com credenciais de admin:
   - Email: `admin@ssbv.com`
   - Senha: `password123`
3. **Vá em**: Configurações > Personalização > Logos
4. **Selecione uma nova logo**
5. **Clique em "Salvar Alterações"**
6. **Verifique no console do navegador**:
   - Se aparecer: `✅ Customização salva no banco de dados` - FUNCIONOU!
   - Se aparecer: `⚠️ Erro ao salvar no banco...` - Salvou apenas no localStorage

## 🔍 Como Verificar se Foi Salvo no Banco

Execute este script no terminal do backend:

```bash
cd "D:\novo ambiente\sispat - Copia\backend"
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\$queryRaw\`SELECT * FROM customizations\`.then(r=>console.log('Registros:',r.length,r[0]?.activeLogoUrl?'Logo definida':'Logo não definida')).finally(()=>p.\$disconnect())"
```

## 📋 Arquivos Implementados

### Backend:
- ✅ `backend/src/prisma/schema.prisma` - Model Customization adicionado
- ✅ `backend/src/controllers/customizationController.ts` - Controller com SQL raw
- ✅ `backend/src/routes/customizationRoutes.ts` - Rotas da API
- ✅ `backend/src/index.ts` - Rotas registradas (comentadas temporariamente)

### Frontend:
- ✅ `src/contexts/CustomizationContext.tsx` - Integrado com API + fallback

## 🎯 Status Atual

- ✅ **Tabela**: Criada no PostgreSQL
- ✅ **API**: Implementada e pronta
- ✅ **Frontend**: Atualizado
- ⏳ **Backend**: Precisa estar rodando
- 🔄 **Teste**: Aguardando você testar

## 💡 Comportamento Esperado

### Quando a API funciona:
1. Logo é salva no **banco de dados PostgreSQL**
2. Logo é sincronizada entre **todos os dispositivos**
3. Logo persiste mesmo após **limpar cache do navegador**

### Quando a API não funciona (fallback):
1. Logo é salva apenas no **localStorage**
2. Logo funciona apenas no **navegador atual**
3. Logo pode ser perdida ao **limpar cache**

## 🆘 Se Encontrar Problemas

Se o backend não iniciar, me informe o erro exato que aparece no terminal!

