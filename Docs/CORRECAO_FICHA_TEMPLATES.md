# Correção - Erro 500 no Gerenciador de Fichas

## 📋 Problema Identificado

Ao acessar a página do Gerenciador de Fichas (`/gerenciador-fichas`), ocorria o seguinte erro:

```
GET http://localhost:3000/api/ficha-templates 500 (Internal Server Error)
{error: 'Erro interno do servidor'}
```

## 🔍 Causa do Erro

O controller `FichaTemplateController` estava tentando acessar a tabela `fichaTemplate` no Prisma, mas **essa tabela não existia no banco de dados**. 

O modelo `FichaTemplate` não estava definido no schema do Prisma (`backend/prisma/schema.prisma`), portanto, quando o backend tentava fazer consultas na tabela, o Prisma retornava um erro 500.

## ✅ Solução Aplicada

### 1. Adição do Modelo no Schema do Prisma

Foi adicionado o modelo `FichaTemplate` no arquivo `backend/prisma/schema.prisma`:

```prisma
model FichaTemplate {
  id             String   @id @default(uuid())
  name           String
  description    String?
  type           String // 'bens' ou 'imoveis'
  isDefault      Boolean  @default(false)
  isActive       Boolean  @default(true)
  config         Json // Configurações do template (header, sections, signatures, styling)
  municipalityId String
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relacionamentos
  creator User @relation("FichaTemplateCreator", fields: [createdBy], references: [id])

  @@index([municipalityId])
  @@index([type])
  @@index([isDefault])
  @@index([isActive])
  @@map("ficha_templates")
}
```

### 2. Atualização do Modelo User

Foi adicionada a relação `fichaTemplates` no modelo `User`:

```prisma
model User {
  // ... outros campos
  fichaTemplates     FichaTemplate[] @relation("FichaTemplateCreator")
  // ...
}
```

### 3. Sincronização com o Banco de Dados

Foram executados os seguintes comandos:

```bash
# Parar o backend
taskkill /F /IM node.exe

# Sincronizar o schema com o banco de dados
cd backend
npx prisma db push

# Regenerar o Prisma Client
npx prisma generate

# Reiniciar o backend
npm run dev
```

## 📊 Estrutura da Tabela Criada

A tabela `ficha_templates` foi criada com os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | String | Nome do template |
| `description` | String? | Descrição opcional |
| `type` | String | Tipo: 'bens' ou 'imoveis' |
| `isDefault` | Boolean | Se é o template padrão |
| `isActive` | Boolean | Se está ativo |
| `config` | JSON | Configurações do template |
| `municipalityId` | String | ID do município |
| `createdBy` | String | ID do criador |
| `createdAt` | DateTime | Data de criação |
| `updatedAt` | DateTime | Data de atualização |

## 🎯 Índices Criados

Para otimizar as consultas, foram criados os seguintes índices:

- `municipalityId` - Para filtrar templates por município
- `type` - Para filtrar por tipo (bens/imóveis)
- `isDefault` - Para encontrar templates padrão rapidamente
- `isActive` - Para filtrar templates ativos

## ✨ Resultado

Após as correções:

1. ✅ A tabela `ficha_templates` foi criada no banco de dados
2. ✅ O Prisma Client foi regenerado com o novo modelo
3. ✅ O backend foi reiniciado com sucesso
4. ✅ A rota `/api/ficha-templates` agora funciona corretamente
5. ✅ O Gerenciador de Fichas carrega sem erros

## 🔄 Próximos Passos

Agora que a infraestrutura está pronta, você pode:

1. Acessar `/gerenciador-fichas` para visualizar a página
2. Criar novos templates de fichas personalizadas
3. Configurar templates padrão para bens móveis e imóveis
4. Personalizar layout, campos, assinaturas e estilos dos templates

## 📝 Notas Técnicas

- O campo `config` é do tipo JSON, permitindo armazenar configurações complexas e flexíveis
- Cada template é vinculado a um município (`municipalityId`)
- Cada template é vinculado a um usuário criador (`createdBy`)
- Apenas um template pode ser padrão por tipo (bens ou imóveis) por município
- Os índices garantem performance nas consultas mais comuns

---

**Data da Correção:** 12/10/2025
**Versão:** SISPAT v2.0.9+
**Status:** ✅ Corrigido e Funcional

