# 🏛️ SISPAT 2.0 - Sistema Integrado de Patrimônio

**Versão:** 2.0.4  
**Status:** ✅ Produção Ready + Infraestrutura Enterprise  
**Última atualização:** 11/10/2025

> 🆕 **[Melhorias Frontend](MELHORIAS_FRONTEND_IMPLEMENTADAS.md)** - CSS otimizado, Skeleton loading, Error boundaries  
> 📱 **[Tipografia Mobile](MELHORIAS_TIPOGRAFIA_MOBILE.md)** - Legibilidade otimizada para smartphones e tablets  
> 🏗️ **[Arquitetura v2.0.4](GUIA_MELHORIAS_ARQUITETURA.md)** - React Query ✅, Redis, Testes ✅, CI/CD ✅, Lazy Loading  
> 🗄️ **[Análise do Banco](ANALISE_BANCO_DADOS_COMPLETA.md)** - 93/100, 36 índices, 21 tabelas, Performance +90%  
> 🧠 **[Análise Lógica](ANALISE_LOGICA_COMPLETA.md)** - 92/100, Fluxos de negócio, Permissões, Validações  
> ⚡ **[Status Ativação](STATUS_ATIVACAO_FINAL.md)** - React Query ATIVO, DevTools disponível, Erro 500 corrigido

---

## 📋 Sobre o Sistema

O SISPAT 2.0 é um sistema completo de gestão patrimonial desenvolvido para prefeituras e órgãos públicos. Oferece controle total sobre bens móveis, imóveis, setores e usuários com um sistema robusto de permissões e relatórios.

---

## ✨ Funcionalidades Principais

### 🏢 **Gestão de Patrimônio**
- ✅ Cadastro de bens móveis e imóveis
- ✅ Controle de setores e localizações
- ✅ Sistema de etiquetas e códigos
- ✅ Upload e gestão de fotos
- ✅ Histórico completo de movimentações

### 👥 **Gestão de Usuários**
- ✅ Sistema de perfis (Admin, Supervisor, Usuário, Visualizador)
- ✅ Controle de acesso por setores
- ✅ Autenticação segura com JWT

### 📊 **Relatórios e Dashboards**
- ✅ Dashboard executivo com métricas
- ✅ Relatórios personalizáveis
- ✅ Exportação em PDF e Excel
- ✅ Gráficos e indicadores

### 🎨 **Personalização**
- ✅ Upload de logo personalizada
- ✅ Cores e temas customizáveis
- ✅ Informações do município
- ✅ Layout responsivo

---

## 🚀 Instalação

### 📦 Instalação em VPS (Recomendado)

Para instalação completa em servidor VPS Linux, use nosso **instalador automático**:

```bash
# Baixar script de instalação
wget https://raw.githubusercontent.com/junielsonfarias/sispat/main/install.sh

# Executar instalador (como root)
sudo bash install.sh
```

O instalador automaticamente:
- ✅ Instala todas as dependências (Node.js, PostgreSQL, Nginx)
- ✅ Clona e compila o projeto
- ✅ Configura banco de dados
- ✅ Cria usuários administrativos
- ✅ Configura SSL/HTTPS (opcional)
- ✅ Inicia o sistema com PM2

**Tempo estimado:** 15-30 minutos

📖 **Documentação completa:** [GUIA_INSTALACAO_VPS_COMPLETO.md](GUIA_INSTALACAO_VPS_COMPLETO.md)

---

### 💻 Instalação Local (Desenvolvimento)

#### **Pré-requisitos:**
- Node.js 18.x+
- PostgreSQL 13.x+
- PNPM ou NPM

#### **1. Clone o repositório:**
```bash
git clone https://github.com/junielsonfarias/sispat.git
cd sispat
```

#### **2. Configure variáveis de ambiente:**
```bash
# Frontend
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
```

Edite os arquivos `.env` com suas configurações.

#### **3. Instale dependências:**
```bash
# Frontend
npm install --legacy-peer-deps

# Backend
cd backend
npm install
cd ..
```

#### **4. Configure o banco de dados:**
```bash
cd backend

# Gerar Prisma Client
npx prisma generate

# Executar migrações
npx prisma migrate dev

# Popular com dados iniciais
npm run prisma:seed

cd ..
```

#### **5. Inicie o sistema:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

Acesse: `http://localhost:5173`

---

### 🐳 Instalação com Docker (Experimental)

```bash
# Iniciar serviços (PostgreSQL)
cd backend
docker-compose up -d

# Configurar aplicação
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

---

## 🔧 Scripts Disponíveis

```bash
# Setup completo para produção
npm run setup:production

# Corrigir tabela de customização
npm run fix:customization

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Linting e formatação
npm run lint
npm run format
```

---

## 📁 Estrutura do Projeto

```
sispat/
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── controllers/     # Controladores da API
│   │   ├── middleware/      # Middlewares de autenticação
│   │   ├── routes/          # Rotas da API
│   │   └── server.js        # Servidor principal
│   ├── prisma/              # Schema e migrações
│   └── scripts/             # Scripts de setup e correção
├── src/                     # Frontend React + TypeScript
│   ├── components/          # Componentes reutilizáveis
│   ├── contexts/            # Contextos React
│   ├── hooks/               # Hooks customizados
│   ├── pages/               # Páginas da aplicação
│   └── services/            # Serviços de API
├── public/                  # Arquivos estáticos
└── docs/                    # Documentação
```

---

## 🔐 Sistema de Permissões

### **Perfis de Usuário:**

| Perfil | Acesso aos Setores | Criação de Usuários | Upload de Logo | Gestão Completa |
|--------|-------------------|-------------------|----------------|-----------------|
| **Admin** | ✅ Todos | ✅ Sim | ✅ Sim | ✅ Sim |
| **Supervisor** | ✅ Todos | ✅ Sim | ✅ Sim | ✅ Sim |
| **Usuário** | 🔒 Apenas atribuídos | ❌ Não | ❌ Não | ❌ Não |
| **Visualizador** | 👁️ Apenas atribuídos | ❌ Não | ❌ Não | ❌ Não |

### **Funcionalidades por Perfil:**

- **Admin/Supervisor:** Acesso total ao sistema
- **Usuário:** Pode criar e editar bens nos setores atribuídos
- **Visualizador:** Apenas visualização dos setores atribuídos

---

## 🧪 Testes

### **Testar API:**
```bash
# Saúde da API
curl http://localhost:3000/api/health

# Customização
curl http://localhost:3000/api/customization/public

# Setores
curl http://localhost:3000/api/sectors
```

### **Testar Frontend:**
1. Acesse `http://localhost:5173` (desenvolvimento)
2. Faça login com usuário admin
3. Teste upload de logo
4. Verifique persistência entre navegadores

---

## 🔧 Comandos Úteis

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
```

### **Banco de Dados:**
```bash
cd backend

# Aplicar migrações
npx prisma db push

# Visualizar dados
npx prisma studio

# Reset (CUIDADO!)
npx prisma db push --force-reset
```

### **Correções:**
```bash
# Corrigir tabela customizations
npm run fix:customization

# Setup completo
npm run setup:production
```

---

## 🚨 Solução de Problemas

### **Erro 500 na API customization:**
```bash
npm run fix:customization
pm2 restart sispat-backend
```

### **Logo não persiste:**
```bash
# Verificar estrutura da tabela
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

## 📊 Monitoramento

### **Logs:**
```bash
# Backend
pm2 logs sispat-backend

# Monitoramento em tempo real
pm2 monit
```

### **Métricas:**
```bash
# Status dos processos
pm2 status

# Informações detalhadas
pm2 show sispat-backend
```

---

## 🔄 Atualizações

### **Atualizar sistema:**
```bash
# Backup do banco (RECOMENDADO)
pg_dump sispat > backup_$(date +%Y%m%d_%H%M%S).sql

# Atualizar código
git pull origin main

# Aplicar correções
npm run setup:production

# Reiniciar
pm2 restart sispat-backend
```

---

## 📞 Suporte

### **Documentação:**
- 📖 [Instalação em Produção](INSTALACAO_PRODUCAO.md)
- 🔧 [Correções Aplicadas](CORRECOES_APLICADAS.md)
- 🔐 [Sistema de Permissões](SISTEMA_PERMISSOES_SETORES.md)

### **Arquivos de Log:**
- Backend: `~/.pm2/logs/sispat-backend-*.log`
- Nginx: `/var/log/nginx/` (se usar)

---

## 🏆 Tecnologias

### **Backend:**
- Node.js + Express
- PostgreSQL + Prisma ORM
- JWT para autenticação
- PM2 para gerenciamento

### **Frontend:**
- React 19 + TypeScript
- TailwindCSS + Shadcn/ui
- React Hook Form + Zod
- Vite para build

### **Infraestrutura:**
- Docker (PostgreSQL + Redis)
- Nginx (proxy reverso)
- PM2 (process manager)

---

## 📈 Status do Projeto

- ✅ **Sistema de Autenticação** - 100% Funcional
- ✅ **Gestão de Usuários** - 100% Funcional
- ✅ **Gestão de Setores** - 100% Funcional
- ✅ **Gestão de Bens** - 100% Funcional
- ✅ **Sistema de Relatórios** - 100% Funcional
- ✅ **Personalização** - 100% Funcional
- ✅ **Upload de Logo** - 100% Funcional
- ✅ **Dashboard** - 100% Funcional

---

## 🎯 Próximas Funcionalidades

- 📱 App mobile
- 🔔 Notificações em tempo real
- 📊 Analytics avançados
- 🔗 Integração com sistemas externos
- 🌐 API pública

---

**SISPAT 2.0 - Sistema de Gestão de Patrimônio**  
**Desenvolvido com ❤️ para o serviço público**

---

## 📄 Licença

Este projeto é propriedade do órgão público e está sob licença proprietária.

---

**Para suporte técnico, consulte a documentação em `docs/` ou entre em contato com a equipe de desenvolvimento.**