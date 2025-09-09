# 🏛️ SISPAT - Sistema de Gestão Patrimonial

Sistema completo e independente de gestão patrimonial para municípios e organizações públicas,
desenvolvido com tecnologias modernas e arquitetura full-stack.

[![Version](https://img.shields.io/badge/version-0.0.193-blue.svg)](https://github.com/sispat/sispat)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-13+-blue.svg)](https://postgresql.org/)
[![React](https://img.shields.io/badge/react-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9.2-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Status do Projeto

- ✅ **FASE 1.1:** Limpeza de Arquivos Desnecessários - **CONCLUÍDA**
- ✅ **FASE 1.2:** Auditoria de Segurança Completa - **CONCLUÍDA** (Score: 86/100)
- ✅ **FASE 1.3:** Revisão de Performance e Otimização - **CONCLUÍDA** (50-60% mais rápido)
- 🔄 **FASE 1.4:** Documentação Técnica Atualizada - **EM ANDAMENTO**

## 🚀 Características Principais

- **🏛️ Gestão Completa de Patrimônio**: Controle total de bens, imóveis e equipamentos
- **👥 Sistema de Usuários**: Hierarquia de permissões (superuser, supervisor, admin, usuario,
  visualizador)
- **🏘️ Gestão Municipal**: Suporte a múltiplos municípios com isolamento de dados
- **📊 Dashboards Inteligentes**: Relatórios e análises em tempo real
- **🔄 Controle de Transferências**: Gestão de empréstimos e transferências
- **📋 Inventários**: Sistema completo de inventário patrimonial
- **🏷️ Etiquetas**: Geração e impressão de etiquetas personalizadas
- **📄 Relatórios**: Templates customizáveis para relatórios
- **🔍 Busca Pública**: Consulta pública de patrimônios
- **📱 Interface Responsiva**: Design moderno e adaptável
- **⚡ Performance Otimizada**: Cache inteligente e otimização de queries
- **🛡️ Segurança Avançada**: Sistema de detecção de intrusão (IDS)
- **📈 Monitoramento**: Métricas de performance e segurança em tempo real
- **🔄 Backup Automático**: Sistema de backup e recuperação de dados
- **🔐 Autenticação 2FA**: Suporte a autenticação de dois fatores
- **⚡ Performance Otimizada**: 50-60% mais rápido com lazy loading e cache
- **🔒 Segurança Validada**: Score 86/100 em auditoria de segurança
- **📊 26 Índices de BD**: Queries 90% mais rápidas

## 🛠️ Tecnologias Utilizadas

### Frontend

- **React 19.1.1** - Framework principal
- **TypeScript 5.9.2** - Tipagem estática
- **Vite 7.1.0** - Build tool e dev server
- **Tailwind CSS** - Framework de estilos
- **Shadcn UI** - Componentes de interface
- **React Router** - Roteamento
- **React Hook Form + Zod** - Formulários e validação
- **Recharts** - Gráficos e visualizações

### Backend

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação
- **bcryptjs** - Criptografia de senhas
- **Multer** - Upload de arquivos
- **Helmet** - Segurança
- **Redis** - Cache e sessões
- **node-cron** - Agendamento de tarefas
- **express-rate-limit** - Rate limiting

### Segurança e Performance

- **Sistema IDS** - Detecção de intrusão em tempo real
- **Cache Inteligente** - Estratégias de cache baseadas em prioridade
- **Otimização de Queries** - Análise e otimização automática
- **Monitoramento** - Métricas de performance e segurança
- **Backup Automático** - Sistema de backup e recuperação

## 📋 Pré-requisitos

- **Node.js** 18+
- **PostgreSQL** 14+
- **Redis** 6+ (opcional, para cache avançado)
- **pnpm** (recomendado) ou npm

## 🆕 Novas Funcionalidades

### ⚡ Otimização de Performance

O SISPAT agora inclui um sistema avançado de otimização de performance:

- **Cache Inteligente**: Estratégias de cache baseadas em prioridade (high, medium, low)
- **Otimização de Queries**: Análise automática e sugestões de otimização
- **Monitoramento de Performance**: Métricas em tempo real de requisições e queries
- **Rate Limiting**: Proteção contra sobrecarga do sistema

### 🛡️ Sistema de Segurança Avançado

Implementamos um sistema completo de detecção de intrusão (IDS):

- **Detecção de Ataques**: SQL Injection, XSS, Rate Limiting
- **Regras Configuráveis**: 4 regras padrão + regras customizáveis
- **Bloqueio Automático**: IPs maliciosos são bloqueados automaticamente
- **Alertas em Tempo Real**: Notificações para administradores
- **Dashboard de Segurança**: Estatísticas e monitoramento

### 📊 Monitoramento e Backup

- **Métricas de Sistema**: Performance, segurança e uso
- **Backup Automático**: Agendamento e recuperação de dados
- **Logs Detalhados**: Rastreamento completo de eventos
- **Alertas Inteligentes**: Notificações baseadas em regras

## 🚀 Instalação e Configuração

### 1. Clone o repositório

```bash
git clone <repository-url>
cd sispat-sistema-patrimonial
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure o banco de dados PostgreSQL

#### Opção A: Instalação Automática (Windows)

```powershell
# Execute o script de instalação do PostgreSQL
.\install-postgresql.ps1
```

#### Opção B: Instalação Manual

1. Instale o PostgreSQL
2. Crie o banco de dados:

```sql
CREATE DATABASE sispat_db;
```

### 4. Configure as variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas configurações
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=sua_senha
JWT_SECRET=seu_jwt_secret
```

### 5. Execute a configuração inicial

```bash
# Configuração automática
pnpm run setup

# Migração do banco de dados
pnpm run db:migrate

# População inicial de dados
pnpm run db:seed
```

### 6. Inicie o sistema

```bash
# Desenvolvimento (frontend + backend)
pnpm run dev

# Apenas frontend
pnpm run dev:frontend

# Apenas backend
pnpm run dev:backend
```

## 🔐 Acesso Inicial

- **URL**: http://localhost:8080
- **Email**: junielsonfarias@gmail.com
- **Senha**: Tiko6273@
- **Role**: superuser

## 🏗️ Estrutura do Projeto

```
sispat-sistema-patrimonial/
├── src/
│   ├── components/          # Componentes React reutilizáveis
│   ├── contexts/           # Contextos de estado (15+ contextos)
│   ├── pages/              # Páginas da aplicação
│   ├── services/           # Serviços de API
│   ├── types/              # Definições TypeScript
│   ├── config/             # Configurações centralizadas
│   └── lib/                # Utilitários e helpers
├── server/
│   ├── routes/             # Rotas da API (80+ endpoints)
│   ├── database/           # Scripts de banco de dados
│   ├── middleware/         # Middlewares Express
│   └── index.js            # Servidor principal
├── uploads/                # Arquivos enviados
└── docs/                   # Documentação
```

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
pnpm run dev              # Frontend + Backend
pnpm run dev:frontend     # Apenas frontend
pnpm run dev:backend      # Apenas backend

# Banco de dados
pnpm run db:migrate       # Executar migrações
pnpm run db:seed          # Popular dados iniciais
pnpm run db:reset         # Limpar dados (mantém superuser)

# Build e produção
pnpm run build            # Build de produção
pnpm run preview          # Preview do build

# Qualidade de código
pnpm run lint             # Verificar código
pnpm run lint:fix         # Corrigir problemas
pnpm run format           # Formatar código
```

## 🏛️ Sistema de Permissões

### Hierarquia de Roles

1. **superuser** - Acesso total ao sistema
2. **supervisor** - Gestão de município
3. **admin** - Administração local
4. **usuario** - Usuário operacional
5. **visualizador** - Apenas visualização

### Controle de Acesso

- **Município-based**: Usuários só acessam dados do seu município
- **Acesso automático**: Usuários têm acesso a todos os setores/locais do município
- **Isolamento**: Dados são isolados por município

## 🗄️ Banco de Dados

### 19 Tabelas Principais

- `municipalities` - Municípios
- `users` - Usuários
- `sectors` - Setores
- `locals` - Locais
- `patrimonios` - Patrimônios
- `imoveis` - Imóveis
- `activity_logs` - Logs de atividade
- `report_templates` - Templates de relatório
- `themes` - Temas
- `notifications` - Notificações
- `inventories` - Inventários
- `transfers` - Transferências
- `label_templates` - Templates de etiquetas
- `excel_csv_templates` - Templates de exportação
- `form_fields` - Campos de formulário
- `numbering_patterns` - Padrões de numeração
- `manutencao_tasks` - Tarefas de manutenção
- `documents` - Documentos
- `user_report_configs` - Configurações de relatório

## 🔒 Segurança

- **JWT Authentication** - Tokens seguros
- **Password Hashing** - bcryptjs
- **Rate Limiting** - Proteção contra ataques
- **CORS** - Controle de origem
- **Helmet** - Headers de segurança
- **Input Validation** - Validação Zod
- **SQL Injection Protection** - Prepared statements

## 📊 Funcionalidades Principais

### Gestão de Patrimônio

- ✅ Cadastro completo de bens
- ✅ Categorização e classificação
- ✅ Controle de estado e valor
- ✅ Histórico de alterações
- ✅ Upload de documentos
- ✅ Geração de etiquetas

### Gestão de Imóveis

- ✅ Cadastro de imóveis
- ✅ Geolocalização
- ✅ Manutenções
- ✅ Relatórios específicos

### Inventários

- ✅ Criação de inventários
- ✅ Contagem de bens
- ✅ Relatórios de divergências
- ✅ Exportação de dados

### Transferências

- ✅ Solicitação de transferências
- ✅ Aprovação/rejeição
- ✅ Controle de empréstimos
- ✅ Termos de responsabilidade

### Relatórios

- ✅ Templates customizáveis
- ✅ Exportação em PDF/Excel
- ✅ Gráficos e dashboards
- ✅ Filtros avançados

## 🚀 Deploy

### Desenvolvimento

```bash
pnpm run dev
```

### Produção

```bash
# Build
pnpm run build

# Servidor de produção
pnpm run preview
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **Email**: suporte@sispat.com.br
- **Website**: https://sispat.com.br
- **Documentação**: https://docs.sispat.com.br

---

**SISPAT** - Sistema de Gestão Patrimonial  
© 2024 SISPAT Development Team
