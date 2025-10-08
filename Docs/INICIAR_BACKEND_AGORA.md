# 🚀 Como Iniciar o Backend - SISPAT 2.0

## ⚠️ Importante

O backend precisa ser iniciado manualmente em um terminal separado.

---

## ✅ Opção 1: Terminal Integrado do VS Code/Cursor

1. **Abra um novo terminal** (Ctrl + Shift + `)
2. **Execute os comandos**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Aguarde** a mensagem:
   ```
   🚀 Servidor rodando na porta 3000
   ✅ Conectado ao banco de dados PostgreSQL
   ```

---

## ✅ Opção 2: PowerShell/CMD Separado

1. **Abra o PowerShell** ou CMD
2. **Navegue até a pasta do projeto**:
   ```bash
   cd "d:\novo ambiente\sispat - Copia\backend"
   ```

3. **Inicie o backend**:
   ```bash
   npm run dev
   ```

---

## ✅ Opção 3: Usar npx diretamente

Se `npm run dev` não funcionar:

```bash
cd backend
npx ts-node src/index.ts
```

---

## 🔍 Verificar se Está Funcionando

Após iniciar, você deve ver no terminal:

```
🚀 Servidor rodando na porta 3000
✅ Conectado ao banco de dados PostgreSQL
[HTTP] Servidor pronto para receber requisições
```

---

## 🧪 Testar o Backend

Abra o navegador e acesse:
```
http://localhost:3000/api/patrimonios
```

Ou use curl no terminal:
```bash
curl http://localhost:3000/api/patrimonios
```

---

## ❌ Se Não Funcionar

### Problema: `ts-node não reconhecido`

**Solução**:
```bash
cd backend
npm install -D ts-node typescript @types/node
npx prisma generate
npm run dev
```

### Problema: Porta 3000 em uso

**Solução**:
```bash
# Matar processos Node
taskkill /F /IM node.exe

# Tentar novamente
npm run dev
```

### Problema: Erro de conexão com banco

**Solução**:
1. Verifique se PostgreSQL está rodando
2. Verifique o arquivo `.env` no backend
3. Execute: `npx prisma db push`

---

## 📋 Checklist

- [ ] Terminal aberto na pasta `backend`
- [ ] Comando `npm run dev` executado
- [ ] Mensagem de sucesso apareceu
- [ ] Porta 3000 está respondendo
- [ ] Frontend consegue conectar

---

## 🎯 Após Iniciar

1. **Recarregue o frontend** (F5 no navegador)
2. **Teste a funcionalidade** de baixa de bens
3. **Verifique** se tudo está funcionando

---

**Última Atualização**: 08/10/2025
**Status**: Aguardando inicialização manual
