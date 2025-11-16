# 🔧 Correção - Detecção Automática de Estrutura do Frontend

## 📋 Problema Identificado

O script `atualizar-producao.sh` estava falhando porque não encontrava o diretório `frontend/` em produção:

```
❌ Diretório frontend não encontrado: /var/www/sispat/frontend
```

## 🔍 Causa

Em produção, a estrutura do projeto pode variar:
- Alguns ambientes têm `frontend/` como subdiretório
- Outros têm o código fonte na raiz com `src/` e `package.json`
- Outros já têm apenas o `dist/` buildado

## ✅ Solução Implementada

O script agora detecta automaticamente a estrutura do frontend em diferentes configurações:

### 1. **Detecção Automática**

O script verifica na seguinte ordem:
1. `frontend/` - Subdiretório padrão
2. `src/` + `package.json` na raiz - Estrutura monorepo
3. `dist/` - Frontend já buildado

### 2. **Função de Detecção**

```bash
detect_frontend_structure() {
    if [ -d "$FRONTEND_DIR" ]; then
        # Estrutura: /var/www/sispat/frontend/
        FRONTEND_WORK_DIR="$FRONTEND_DIR"
        FRONTEND_BUILD_DIR="$FRONTEND_DIR/dist"
        return 0
    elif [ -d "$FRONTEND_SRC_DIR" ] && [ -f "$PROJECT_DIR/package.json" ]; then
        # Estrutura: /var/www/sispat/src/ + package.json
        FRONTEND_WORK_DIR="$PROJECT_DIR"
        FRONTEND_BUILD_DIR="$PROJECT_DIR/dist"
        return 0
    elif [ -d "$FRONTEND_DIST_DIR" ]; then
        # Estrutura: /var/www/sispat/dist/ (já buildado)
        FRONTEND_WORK_DIR="$PROJECT_DIR"
        FRONTEND_BUILD_DIR="$FRONTEND_DIST_DIR"
        print_warning "Frontend já está buildado em dist/. Pulando rebuild."
        return 1
    else
        return 1
    fi
}
```

### 3. **Melhorias no Backup**

- Detecta automaticamente onde está o frontend
- Faz backup do `dist/` se existir
- Faz backup do código fonte se existir
- Continua mesmo se frontend não for encontrado

### 4. **Melhorias no Rebuild**

- Detecta estrutura antes de tentar rebuild
- Se já estiver buildado, informa e continua
- Se não encontrar, lista locais verificados e continua
- Não interrompe o script se frontend não for encontrado

### 5. **Melhorias nas Verificações**

- Verifica estrutura detectada
- Mostra caminhos corretos
- Informa se `dist/` existe e seu tamanho
- Verifica `index.html` no local correto

## 🚀 Como Usar Agora

### Executar o Script

```bash
cd /var/www/sispat
chmod +x scripts/atualizar-producao.sh
./scripts/atualizar-producao.sh
```

### O Script Agora:

1. ✅ Detecta automaticamente a estrutura
2. ✅ Faz backup do que encontrar
3. ✅ Atualiza código via Git
4. ✅ Rebuild apenas se necessário
5. ✅ Continua mesmo se frontend não for encontrado
6. ✅ Mostra mensagens claras sobre o que está fazendo

## 📊 Estruturas Suportadas

### Estrutura 1: Frontend como Subdiretório
```
/var/www/sispat/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── dist/ (após build)
└── backend/
```

### Estrutura 2: Monorepo (Raiz)
```
/var/www/sispat/
├── src/          (código frontend)
├── package.json  (na raiz)
├── dist/         (após build)
└── backend/
```

### Estrutura 3: Apenas Build
```
/var/www/sispat/
├── dist/         (frontend buildado)
└── backend/
```

## 🔍 Mensagens do Script

### Se Frontend Não For Encontrado:

```
⚠️  Estrutura do frontend não encontrada!
ℹ️  Locais verificados:
  - /var/www/sispat/frontend
  - /var/www/sispat/src (com package.json na raiz)
  - /var/www/sispat/dist
⚠️  Pulando rebuild do frontend. Continuando com outras atualizações...
```

### Se Frontend Já Estiver Buildado:

```
⚠️  Frontend já está buildado em dist/. Não é necessário rebuild.
ℹ️  Se precisar rebuildar, execute manualmente: cd /var/www/sispat && npm run build
```

## ✅ Resultado

O script agora:
- ✅ Funciona com diferentes estruturas de projeto
- ✅ Não falha se frontend não for encontrado
- ✅ Continua com outras atualizações (Git, backend, etc.)
- ✅ Fornece mensagens claras sobre o que está fazendo
- ✅ Permite execução mesmo em ambientes com estrutura diferente

## 📝 Próximos Passos

Se o frontend não for encontrado automaticamente:

1. **Verificar estrutura atual:**
   ```bash
   cd /var/www/sispat
   ls -la
   ```

2. **Se frontend estiver em outro local, ajustar variáveis no script:**
   ```bash
   # Editar scripts/atualizar-producao.sh
   # Ajustar FRONTEND_DIR conforme necessário
   ```

3. **Ou fazer rebuild manual:**
   ```bash
   cd /var/www/sispat
   # Se frontend está em subdiretório:
   cd frontend && npm run build
   
   # Se frontend está na raiz:
   npm run build
   ```

## 🔄 Atualizar Script

Para obter a versão corrigida:

```bash
cd /var/www/sispat
git pull origin main
chmod +x scripts/atualizar-producao.sh
./scripts/atualizar-producao.sh
```

---

**Commit:** `dc6fc9e` - fix: Melhorar detecção automática de estrutura do frontend  
**Data:** 2025-11-16  
**Status:** ✅ Corrigido e Testado

