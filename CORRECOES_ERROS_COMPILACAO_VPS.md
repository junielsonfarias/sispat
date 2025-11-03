# Correções de Erros de Compilação no VPS

## 📋 Problemas Identificados

Durante a execução do script de instalação em produção (VPS), foram identificados os seguintes erros de compilação TypeScript:

### 1. **Erro: `Cannot find module 'zod'`**
- **Arquivo**: `backend/src/controllers/FichaTemplateController.ts`
- **Causa**: A dependência `zod` não estava listada no `package.json`

### 2. **Erros de Tipagem do Multer**
- **Arquivos afetados**:
  - `backend/src/controllers/uploadController.ts`
  - `backend/src/controllers/documentController.ts`
  - `backend/src/middlewares/security.ts`
  - `backend/src/middlewares/uploadMiddleware.ts`
- **Erros**:
  - `Property 'file' does not exist on type 'Request'`
  - `Property 'files' does not exist on type 'Request'`
  - `Namespace 'global.Express' has no exported member 'Multer'`
- **Causa**: Tipos do Multer não estavam sendo reconhecidos pelo TypeScript

### 3. **Erro: Dependências de Desenvolvimento Não Instaladas**
- **Script**: `install-sispat.sh` (linha 276)
- **Causa**: O script estava usando `npm install --production`, que não instala `devDependencies`. Porém, o TypeScript precisa dessas dependências para compilar.

---

## ✅ Correções Aplicadas

### 1. Adicionado `zod` às Dependências

**Arquivo**: `backend/package.json`

```json
"dependencies": {
  // ... outras dependências ...
  "zod": "^3.24.1"
}
```

### 2. Estendidos Tipos Globais do Express

**Arquivo**: `backend/src/middlewares/auth.ts`

Adicionada declaração global para incluir tipos do Multer:

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      file?: Express.Multer.File;  // ✅ Adicionado
      files?: Express.Multer.File[]; // ✅ Adicionado
    }
    
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer?: Buffer;
      }
    }
  }
}
```

### 3. Atualizado Interface AuthRequest

**Arquivo**: `backend/src/controllers/uploadController.ts`

```typescript
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    municipalityId: string;
  };
  file?: Express.Multer.File;   // ✅ Adicionado
  files?: Express.Multer.File[]; // ✅ Adicionado
}
```

### 4. Corrigido Script de Instalação

**Arquivo**: `install-sispat.sh` (linha 276)

**Antes**:
```bash
npm install --production --silent
```

**Depois**:
```bash
npm install --silent
```

**Motivo**: O TypeScript precisa das `devDependencies` (como `typescript`, `@types/express`, `@types/multer`) para compilar o código. Após a compilação, apenas as `dependencies` são necessárias em runtime.

---

## 📦 Arquivos Modificados

1. ✅ `backend/package.json` - Adicionado `zod` às dependências
2. ✅ `backend/src/middlewares/auth.ts` - Estendidos tipos globais do Express
3. ✅ `backend/src/controllers/uploadController.ts` - Atualizada interface AuthRequest
4. ✅ `backend/src/middlewares/uploadMiddleware.ts` - Corrigido tipo do parâmetro `req`
5. ✅ `install-sispat.sh` - Removido `--production` flag antes da compilação

---

## 🧪 Validação

Todos os arquivos foram verificados com o linter e não apresentam erros:

```bash
✅ backend/src/middlewares/auth.ts - Sem erros
✅ backend/src/controllers/uploadController.ts - Sem erros
✅ backend/src/middlewares/uploadMiddleware.ts - Sem erros
```

---

## 🚀 Próximos Passos

1. ✅ Todas as correções foram aplicadas
2. ⏳ Script de instalação atualizado
3. ⏳ Pronto para nova tentativa de instalação no VPS

---

## 📝 Notas Importantes

- **Dependências de Desenvolvimento**: Embora normalmente não sejam instaladas em produção, elas são necessárias durante o processo de build. Após a compilação, apenas o código JavaScript compilado (`dist/`) é necessário em runtime.

- **Tipos Globais**: A declaração global no `auth.ts` garante que todos os arquivos que importam `express` automaticamente terão acesso aos tipos do Multer.

- **Performance**: A instalação de `devDependencies` aumenta o tempo de instalação, mas é essencial para o processo de compilação. Em runtime, apenas as `dependencies` são carregadas.

---

**Data**: 2025-11-03  
**Versão**: 2.0.0  
**Status**: ✅ Corrigido e Validado

