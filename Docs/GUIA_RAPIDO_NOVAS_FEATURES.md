# 🚀 GUIA RÁPIDO - NOVAS FEATURES ENTERPRISE

**Versão:** 2.1.0  
**Data:** 12 de outubro de 2025  

---

## 📋 FEATURES ADICIONADAS

1. ✅ **Error Tracking** (Sentry)
2. ✅ **API Documentation** (Swagger)
3. ✅ **Automated Tests** (Jest/Vitest)
4. ✅ **CI/CD** (GitHub Actions)

---

## 1️⃣ SENTRY - ERROR TRACKING

### 🎯 O que é?

Sistema profissional de monitoramento de erros e performance.

### 🔧 Como Configurar

**Passo 1:** Criar conta
```
1. Acesse: https://sentry.io/
2. Criar conta gratuita
3. Criar organização
```

**Passo 2:** Criar projetos
```
1. Criar projeto "sispat-frontend" (React)
2. Copiar DSN do frontend
3. Criar projeto "sispat-backend" (Node.js)
4. Copiar DSN do backend
```

**Passo 3:** Configurar .env
```env
# .env (raiz)
VITE_SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/123456
VITE_APP_VERSION=2.1.0

# backend/.env
SENTRY_DSN=https://yyy@o123456.ingest.sentry.io/654321
APP_VERSION=2.1.0
```

**Passo 4:** Reiniciar
```bash
# Frontend
npm run dev

# Backend
cd backend
npm run dev
```

### ✅ Pronto!

Agora todos os erros serão capturados automaticamente no Sentry!

### 📊 Usar o Dashboard

```
1. Acesse: https://sentry.io/
2. Selecione projeto
3. Veja erros em tempo real
4. Configure alertas (email, Slack, etc.)
5. Analise performance
```

---

## 2️⃣ SWAGGER - API DOCUMENTATION

### 🎯 O que é?

Documentação interativa da API com testes integrados.

### 🔧 Como Acessar

**URL:**
```
http://localhost:3000/api-docs
```

### 📚 Como Usar

**Testar um Endpoint:**

```
1. Abra: http://localhost:3000/api-docs

2. Fazer Login:
   - Expandir: POST /api/auth/login
   - Clicar em "Try it out"
   - Preencher:
     {
       "email": "supervisor@sistema.com",
       "password": "supervisor123"
     }
   - Clicar em "Execute"
   - Copiar o "token" da resposta

3. Autorizar:
   - Clicar em "Authorize" (cadeado no topo)
   - Colar o token
   - Clicar em "Authorize"
   - Fechar modal

4. Testar Qualquer Endpoint:
   - Expandir endpoint desejado
   - Clicar em "Try it out"
   - Preencher parâmetros
   - Clicar em "Execute"
   - Ver resposta
```

### 📖 Explorar API

- **Tags**: Endpoints organizados por categoria
- **Schemas**: Ver estrutura de dados
- **Examples**: Exemplos de requisições
- **Download**: Baixar specs OpenAPI JSON

---

## 3️⃣ TESTES AUTOMATIZADOS

### 🎯 O que é?

Testes unitários e de integração para garantir qualidade.

### 🔧 Como Executar

**Frontend:**
```bash
# Todos os testes
npm run test

# Watch mode (re-executa ao salvar)
npm run test:watch

# Com coverage
npm run test:coverage

# Interface gráfica
npm run test:ui

# Teste específico
npm run test -- src/lib/__tests__/asset-utils.test.ts
```

**Backend:**
```bash
cd backend

# Todos os testes
npm run test

# Watch mode
npm run test:watch

# CI mode
npm run test:ci
```

### 📊 Ver Coverage

**Frontend:**
```bash
npm run test:coverage
# Abre: coverage/index.html
```

**Backend:**
```bash
cd backend
npm run test
# Abre: coverage/index.html
```

### ✍️ Criar Novo Teste

**Frontend (Vitest):**
```typescript
// src/lib/__tests__/minha-funcao.test.ts
import { describe, it, expect } from 'vitest'
import { minhaFuncao } from '../minha-funcao'

describe('minhaFuncao', () => {
  it('deve retornar resultado esperado', () => {
    const result = minhaFuncao('input')
    expect(result).toBe('esperado')
  })
})
```

**Backend (Jest):**
```typescript
// backend/src/__tests__/controller.test.ts
import request from 'supertest'
import express from 'express'
import router from '../routes/myRoutes'

describe('My Controller', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use('/api', router)
  })

  it('deve retornar 200', async () => {
    const response = await request(app).get('/api/endpoint')
    expect(response.status).toBe(200)
  })
})
```

---

## 4️⃣ CI/CD - GITHUB ACTIONS

### 🎯 O que é?

Deploy automático e testes em cada commit/PR.

### 🔧 Como Funciona

**Quando você faz:**
```bash
git push origin develop
```

**GitHub Actions executa:**
```
1. ✅ Frontend Tests (type check + lint + tests)
2. ✅ Backend Tests (integration tests)
3. ✅ Build (frontend + backend)
4. ✅ Deploy to Staging (automático)
```

**Quando você faz:**
```bash
git push origin main
```

**GitHub Actions executa:**
```
1. ✅ Todos os testes
2. ✅ Build
3. ✅ Deploy to Production (automático)
4. ✅ Notify Sentry of release
```

### 📊 Ver Resultados

**GitHub:**
```
https://github.com/seu-repo/actions
```

**Status Badge (opcional):**
```markdown
![CI](https://github.com/seu-repo/actions/workflows/ci.yml/badge.svg)
```

### ⚙️ Configurar Secrets

**GitHub Secrets necessários:**

```
Settings → Secrets → Actions → New repository secret

Nome: SENTRY_AUTH_TOKEN
Valor: (token do Sentry)
```

---

## 🎯 WORKFLOW RECOMENDADO

### Desenvolvimento Diário

```bash
# 1. Criar branch para feature
git checkout -b feature/nova-funcionalidade

# 2. Desenvolver e testar localmente
npm run test:watch

# 3. Commit quando testes passarem
git add .
git commit -m "feat: adicionar funcionalidade"

# 4. Push para GitHub
git push origin feature/nova-funcionalidade

# 5. Abrir Pull Request
# → CI roda automaticamente
# → Aguardar aprovação

# 6. Merge para develop
# → Deploy automático em staging
# → Testar em staging

# 7. Se OK, merge develop → main
# → Deploy automático em production
# → Sentry notificado do release
```

### Monitoramento Produção

```bash
# Diariamente:
1. Checar Sentry para erros novos
2. Revisar performance metrics
3. Configurar alertas críticos

# Semanalmente:
1. Revisar coverage de testes
2. Atualizar documentação Swagger
3. Review de código via PRs
```

---

## 📚 RECURSOS ADICIONAIS

### Documentação

- **Sentry:** https://docs.sentry.io/
- **Swagger:** https://swagger.io/docs/
- **Vitest:** https://vitest.dev/
- **Jest:** https://jestjs.io/
- **GitHub Actions:** https://docs.github.com/actions

### Tutoriais

**Sentry:**
- Setup: https://docs.sentry.io/platforms/javascript/guides/react/
- Performance: https://docs.sentry.io/product/performance/
- Alertas: https://docs.sentry.io/product/alerts/

**Swagger:**
- OpenAPI 3.0: https://swagger.io/specification/
- Annotations: https://swagger.io/docs/specification/basic-structure/

**Testing:**
- Vitest Guide: https://vitest.dev/guide/
- Jest Guide: https://jestjs.io/docs/getting-started
- Testing Library: https://testing-library.com/

---

## ⚡ DICAS RÁPIDAS

### Sentry

```typescript
// Capturar erro manualmente
import { captureError } from '@/config/sentry'

try {
  riskyOperation()
} catch (error) {
  captureError(error as Error, { context: 'extra info' })
}

// Adicionar breadcrumb
import { addBreadcrumb } from '@/config/sentry'
addBreadcrumb('User clicked button', 'user-action')

// Set user context
import { setUserContext } from '@/config/sentry'
setUserContext(currentUser)
```

### Swagger

```typescript
// Documentar novo endpoint
/**
 * @swagger
 * /api/meu-endpoint:
 *   get:
 *     tags: [MinhaTag]
 *     summary: Descrição curta
 *     responses:
 *       200:
 *         description: Sucesso
 *       404:
 *         description: Não encontrado
 */
router.get('/meu-endpoint', handler)
```

### Testes

```typescript
// Mock de API call
vi.mock('@/services/http-api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ id: '123' }),
  },
}))

// Testar async function
it('deve buscar dados', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})
```

---

## 🎉 PRONTO PARA USAR!

Todas as features estão ativas e prontas para uso!

**Próximo passo:** Configure o Sentry e comece a monitorar! 🚀

---

**Criado por:** AI Development Team  
**Versão:** 1.0  
**Status:** ✅ Completo

