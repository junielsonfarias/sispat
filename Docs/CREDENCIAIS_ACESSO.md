# 🔐 CREDENCIAIS DE ACESSO - SISPAT 2.0

**Data:** 07/10/2025  
**Sistema:** SISPAT 2.0  
**Status:** ✅ **CREDENCIAIS ATIVAS E FUNCIONAIS**

---

## 👥 USUÁRIOS DISPONÍVEIS

### 🔑 **SUPERUSER** (Acesso Total)
```
Email:    junielsonfarias@gmail.com
Senha:    Tiko6273@
Função:   Superuser
Acesso:   Sistema completo + configurações avançadas
```

### 🔑 **ADMINISTRADOR** (Recomendado para Testes)
```
Email:    admin@ssbv.com
Senha:    password123
Função:   Admin
Acesso:   Gestão completa do município
```

### 🔑 **SUPERVISOR**
```
Email:    supervisor@ssbv.com
Senha:    password123
Função:   Supervisor
Acesso:   Supervisão e relatórios
```

### 🔑 **USUÁRIO PADRÃO**
```
Email:    usuario@ssbv.com
Senha:    password123
Função:   Usuário
Acesso:   Operações básicas
```

### 🔑 **VISUALIZADOR**
```
Email:    visualizador@ssbv.com
Senha:    password123
Função:   Visualizador
Acesso:   Apenas visualização
```

---

## 🌐 URLS DE ACESSO

### Frontend (Interface Principal)
```
URL: http://localhost:8080/login
```

### Backend (API)
```
URL: http://localhost:3000
Health Check: http://localhost:3000/health
```

### Consulta Pública
```
URL: http://localhost:8080/consulta-publica
```

---

## 🚀 COMO FAZER LOGIN

### 1. Acessar o Sistema
```
1. Abra o navegador
2. Acesse: http://localhost:8080/login
3. Aguarde a página carregar
```

### 2. Inserir Credenciais
```
1. Digite o email: admin@ssbv.com
2. Digite a senha: password123
3. Clique em "Entrar"
```

### 3. Verificar Acesso
```
✅ Login bem-sucedido
✅ Redirecionamento para dashboard
✅ Menu lateral carregado
✅ Usuário logado no header
```

---

## 🔧 TROUBLESHOOTING DE LOGIN

### ❌ Problema: "Credenciais inválidas"

#### Verificação 1: Backend Rodando?
```bash
# Verificar se backend está ativo
curl http://localhost:3000/health

# Deve retornar:
# {"status":"OK","timestamp":"2025-10-07T...","uptime":123.45}
```

#### Verificação 2: Banco de Dados Populado?
```bash
cd backend

# Verificar se usuários existem
npx prisma studio
# OU
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(users => {
  console.log('Usuários encontrados:', users.length);
  users.forEach(u => console.log('-', u.email, u.role));
  prisma.\$disconnect();
});
"
```

#### Verificação 3: Senhas Corretas?
```bash
# Verificar hash das senhas
cd backend
node -e "
const bcrypt = require('bcryptjs');
const testPassword = 'password123';
const hash = '\$2a\$10\$...'; // Hash do banco
bcrypt.compare(testPassword, hash).then(result => {
  console.log('Senha válida:', result);
});
"
```

### ❌ Problema: "Erro de conexão"

#### Solução 1: Reiniciar Backend
```bash
cd backend
# Parar processo atual (Ctrl+C)
npm run dev
```

#### Solução 2: Verificar Portas
```bash
# Verificar se porta 3000 está livre
netstat -an | findstr :3000

# Verificar se porta 8080 está livre
netstat -an | findstr :8080
```

#### Solução 3: Verificar Docker
```bash
# Verificar se banco está rodando
docker ps

# Reiniciar banco se necessário
docker-compose down
docker-compose up -d postgres
```

### ❌ Problema: "Página não carrega"

#### Solução 1: Reiniciar Frontend
```bash
# Parar processo atual (Ctrl+C)
pnpm run dev
```

#### Solução 2: Limpar Cache
```bash
# Limpar cache do navegador
Ctrl + Shift + R (Hard Refresh)
# OU
F12 > Network > Disable cache
```

---

## 🧪 TESTE RÁPIDO DE LOGIN

### Script de Teste Automatizado
```bash
cd backend

# Criar arquivo de teste
echo '
const axios = require("axios");

async function testLogin() {
  try {
    const response = await axios.post("http://localhost:3000/api/auth/login", {
      email: "admin@ssbv.com",
      password: "password123"
    });
    
    console.log("✅ Login OK!");
    console.log("Token:", response.data.accessToken.substring(0, 20) + "...");
    console.log("Usuário:", response.data.user.name);
  } catch (error) {
    console.log("❌ Erro:", error.response?.data?.error || error.message);
  }
}

testLogin();
' > test-login.js

# Executar teste
node test-login.js
```

### Resultado Esperado:
```
✅ Login OK!
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Usuário: Administrador SSB Vista
```

---

## 🔄 RECRIAR USUÁRIOS (Se Necessário)

### Opção 1: Reset Completo
```bash
cd backend

# Resetar banco e recriar tudo
npx prisma migrate reset
npm run seed
```

### Opção 2: Apenas Usuários
```bash
cd backend

# Deletar usuários existentes
npx prisma studio
# OU via SQL:
# DELETE FROM users;

# Recriar usuários
npm run seed
```

### Opção 3: Criar Usuário Manual
```bash
cd backend

# Script para criar usuário
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createUser() {
  const password = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Teste Manual',
      email: 'teste@teste.com',
      passwordHash: password,
      role: 'admin',
      municipalityId: '1'
    }
  });
  console.log('Usuário criado:', user.email);
  prisma.\$disconnect();
}

createUser();
"
```

---

## 📊 NÍVEIS DE ACESSO

| Função | Dashboard | Patrimônio | Imóveis | Usuários | Configurações | Superuser |
|--------|-----------|------------|---------|----------|---------------|-----------|
| **Superuser** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Supervisor** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Usuário** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Visualizador** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🎯 CREDENCIAIS RECOMENDADAS PARA TESTE

### Para Desenvolvimento:
```
Email: admin@ssbv.com
Senha: password123
```
**Motivo:** Acesso completo ao sistema, ideal para testes

### Para Demonstração:
```
Email: supervisor@ssbv.com
Senha: password123
```
**Motivo:** Acesso supervisor, mostra funcionalidades principais

### Para Usuário Final:
```
Email: usuario@ssbv.com
Senha: password123
```
**Motivo:** Acesso básico, simula usuário comum

---

## ⚠️ IMPORTANTE

### Segurança:
- ✅ Senhas são hasheadas com bcrypt
- ✅ Tokens JWT com expiração de 7 dias
- ✅ Rotas protegidas por middleware
- ⚠️ **NÃO usar em produção** com senhas padrão

### Produção:
```bash
# Definir senhas seguras via .env
SUPERUSER_PASSWORD=SenhaSuperSegura123!
ADMIN_PASSWORD=SenhaAdminSegura456!
DEFAULT_PASSWORD=SenhaPadraoSegura789!
```

---

## 📞 SUPORTE

### Se o login não funcionar:

1. **Verificar logs do backend:**
   ```bash
   cd backend
   npm run dev
   # Observar logs no terminal
   ```

2. **Verificar logs do frontend:**
   ```bash
   # F12 > Console (navegador)
   # Procurar por erros em vermelho
   ```

3. **Testar API diretamente:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@ssbv.com","password":"password123"}'
   ```

4. **Resetar sistema:**
   ```bash
   # Parar tudo
   docker-compose down -v
   
   # Recriar banco
   docker-compose up -d postgres
   
   # Aplicar migrações
   cd backend
   npx prisma migrate deploy
   npm run seed
   
   # Iniciar sistema
   npm run dev
   cd .. && pnpm run dev
   ```

---

**Status:** ✅ **SISTEMA PRONTO PARA LOGIN**

