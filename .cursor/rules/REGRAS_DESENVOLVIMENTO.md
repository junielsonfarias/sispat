# 🏛️ REGRAS DE DESENVOLVIMENTO - SISPAT

## 📋 **VISÃO GERAL**

Este documento estabelece as regras e padrões obrigatórios para desenvolvimento no projeto SISPAT.

---

## 🏗️ **ARQUITETURA E PADRÕES**

### **1. Estrutura de Arquivos**

#### **Frontend (src/)**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (Button, Input, etc.)
│   ├── forms/          # Componentes de formulário
│   └── layout/         # Componentes de layout
├── contexts/           # Context API
├── hooks/              # Custom hooks
├── pages/              # Páginas da aplicação
├── services/           # Serviços de API
├── types/              # Definições TypeScript
├── utils/              # Utilitários
└── lib/                # Bibliotecas e configurações
```

#### **Backend (server/)**

```
server/
├── routes/             # Rotas da API
├── middleware/         # Middlewares
├── utils/              # Utilitários
├── database/           # Conexão e queries
├── services/           # Lógica de negócio
└── config/             # Configurações
```

### **2. Convenções de Nomenclatura**

#### **Arquivos e Pastas**

```typescript
// ✅ CORRETO
components/
├── PatrimonioCard.tsx
├── PatrimonioForm.tsx
└── PatrimonioList.tsx

// ❌ INCORRETO
components/
├── patrimonio-card.tsx
├── patrimonio_form.tsx
└── Patrimonio-list.tsx
```

#### **Variáveis e Funções**

```typescript
// ✅ CORRETO
const patrimonioList = [];
const fetchPatrimonios = async () => {};
const isPatrimonioValid = (patrimonio: Patrimonio) => {};

// ❌ INCORRETO
const patrimonio_list = [];
const fetch_patrimonios = async () => {};
const is_patrimonio_valid = (patrimonio: Patrimonio) => {};
```

#### **Componentes React**

```typescript
// ✅ CORRETO
export const PatrimonioCard = ({ patrimonio }: PatrimonioCardProps) => {
  return <div>...</div>
}

// ❌ INCORRETO
export const patrimonioCard = ({ patrimonio }: PatrimonioCardProps) => {
  return <div>...</div>
}
```

---

## 🔧 **CONFIGURAÇÕES OBRIGATÓRIAS**

### **1. Variáveis de Ambiente**

#### **Arquivo .env**

```bash
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=6273

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura

# Servidor
PORT=3001
NODE_ENV=development

# Frontend
VITE_BACKEND_URL=http://localhost:3001
```

#### **Validação de Variáveis**

```javascript
// server/index.js
if (!process.env.JWT_SECRET) {
  console.error('🚨 ERRO CRÍTICO: JWT_SECRET não encontrado');
  process.exit(1);
}

if (!process.env.DB_PASSWORD) {
  console.error('🚨 ERRO CRÍTICO: DB_PASSWORD não configurado');
  process.exit(1);
}
```

### **2. Configuração do Vite**

#### **vite.config.ts**

```typescript
export default defineConfig({
  server: {
    host: '::',
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 🚀 **PADRÕES DE DESENVOLVIMENTO**

### **1. Rotas Backend**

#### **Estrutura Obrigatória**

```javascript
// ✅ CORRETO
import express from 'express';
import { authenticateToken, requireSupervisor } from '../middleware/auth.js';
import { paginationMiddleware } from '../middleware/pagination.js';
import { patrimoniosCacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Rotas públicas (sem autenticação)
router.get('/public', async (req, res) => {
  // Implementação
});

// Middleware de autenticação para rotas protegidas
router.use(authenticateToken);

// Rotas protegidas
router.get('/', patrimoniosCacheMiddleware, paginationMiddleware, async (req, res) => {
  // Implementação
});

export default router;
```

#### **Tratamento de Erros**

```javascript
// ✅ CORRETO
try {
  const result = await someOperation();
  res.json({ success: true, data: result });
} catch (error) {
  console.error('❌ Erro na operação:', error);
  console.error('❌ Stack trace:', error.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: error.message,
  });
}
```

### **2. Context API Frontend**

#### **Ordem dos Providers**

```typescript
// ✅ CORRETO - Ordem obrigatória
<AuthProvider>
  <NotificationProvider>
    <PermissionProvider>
      <VersionProvider>
        <CustomizationProvider>
          <ThemeProvider>
            <SectorProvider>
              <LocalProvider>
                <PatrimonioProvider>
                  {/* Outros providers */}
                  {children}
                </PatrimonioProvider>
              </LocalProvider>
            </SectorProvider>
          </ThemeProvider>
        </CustomizationProvider>
      </VersionProvider>
    </PermissionProvider>
  </NotificationProvider>
</AuthProvider>
```

#### **Estrutura do Context**

```typescript
// ✅ CORRETO
interface PatrimonioContextType {
  patrimonios: Patrimonio[]
  isLoading: boolean
  error: string | null
  fetchPatrimonios: () => Promise<void>
  addPatrimonio: (patrimonio: Patrimonio) => Promise<void>
}

export const PatrimonioProvider = ({ children }: { children: ReactNode }) => {
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPatrimonios = useCallback(async () => {
    if (!user) return

    console.log('🔄 Buscando patrimônios para usuário:', user.name)
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.get<Patrimonio[]>('/patrimonios')
      console.log('✅ Patrimônios recebidos:', data.length, 'itens')
      setPatrimonios(data)
    } catch (err) {
      console.error('❌ Erro ao buscar patrimônios:', err)
      setError('Falha ao carregar patrimônios.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const value = useMemo(() => ({
    patrimonios,
    isLoading,
    error,
    fetchPatrimonios
  }), [patrimonios, isLoading, error, fetchPatrimonios])

  return (
    <PatrimonioContext.Provider value={value}>
      {children}
    </PatrimonioContext.Provider>
  )
}
```

### **3. Banco de Dados**

#### **Soft Delete Obrigatório**

```sql
-- ✅ CORRETO - Sempre incluir deleted_at
CREATE TABLE patrimonios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... outros campos
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ CORRETO - Queries devem filtrar deleted_at
SELECT * FROM patrimonios WHERE deleted_at IS NULL
```

#### **Joins com Municipality**

```sql
-- ✅ CORRETO - Sempre incluir municipality_id
SELECT p.*, m.name as municipality_name
FROM patrimonios p
LEFT JOIN municipalities m ON p.municipality_id = m.id
WHERE p.municipality_id = $1 AND p.deleted_at IS NULL
```

#### **Validação de JSON Fields**

```javascript
// ✅ CORRETO - Validar antes de salvar
function validateImages(images, maxSizeInMB = 5) {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  const validImages = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const image = images[i];
      if (typeof image === 'string' && image.startsWith('data:image')) {
        const validated = validateAndLimitImageSize(image, maxSizeInMB);
        if (validated) {
          validImages.push(validated);
        }
      } else {
        validImages.push(image);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao validar imagem ${i + 1}:`, error.message);
    }
  }

  return validImages;
}
```

---

## 🔍 **DEBUG E TESTES**

### **1. Rotas de Debug Obrigatórias**

#### **Testes de Conexão**

```javascript
// ✅ OBRIGATÓRIO - Sempre implementar
router.get('/test-connection', async (req, res) => {
  try {
    const result = await getRow('SELECT 1 as test');
    res.json({ success: true, message: 'Conexão OK', result });
  } catch (error) {
    res.status(500).json({ error: 'Erro de conexão', details: error.message });
  }
});
```

#### **Testes de Estrutura**

```javascript
// ✅ OBRIGATÓRIO - Verificar estrutura da tabela
router.get('/test-table', async (req, res) => {
  try {
    const tableExists = await getRow(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patrimonios'
      ) as exists
    `);

    if (!tableExists.exists) {
      return res.status(404).json({ error: 'Tabela não existe' });
    }

    const columns = await getRows(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'patrimonios'
      ORDER BY ordinal_position
    `);

    res.json({
      success: true,
      tableExists: tableExists.exists,
      columns: columns,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar tabela', details: error.message });
  }
});
```

### **2. Comandos de Teste**

#### **Scripts de Teste**

```bash
# ✅ OBRIGATÓRIO - Sempre testar antes de commitar
curl http://localhost:3001/api/patrimonios/test-connection
curl http://localhost:3001/api/patrimonios/test-table
curl http://localhost:3001/api/patrimonios/test-execute-pagination
```

---

## 📊 **MONITORAMENTO E LOGS**

### **1. Logs Obrigatórios**

#### **Backend**

```javascript
// ✅ OBRIGATÓRIO - Sempre incluir
console.log('🔄 Operação iniciada');
console.log('📋 Dados recebidos:', data);
console.log('✅ Operação concluída');
console.error('❌ Erro:', error);
console.error('❌ Stack trace:', error.stack);
```

#### **Frontend**

```javascript
// ✅ OBRIGATÓRIO - Sempre incluir
console.log('🔄 Buscando dados...');
console.log('✅ Dados recebidos:', data);
console.error('❌ Erro:', error);
```

### **2. Performance Monitoring**

#### **Backend**

```javascript
// ✅ OBRIGATÓRIO - Monitorar performance
const startTime = Date.now();

// ... operação

const duration = Date.now() - startTime;
logPerformance('Operação executada', duration, {
  itemCount: results.length,
  operation: 'fetch_patrimonios',
});
```

#### **Frontend**

```javascript
// ✅ OBRIGATÓRIO - Monitorar APIs
const startTime = performance.now();

try {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const duration = performance.now() - startTime;
  performanceMonitor.recordAPIMetric(endpoint, 'GET', duration, response.status, response.ok);
  return handleResponse(response);
} catch (error) {
  const duration = performance.now() - startTime;
  performanceMonitor.recordAPIMetric(endpoint, 'GET', duration, 0, false);
  throw error;
}
```

---

## 🔒 **SEGURANÇA**

### **1. Autenticação**

#### **Middleware Obrigatório**

```javascript
// ✅ OBRIGATÓRIO - Todas as rotas protegidas
router.use(authenticateToken);

// ✅ OBRIGATÓRIO - Verificar municipality_id
if (req.user.role !== 'superuser' && patrimonio.municipality_id !== req.user.municipality_id) {
  return res.status(403).json({ error: 'Acesso negado' });
}
```

### **2. Validação de Inputs**

#### **Sanitização**

```javascript
// ✅ OBRIGATÓRIO - Sempre validar inputs
function validatePatrimonioData(data) {
  const errors = [];

  if (!data.numero_patrimonio || data.numero_patrimonio.trim().length === 0) {
    errors.push('Número do patrimônio é obrigatório');
  }

  if (!data.descricao || data.descricao.trim().length === 0) {
    errors.push('Descrição é obrigatória');
  }

  if (data.valor_aquisicao && isNaN(parseFloat(data.valor_aquisicao))) {
    errors.push('Valor de aquisição deve ser um número válido');
  }

  return errors;
}
```

#### **Validação de Arquivos**

```javascript
// ✅ OBRIGATÓRIO - Validar uploads
function validateFileUpload(file, maxSize = 5 * 1024 * 1024) {
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Máximo 5MB.');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido.');
  }

  return true;
}
```

---

## 📝 **DOCUMENTAÇÃO**

### **1. Comentários Obrigatórios**

#### **Funções Complexas**

```javascript
/**
 * Busca patrimônios com paginação cursor-based
 * @param {Object} params - Parâmetros de paginação
 * @param {number} params.limit - Limite de itens por página (máx: 100)
 * @param {string} params.cursor - Cursor para paginação
 * @param {string} params.sort - Campo para ordenação
 * @param {string} params.order - Direção da ordenação (ASC/DESC)
 * @param {string} params.search - Termo de busca
 * @param {Object} params.filters - Filtros específicos
 * @returns {Promise<Object>} Resultado paginado com items e metadata
 * @throws {Error} Se houver erro na query ou validação
 */
export async function executePaginatedQuery(queryFn, baseQuery, params, tableName = 't') {
  // Implementação
}
```

#### **Componentes React**

```typescript
/**
 * Card de exibição de patrimônio
 * @param {Patrimonio} patrimonio - Dados do patrimônio
 * @param {boolean} showActions - Se deve mostrar ações (editar/excluir)
 * @param {Function} onEdit - Callback para edição
 * @param {Function} onDelete - Callback para exclusão
 */
export const PatrimonioCard = ({
  patrimonio,
  showActions = false,
  onEdit,
  onDelete,
}: PatrimonioCardProps) => {
  // Implementação
};
```

### **2. README.md**

#### **Estrutura Obrigatória**

```markdown
# 🏛️ SISPAT - Sistema de Gestão Patrimonial

## 🚀 Características Principais

- Lista de funcionalidades principais

## 🛠️ Tecnologias Utilizadas

- Lista de tecnologias

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- pnpm

## 🚀 Instalação e Configuração

- Passos detalhados de instalação

## 🔧 Comandos de Desenvolvimento

- Comandos para desenvolvimento

## 🧪 Testes

- Como executar testes

## 📝 Troubleshooting

- Problemas comuns e soluções
```

---

## 🚨 **PROBLEMAS CONHECIDOS E SOLUÇÕES**

### **1. Erro addNotification não definido**

**Solução**: Importar `useNotifications` e usar try-catch para acesso seguro

### **2. Erro de porta em uso**

**Solução**: `taskkill /f /im node.exe` e reiniciar servidores

### **3. Erro 500 na API /patrimonios**

**Solução**: Verificar `executePaginatedQuery` e `buildPaginatedQuery`

### **4. Erro de importação dinâmica**

**Solução**: Verificar se arquivos existem e estão sendo importados corretamente

---

## 🎯 **COMANDOS DE DESENVOLVIMENTO**

```bash
# Instalação
pnpm install

# Desenvolvimento
npm run dev      # Frontend (porta 8080)
npm run server   # Backend (porta 3001)

# Setup
npm run setup    # Configuração inicial
npm run db:migrate  # Migração do banco
npm run db:seed     # Dados iniciais

# Testes
npm run test     # Testes unitários
npm run test:e2e # Testes end-to-end

# Debug
curl http://localhost:3001/api/patrimonios/test-connection
curl http://localhost:3001/api/patrimonios/test-execute-pagination
```

---

## 📈 **MÉTRICAS DE QUALIDADE**

- **Cobertura de testes**: Mínimo 70%
- **Performance**: Tempo de resposta < 1000ms
- **Segurança**: Validação em todas as entradas
- **Acessibilidade**: WCAG 2.1 AA compliance
- **Logs**: 100% das operações críticas logadas

---

## 🔄 **WORKFLOW DE DESENVOLVIMENTO**

1. **Criar branch** para nova funcionalidade
2. **Implementar** seguindo padrões estabelecidos
3. **Testar** com rotas de debug
4. **Documentar** mudanças
5. **Fazer commit** com mensagem descritiva
6. **Criar PR** para revisão
7. **Deploy** após aprovação

---

**📋 Estas regras são obrigatórias para todos os desenvolvedores do projeto SISPAT.**

**🔄 Última Atualização**: 25/08/2025  
**📝 Próxima Revisão**: 30/08/2025
