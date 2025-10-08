# 🚀 GUIA COMPLETO DE IMPLEMENTAÇÃO - BACKEND E BANCO DE DADOS

## 📋 **ÍNDICE**

1. [Preparação do Ambiente](#1-preparação-do-ambiente)
2. [Estrutura do Backend](#2-estrutura-do-backend)
3. [Configuração do Banco de Dados](#3-configuração-do-banco-de-dados)
4. [Schema Prisma](#4-schema-prisma)
5. [Endpoints da API](#5-endpoints-da-api)
6. [Migração de Dados](#6-migração-de-dados)
7. [Integração Frontend](#7-integração-frontend)
8. [Testes e Validação](#8-testes-e-validação)
9. [Deploy e Produção](#9-deploy-e-produção)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. PREPARAÇÃO DO AMBIENTE

### 📦 **1.1 Instalação de Dependências do Sistema**

#### **Windows:**
```powershell
# 1. Instalar Node.js 18+ LTS
# Baixar de: https://nodejs.org/
# Verificar instalação:
node --version  # Deve mostrar v18.x.x ou superior
npm --version

# 2. Instalar Docker Desktop
# Baixar de: https://www.docker.com/products/docker-desktop/
# Verificar instalação:
docker --version
docker-compose --version

# 3. Instalar PostgreSQL Client (opcional, para testes)
# Baixar de: https://www.postgresql.org/download/windows/
```

#### **Linux/Mac:**
```bash
# Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Docker
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Mac:
brew install docker docker-compose

# Verificar instalações
node --version
docker --version
docker-compose --version
```

### 📁 **1.2 Estrutura de Diretórios**

```bash
# Criar estrutura do backend
mkdir -p backend/src/{controllers,routes,middlewares,services,utils,prisma}
mkdir -p backend/uploads
mkdir -p backend/logs
```

Estrutura final:
```
backend/
├── src/
│   ├── controllers/      # Controladores das rotas
│   ├── routes/           # Definição de rotas
│   ├── middlewares/      # Middlewares (auth, error, etc)
│   ├── services/         # Lógica de negócio
│   ├── utils/            # Funções auxiliares
│   ├── prisma/           # Schema e migrações
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── index.ts          # Servidor principal
├── uploads/              # Arquivos enviados
├── logs/                 # Logs do sistema
├── .env                  # Variáveis de ambiente
├── .env.example          # Exemplo de variáveis
├── package.json          # Dependências
├── tsconfig.json         # Config TypeScript
└── Dockerfile            # Docker config
```

---

## 2. ESTRUTURA DO BACKEND

### 📦 **2.1 Inicializar Projeto Backend**

```bash
# Entrar no diretório backend
cd backend

# Inicializar projeto Node.js
npm init -y

# Instalar dependências principais
npm install express cors dotenv bcryptjs jsonwebtoken multer helmet
npm install @prisma/client

# Instalar dependências de desenvolvimento
npm install -D typescript @types/node @types/express @types/cors
npm install -D @types/bcryptjs @types/jsonwebtoken @types/multer
npm install -D ts-node nodemon prisma

# Instalar Winston para logs
npm install winston
```

### 📝 **2.2 Configurar TypeScript**

Criar `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 📝 **2.3 Configurar Package.json**

Adicionar scripts em `backend/package.json`:
```json
{
  "name": "sispat-backend",
  "version": "1.0.0",
  "description": "Backend do Sistema Integrado de Patrimônio",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node src/prisma/seed.ts",
    "prisma:reset": "prisma migrate reset",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["patrimonio", "gestao", "api"],
  "author": "",
  "license": "MIT"
}
```

### 🔐 **2.4 Variáveis de Ambiente**

Criar `backend/.env`:
```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sispat_db?schema=public"

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura_aqui_1234567890
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=sua_chave_refresh_secreta_aqui_0987654321
JWT_REFRESH_EXPIRES_IN=30d

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS
FRONTEND_URL=http://localhost:8080

# Logs
LOG_LEVEL=info
```

Criar `backend/.env.example`:
```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sispat_db?schema=public"

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=30d

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS
FRONTEND_URL=http://localhost:8080

# Logs
LOG_LEVEL=info
```

---

## 3. CONFIGURAÇÃO DO BANCO DE DADOS

### 🐳 **3.1 Docker Compose**

Criar `backend/docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: sispat_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sispat_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - sispat_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sispat_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - sispat_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  sispat_network:
    driver: bridge
```

### 🚀 **3.2 Iniciar Banco de Dados**

```bash
# Entrar no diretório backend
cd backend

# Subir containers Docker
docker-compose up -d

# Verificar status dos containers
docker-compose ps

# Verificar logs (se necessário)
docker-compose logs -f postgres

# Testar conexão com PostgreSQL
docker exec -it sispat_postgres psql -U postgres -d sispat_db -c "\l"
```

### 📄 **3.3 Script de Inicialização (Opcional)**

Criar `backend/init.sql`:
```sql
-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configurações de timezone
SET timezone = 'America/Sao_Paulo';

-- Criar usuário adicional (opcional)
-- CREATE USER sispat_admin WITH PASSWORD 'senha_forte_aqui';
-- GRANT ALL PRIVILEGES ON DATABASE sispat_db TO sispat_admin;
```

---

## 4. SCHEMA PRISMA

### 📊 **4.1 Schema Prisma Completo**

Criar `backend/src/prisma/schema.prisma`:
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// MODELOS PRINCIPAIS
// ============================================

model User {
  id                   String   @id @default(uuid())
  email                String   @unique
  name                 String
  password             String
  avatar               String?
  role                 String   // 'superuser', 'admin', 'supervisor', 'usuario', 'visualizador'
  responsibleSectors   String[] // Array de setores responsáveis
  municipalityId       String
  isActive             Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // Relacionamentos
  municipality         Municipality @relation(fields: [municipalityId], references: [id])
  patrimoniosCreated   Patrimonio[] @relation("PatrimonioCreator")
  imoveisCreated       Imovel[]     @relation("ImovelCreator")
  activityLogs         ActivityLog[]

  @@index([email])
  @@index([municipalityId])
  @@map("users")
}

model Municipality {
  id            String   @id @default(uuid())
  name          String
  state         String
  logoUrl       String?
  footerText    String?
  primaryColor  String   @default("#3B82F6")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relacionamentos
  users         User[]
  sectors       Sector[]
  locais        Local[]
  patrimonios   Patrimonio[]
  imoveis       Imovel[]
  
  @@map("municipalities")
}

model Sector {
  id             String   @id @default(uuid())
  name           String
  codigo         String   @unique
  description    String?
  municipalityId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relacionamentos
  municipality   Municipality @relation(fields: [municipalityId], references: [id])
  locais         Local[]
  patrimonios    Patrimonio[]
  imoveis        Imovel[]

  @@index([municipalityId])
  @@index([codigo])
  @@map("sectors")
}

model Local {
  id             String   @id @default(uuid())
  name           String
  description    String?
  sectorId       String
  municipalityId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relacionamentos
  sector         Sector       @relation(fields: [sectorId], references: [id])
  municipality   Municipality @relation(fields: [municipalityId], references: [id])
  patrimonios    Patrimonio[]

  @@index([sectorId])
  @@index([municipalityId])
  @@map("locais")
}

model TipoBem {
  id               String   @id @default(uuid())
  nome             String
  descricao        String?
  vidaUtilPadrao   Int?     // em anos
  taxaDepreciacao  Float?   // em %
  ativo            Boolean  @default(true)
  municipalityId   String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relacionamentos
  patrimonios      Patrimonio[]

  @@index([municipalityId])
  @@map("tipos_bens")
}

model AcquisitionForm {
  id             String   @id @default(uuid())
  nome           String
  descricao      String?
  ativo          Boolean  @default(true)
  municipalityId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relacionamentos
  patrimonios    Patrimonio[]

  @@index([municipalityId])
  @@map("formas_aquisicao")
}

model Patrimonio {
  id                      String    @id @default(uuid())
  numero_patrimonio       String    @unique
  descricao_bem           String
  tipo                    String
  marca                   String?
  modelo                  String?
  cor                     String?
  numero_serie            String?
  data_aquisicao          DateTime
  valor_aquisicao         Float
  quantidade              Int       @default(1)
  numero_nota_fiscal      String?
  forma_aquisicao         String
  setor_responsavel       String
  local_objeto            String
  status                  String    @default("ativo") // 'ativo', 'inativo', 'baixado', 'manutencao'
  situacao_bem            String?   // 'OTIMO', 'BOM', 'REGULAR', 'RUIM', 'PESSIMO'
  observacoes             String?
  fotos                   String[]  @default([])
  documentos              String[]  @default([])
  
  // Depreciação
  metodo_depreciacao      String?   @default("Linear")
  vida_util_anos          Int?
  valor_residual          Float?
  
  // Campos de auditoria
  createdAt               DateTime  @default(now())
  createdBy               String
  updatedAt               DateTime  @updatedAt
  updatedBy               String?
  
  // Relacionamentos
  municipalityId          String
  sectorId                String
  localId                 String?
  tipoId                  String?
  acquisitionFormId       String?
  
  municipality            Municipality      @relation(fields: [municipalityId], references: [id])
  sector                  Sector            @relation(fields: [sectorId], references: [id])
  local                   Local?            @relation(fields: [localId], references: [id])
  tipoBem                 TipoBem?          @relation(fields: [tipoId], references: [id])
  acquisitionForm         AcquisitionForm?  @relation(fields: [acquisitionFormId], references: [id])
  creator                 User              @relation("PatrimonioCreator", fields: [createdBy], references: [id])
  
  // Relacionamentos de movimentação
  historico               HistoricoEntry[]
  notes                   Note[]
  transferenciasOrigem    Transferencia[]   @relation("TransferenciaOrigem")
  transferenciasDestino   Transferencia[]   @relation("TransferenciaDestino")
  emprestimos             Emprestimo[]
  subPatrimonios          SubPatrimonio[]
  inventoryItems          InventoryItem[]
  manutencoes             ManutencaoTask[]

  @@index([numero_patrimonio])
  @@index([municipalityId])
  @@index([sectorId])
  @@index([status])
  @@map("patrimonios")
}

model Imovel {
  id                String    @id @default(uuid())
  numero_patrimonio String    @unique
  denominacao       String
  endereco          String
  setor             String
  data_aquisicao    DateTime
  valor_aquisicao   Float
  area_terreno      Float
  area_construida   Float
  latitude          Float?
  longitude         Float?
  descricao         String?
  observacoes       String?
  tipo_imovel       String?
  situacao          String?
  fotos             String[]  @default([])
  documentos        String[]  @default([])
  url_documentos    String?
  
  // Campos de auditoria
  createdAt         DateTime  @default(now())
  createdBy         String
  updatedAt         DateTime  @updatedAt
  updatedBy         String?
  
  // Relacionamentos
  municipalityId    String
  sectorId          String
  
  municipality      Municipality @relation(fields: [municipalityId], references: [id])
  sector            Sector       @relation(fields: [sectorId], references: [id])
  creator           User         @relation("ImovelCreator", fields: [createdBy], references: [id])
  
  historico         HistoricoEntry[]
  manutencoes       ManutencaoTask[]

  @@index([numero_patrimonio])
  @@index([municipalityId])
  @@index([sectorId])
  @@map("imoveis")
}

// ============================================
// MODELOS DE MOVIMENTAÇÃO E HISTÓRICO
// ============================================

model HistoricoEntry {
  id            String    @id @default(uuid())
  date          DateTime  @default(now())
  action        String
  details       String
  user          String
  origem        String?
  destino       String?
  
  patrimonioId  String?
  imovelId      String?
  
  patrimonio    Patrimonio? @relation(fields: [patrimonioId], references: [id], onDelete: Cascade)
  imovel        Imovel?     @relation(fields: [imovelId], references: [id], onDelete: Cascade)
  
  @@index([patrimonioId])
  @@index([imovelId])
  @@map("historico_entries")
}

model Note {
  id            String    @id @default(uuid())
  text          String
  date          DateTime  @default(now())
  userId        String
  userName      String
  patrimonioId  String
  
  patrimonio    Patrimonio @relation(fields: [patrimonioId], references: [id], onDelete: Cascade)
  
  @@index([patrimonioId])
  @@map("notes")
}

model Transferencia {
  id                  String    @id @default(uuid())
  patrimonioId        String
  numero_patrimonio   String
  descricao_bem       String
  setorOrigem         String
  setorDestino        String
  localOrigem         String
  localDestino        String
  motivo              String
  dataTransferencia   DateTime
  responsavelOrigem   String
  responsavelDestino  String
  status              String    @default("pendente") // 'pendente', 'aprovada', 'rejeitada'
  observacoes         String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  patrimonioOrigem    Patrimonio @relation("TransferenciaOrigem", fields: [patrimonioId], references: [id])
  patrimonioDestino   Patrimonio @relation("TransferenciaDestino", fields: [patrimonioId], references: [id])
  
  @@index([patrimonioId])
  @@index([status])
  @@map("transferencias")
}

model Emprestimo {
  id                String    @id @default(uuid())
  patrimonioId      String
  numero_patrimonio String
  descricao_bem     String
  responsavel       String
  setor             String
  dataEmprestimo    DateTime
  dataPrevDevolucao DateTime
  dataDevolucao     DateTime?
  motivo            String
  observacoes       String?
  status            String    @default("ativo") // 'ativo', 'devolvido', 'atrasado'
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  patrimonio        Patrimonio @relation(fields: [patrimonioId], references: [id])
  
  @@index([patrimonioId])
  @@index([status])
  @@map("emprestimos")
}

model SubPatrimonio {
  id                String    @id @default(uuid())
  patrimonioId      String
  descricao         String
  quantidade        Int
  valor             Float
  status            String    @default("ativo")
  observacoes       String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  patrimonio        Patrimonio @relation(fields: [patrimonioId], references: [id], onDelete: Cascade)
  
  @@index([patrimonioId])
  @@map("sub_patrimonios")
}

// ============================================
// INVENTÁRIO
// ============================================

model Inventory {
  id                  String    @id @default(uuid())
  title               String
  description         String?
  responsavel         String
  setor               String?
  local               String?
  scope               String    // 'sector', 'location', 'specific_location'
  specificLocationId  String?
  status              String    @default("em_andamento") // 'em_andamento', 'concluido', 'cancelado'
  dataInicio          DateTime  @default(now())
  dataFim             DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  items               InventoryItem[]
  
  @@index([status])
  @@index([setor])
  @@map("inventarios")
}

model InventoryItem {
  id              String    @id @default(uuid())
  inventoryId     String
  patrimonioId    String
  encontrado      Boolean   @default(false)
  observacoes     String?
  verificadoEm    DateTime?
  verificadoPor   String?
  
  inventory       Inventory  @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
  patrimonio      Patrimonio @relation(fields: [patrimonioId], references: [id])
  
  @@index([inventoryId])
  @@index([patrimonioId])
  @@map("inventory_items")
}

// ============================================
// MANUTENÇÃO
// ============================================

model ManutencaoTask {
  id                String    @id @default(uuid())
  patrimonioId      String?
  imovelId          String?
  tipo              String    // 'preventiva', 'corretiva', 'preditiva'
  titulo            String
  descricao         String
  prioridade        String    // 'baixa', 'media', 'alta', 'urgente'
  status            String    @default("pendente") // 'pendente', 'em_andamento', 'concluida', 'cancelada'
  responsavel       String?
  dataPrevista      DateTime
  dataConclusao     DateTime?
  custo             Float?
  observacoes       String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  patrimonio        Patrimonio? @relation(fields: [patrimonioId], references: [id])
  imovel            Imovel?     @relation(fields: [imovelId], references: [id])
  
  @@index([patrimonioId])
  @@index([imovelId])
  @@index([status])
  @@map("manutencao_tasks")
}

// ============================================
// SISTEMA E AUDITORIA
// ============================================

model ActivityLog {
  id          String    @id @default(uuid())
  userId      String
  action      String
  entityType  String?
  entityId    String?
  details     String?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())
  
  user        User      @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("activity_logs")
}

model Notification {
  id          String    @id @default(uuid())
  userId      String
  tipo        String
  titulo      String
  mensagem    String
  link        String?
  lida        Boolean   @default(false)
  createdAt   DateTime  @default(now())
  
  @@index([userId])
  @@index([lida])
  @@map("notifications")
}

model SystemConfiguration {
  id                      String    @id @default(uuid())
  autoBackupEnabled       Boolean   @default(false)
  backupFrequency         String    @default("daily")
  maintenanceMode         Boolean   @default(false)
  allowPublicSearch       Boolean   @default(true)
  maxUploadSize           Int       @default(10485760) // 10MB
  sessionTimeout          Int       @default(3600) // 1 hora
  passwordExpiryDays      Int       @default(90)
  requirePasswordChange   Boolean   @default(false)
  updatedAt               DateTime  @updatedAt
  
  @@map("system_configuration")
}
```

### 🔄 **4.2 Gerar Cliente Prisma**

```bash
# Gerar cliente Prisma
npx prisma generate

# Criar primeira migração
npx prisma migrate dev --name init

# Verificar banco de dados
npx prisma studio
```

---

## 5. ENDPOINTS DA API

### 🔐 **5.1 Servidor Principal**

Criar `backend/src/index.ts`:
```typescript
import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'

// Carregar variáveis de ambiente
dotenv.config()

// Importar rotas
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import patrimonioRoutes from './routes/patrimonioRoutes'
import imovelRoutes from './routes/imovelRoutes'
import sectorRoutes from './routes/sectorRoutes'
import localRoutes from './routes/localRoutes'
import tiposBensRoutes from './routes/tiposBensRoutes'
import acquisitionFormRoutes from './routes/acquisitionFormRoutes'
import transferRoutes from './routes/transferRoutes'
import emprestimoRoutes from './routes/emprestimoRoutes'
import inventoryRoutes from './routes/inventoryRoutes'
import manutencaoRoutes from './routes/manutencaoRoutes'
import dashboardRoutes from './routes/dashboardRoutes'
import publicRoutes from './routes/publicRoutes'

// Importar middlewares
import { errorHandler } from './middlewares/errorHandler'
import { requestLogger } from './middlewares/requestLogger'

// Criar aplicação Express
const app: Application = express()
const PORT = process.env.PORT || 3000

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Segurança
app.use(helmet())

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  })
)

// Body parsers
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Logger de requisições
app.use(requestLogger)

// ============================================
// ROTAS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Rotas da API
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/patrimonios', patrimonioRoutes)
app.use('/api/imoveis', imovelRoutes)
app.use('/api/sectors', sectorRoutes)
app.use('/api/locais', localRoutes)
app.use('/api/tipos-bens', tiposBensRoutes)
app.use('/api/formas-aquisicao', acquisitionFormRoutes)
app.use('/api/transferencias', transferRoutes)
app.use('/api/emprestimos', emprestimoRoutes)
app.use('/api/inventarios', inventoryRoutes)
app.use('/api/manutencao', manutencaoRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/public', publicRoutes)

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
  })
})

// Tratamento de erros
app.use(errorHandler)

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`📊 Ambiente: ${process.env.NODE_ENV}`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`)
})

export default app
```

### 🔐 **5.2 Middleware de Autenticação**

Criar `backend/src/middlewares/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    municipalityId: string
  }
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado' })
  }
}

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    next()
  }
}
```

### 🔐 **5.3 Controller de Autenticação**

Criar `backend/src/controllers/authController.ts`:
```typescript
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: { municipality: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return res.status(403).json({ error: 'Usuário inativo' })
    }

    // Gerar tokens
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        municipalityId: user.municipalityId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    )

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        details: `Login realizado por ${user.name}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    // Retornar dados (sem senha)
    const { password: _, ...userWithoutPassword } = user

    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { municipality: true },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        responsibleSectors: true,
        municipalityId: true,
        municipality: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    res.json(user)
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token não fornecido' })
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as any

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Usuário inválido ou inativo' })
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        municipalityId: user.municipalityId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({ accessToken })
  } catch (error) {
    console.error('Erro ao renovar token:', error)
    res.status(403).json({ error: 'Refresh token inválido' })
  }
}
```

### 📋 **5.4 Rotas de Autenticação**

Criar `backend/src/routes/authRoutes.ts`:
```typescript
import { Router } from 'express'
import { login, getMe, refreshAccessToken } from '../controllers/authController'
import { authenticateToken } from '../middlewares/auth'

const router = Router()

router.post('/login', login)
router.post('/refresh', refreshAccessToken)
router.get('/me', authenticateToken, getMe)

export default router
```

**CONTINUA NA PRÓXIMA PARTE...**

---

**⚠️ NOTA IMPORTANTE:**

Este guia é extenso e contém mais de 2000 linhas de código. Para facilitar, vou dividir em partes:

1. ✅ **PARTE 1 COMPLETA ACIMA**: Preparação, estrutura, banco de dados, schema Prisma
2. **PARTE 2**: Controllers completos (Patrimônio, Imóvel, Usuários, etc)
3. **PARTE 3**: Seed de dados e migração do mock-data
4. **PARTE 4**: Integração frontend e testes
5. **PARTE 5**: Deploy e produção

**Continue para receber as próximas partes? Digite "continuar" ou "próxima parte".**

