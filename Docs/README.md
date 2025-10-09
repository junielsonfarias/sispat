# SISPAT 2.0 - Sistema Integrado de Patrimônio

Sistema completo de gestão patrimonial desenvolvido com React, TypeScript e dados mockados para demonstração.

## 🚀 Características

- **Frontend Moderno**: React 18 + TypeScript + Vite
- **UI/UX Avançada**: TailwindCSS + Shadcn/UI + Radix UI
- **Dados Mockados**: Sistema completo com dados simulados
- **Responsivo**: Interface adaptável para desktop e mobile
- **Acessível**: Componentes com foco em acessibilidade

## 📋 Funcionalidades

### Gestão de Patrimônios
- Cadastro, edição e exclusão de patrimônios
- Sistema de numeração automática
- Histórico de movimentações
- Upload de fotos e documentos
- QR Code para identificação

### Gestão de Imóveis
- Cadastro completo de imóveis
- Geolocalização
- Área construída e terreno
- Histórico de alterações

### Sistema de Usuários
- 5 tipos de usuários (Super Usuário, Admin, Supervisor, Usuário, Visualizador)
- Controle de permissões
- Gestão de setores e locais

### Relatórios e Dashboards
- Dashboard com estatísticas
- Relatórios personalizáveis
- Exportação em PDF/Excel
- Gráficos e métricas

## 🛠️ Tecnologias

- **Frontend**: React 18, TypeScript, Vite
- **UI**: TailwindCSS, Shadcn/UI, Radix UI
- **Roteamento**: React Router DOM
- **Formulários**: React Hook Form + Zod
- **Ícones**: Lucide React
- **Gráficos**: Recharts
- **PDF**: jsPDF
- **QR Code**: qrcode

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- PNPM (recomendado)

### Instalação
```bash
# Instalar dependências
pnpm install

# Executar em modo desenvolvimento
pnpm dev
```

### Acesso
- **URL**: http://localhost:8080
- **Login**: superuser@prefeitura.sp.gov.br
- **Senha**: 123456

## 👥 Usuários Disponíveis

| Email | Senha | Função |
|-------|-------|--------|
| superuser@prefeitura.sp.gov.br | 123456 | Super Usuário |
| admin@prefeitura.sp.gov.br | 123456 | Administrador |
| supervisor@prefeitura.sp.gov.br | 123456 | Supervisor |
| usuario@prefeitura.sp.gov.br | 123456 | Usuário |
| visualizador@prefeitura.sp.gov.br | 123456 | Visualizador |

## 📊 Dados Mockados

O sistema inclui dados simulados completos:

- **5 usuários** com diferentes perfis
- **3 setores** organizacionais
- **3 locais** de armazenamento
- **2 patrimônios** cadastrados
- **1 imóvel** registrado
- **Histórico completo** de atividades
- **Notificações** e transferências

## 🎨 Personalização

- Temas customizáveis
- Logos personalizáveis
- Cores e fontes configuráveis
- Layout responsivo
- Componentes reutilizáveis

## 📱 Responsividade

- Design mobile-first
- Navegação adaptável
- Componentes responsivos
- Touch-friendly

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Preview da build
pnpm preview

# Linting
pnpm lint
pnpm lint:fix

# Formatação
pnpm format

# Testes
pnpm test
pnpm test:watch
```

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── contexts/       # Contexts do React
├── data/          # Dados mockados
├── hooks/         # Hooks customizados
├── lib/           # Utilitários
├── pages/         # Páginas da aplicação
├── services/      # Serviços de API
└── types/         # Definições TypeScript
```

## 🚀 Deploy

O sistema está configurado para deploy em qualquer plataforma que suporte aplicações React:

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps

## 📄 Licença

Este projeto foi desenvolvido para demonstração e uso educacional.

---

**SISPAT 2.0** - Sistema Integrado de Patrimônio com dados mockados para demonstração completa.
