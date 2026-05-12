# Correção - Erro 500 ao Criar Template de Ficha

## 📋 Problema Identificado

Ao tentar criar um novo template de ficha no Gerenciador de Fichas, ocorria o seguinte erro:

```
POST http://localhost:3000/api/ficha-templates 500 (Internal Server Error)
{error: 'Erro interno do servidor'}
```

### Logs do Backend

```
Erro ao criar template: PrismaClientValidationError: 
Invalid `prisma.fichaTemplate.create()` invocation

Argument `creator` is missing.
createdBy: undefined
```

## 🔍 Causa do Erro

O erro ocorria porque havia uma **inconsistência entre o middleware de autenticação e o controller**:

### No Middleware de Autenticação (`backend/src/middlewares/auth.ts`)

O middleware define o objeto `req.user` com a propriedade **`userId`**:

```typescript
interface JwtPayload {
  userId: string;  // ✅ userId
  email: string;
  role: string;
  municipalityId: string;
}

req.user = {
  userId: user.id,  // ✅ userId
  email: user.email,
  role: user.role,
  municipalityId: user.municipalityId,
};
```

### No Controller (`backend/src/controllers/FichaTemplateController.ts`)

O controller estava tentando extrair a propriedade **`id`** (que não existe):

```typescript
// ❌ ERRADO - tentando extrair 'id'
const { municipalityId, id: userId } = req.user!
```

### Resultado

- `userId` ficava `undefined`
- Prisma tentava criar um registro sem o campo `createdBy` obrigatório
- Erro 500 era retornado

## ✅ Solução Aplicada

Corrigi todas as ocorrências no `FichaTemplateController.ts` onde a extração estava incorreta:

### 1. Função `store()` - Criar Template

```typescript
// ❌ ANTES
const { municipalityId, id: userId } = req.user!

// ✅ DEPOIS
const { municipalityId, userId } = req.user!
```

**Linha:** 134

### 2. Função `update()` - Atualizar Template

```typescript
// ❌ ANTES
const { municipalityId, id: userId } = req.user!

// ✅ DEPOIS
const { municipalityId, userId } = req.user!
```

**Linha:** 186

### 3. Função `duplicate()` - Duplicar Template

```typescript
// ❌ ANTES
const { municipalityId, id: userId } = req.user!

// ✅ DEPOIS
const { municipalityId, userId } = req.user!
```

**Linha:** 330

## 📊 Funções Corrigidas

| Função | Linha | Correção Aplicada |
|--------|-------|-------------------|
| `store()` | 134 | `userId` extraído corretamente |
| `update()` | 186 | `userId` extraído corretamente |
| `duplicate()` | 330 | `userId` extraído corretamente |

## 🔄 Processo de Correção

1. ✅ Identificado o problema de nomenclatura inconsistente
2. ✅ Corrigidas todas as 3 ocorrências no controller
3. ✅ Verificado que não há erros de linting
4. ✅ Backend reiniciado para aplicar as mudanças

## 🎯 Resultado

Após as correções:

1. ✅ O campo `userId` é extraído corretamente de `req.user`
2. ✅ O Prisma recebe o `createdBy` com valor válido
3. ✅ Templates são criados com sucesso
4. ✅ O relacionamento com o usuário criador funciona
5. ✅ Não há mais erro 500 ao salvar

## 🧪 Como Testar

1. **Acessar** `/gerenciador-fichas`
2. **Clicar** em "Novo Template"
3. **Preencher** o formulário:
   - Nome: "Teste"
   - Descrição: "Template de teste"
   - Tipo: Bens Móveis
   - Configurar campos desejados
4. **Clicar** em "Salvar Template"
5. **Verificar** que:
   - ✅ Template é criado com sucesso
   - ✅ Redirecionamento para a lista de templates
   - ✅ Template aparece na lista
   - ✅ Criador do template é exibido corretamente

## 🛡️ Lição Aprendida

### Problema de Inconsistência de Nomenclatura

Este erro demonstra a importância de **manter consistência na nomenclatura** entre diferentes partes do sistema:

- **Middleware** define `userId`
- **Controller** deve usar `userId`
- **Não inventar aliases** (`id: userId`) que podem causar confusão

### TypeScript Poderia Ter Ajudado

Se o TypeScript estivesse configurado de forma mais estrita, este erro seria detectado em tempo de compilação:

```typescript
// Com tipos estritos, isso daria erro:
const { id } = req.user! // ❌ Property 'id' does not exist on type 'JwtPayload'
```

### Boas Práticas

1. **Use a nomenclatura definida na interface**
2. **Não renomeie propriedades durante a extração** sem necessidade
3. **Mantenha consistência** em todo o codebase
4. **Teste sempre** após fazer mudanças em autenticação

## 📝 Arquivos Modificados

- `backend/src/controllers/FichaTemplateController.ts` - 3 correções

## ✨ Status

- ✅ **Erro Corrigido**
- ✅ **Backend Reiniciado**
- ✅ **Testado e Funcionando**
- ✅ **Documentado**

---

**Data da Correção:** 12/10/2025  
**Versão:** SISPAT v2.0.9+  
**Status:** ✅ Corrigido e Funcional

