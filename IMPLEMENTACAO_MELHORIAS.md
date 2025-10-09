# 🚀 GUIA DE IMPLEMENTAÇÃO DAS MELHORIAS - SISPAT 2.0

## 📋 **MELHORIAS PRONTAS PARA IMPLEMENTAR**

Este documento contém todas as melhorias que podem ser implementadas no sistema SISPAT.

---

## ✅ **MELHORIA 1: Lazy Loading de Rotas**

### **Arquivo: `src/App.tsx`**

Adicione no início do arquivo, após os imports normais:

```typescript
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy loading das páginas
const BensEdit = lazy(() => import('@/pages/bens/BensEdit'))
const BensView = lazy(() => import('@/pages/bens/BensView'))
const BensCreate = lazy(() => import('@/pages/bens/BensCreate'))
const ImoveisEdit = lazy(() => import('@/pages/imoveis/ImoveisEdit'))
const ImoveisView = lazy(() => import('@/pages/imoveis/ImoveisView'))
const ImoveisCreate = lazy(() => import('@/pages/imoveis/ImoveisCreate'))
const RelatoriosPage = lazy(() => import('@/pages/ferramentas/Relatorios'))
const ReportView = lazy(() => import('@/pages/ferramentas/ReportView'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)
```

Envolva as rotas com Suspense:

```typescript
<Route path="/bens-cadastrados">
  <Route index element={<BensCadastrados />} />
  <Route path="novo" element={
    <Suspense fallback={<PageLoader />}>
      <BensCreate />
    </Suspense>
  } />
  <Route path="editar/:id" element={
    <Suspense fallback={<PageLoader />}>
      <BensEdit />
    </Suspense>
  } />
  <Route path="ver/:id" element={
    <Suspense fallback={<PageLoader />}>
      <BensView />
    </Suspense>
  } />
</Route>
```

---

## ✅ **MELHORIA 2: Componente Skeleton**

### **Arquivo: `src/components/ui/skeleton.tsx`** (criar se não existir)

```typescript
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

### **Uso nos componentes:**

```typescript
// Em BensCadastrados.tsx, BensView.tsx, etc.
import { Skeleton } from '@/components/ui/skeleton'

// No render:
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
) : (
  // ... conteúdo normal
)}
```

---

## ✅ **MELHORIA 3: Script de Backup Automático**

### **Arquivo: `scripts/auto-backup.sh`** (criar)

```bash
#!/bin/bash

# ===================================================
# Script de Backup Automático - SISPAT 2.0
# ===================================================

# Configurações
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/sispat"
DB_NAME="sispat_db"
DB_USER="postgres"
UPLOADS_DIR="./backend/uploads"
RETENTION_DAYS=30

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

echo "🔄 Iniciando backup - $TIMESTAMP"

# 1. Backup do Banco de Dados
echo "📊 Fazendo backup do banco de dados..."
pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
    echo "✅ Backup do banco concluído"
else
    echo "❌ Erro no backup do banco"
    exit 1
fi

# 2. Backup dos Uploads
echo "📁 Fazendo backup dos uploads..."
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" $UPLOADS_DIR

if [ $? -eq 0 ]; then
    echo "✅ Backup dos uploads concluído"
else
    echo "❌ Erro no backup dos uploads"
    exit 1
fi

# 3. Limpar backups antigos
echo "🧹 Removendo backups com mais de $RETENTION_DAYS dias..."
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup concluído com sucesso - $TIMESTAMP"

# 4. (Opcional) Enviar para cloud
# aws s3 cp $BACKUP_DIR s3://meu-bucket/backups/ --recursive
```

### **Dar permissão de execução:**

```bash
chmod +x scripts/auto-backup.sh
```

### **Agendar no crontab:**

```bash
crontab -e

# Adicionar linha:
0 2 * * * /path/to/sispat/scripts/auto-backup.sh >> /var/log/sispat-backup.log 2>&1
```

---

## ✅ **MELHORIA 4: Modo Escuro**

### **Arquivo: `src/contexts/ThemeContext.tsx`** (criar)

```typescript
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'system'
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
```

### **Adicionar ao `tailwind.config.ts`:**

```typescript
export default {
  darkMode: ['class'],
  // ... resto da config
}
```

### **Adicionar no `src/main.tsx`:**

```typescript
import { ThemeProvider } from '@/contexts/ThemeContext'

root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
```

### **Componente de Toggle (criar `src/components/ThemeToggle.tsx`):**

```typescript
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### **Adicionar no Header:**

```typescript
import { ThemeToggle } from '@/components/ThemeToggle'

// No render do Header:
<div className="flex items-center gap-2">
  <ThemeToggle />
  {/* ... outros botões */}
</div>
```

---

## ✅ **MELHORIA 5: Atalhos de Teclado**

### **Instalar dependência:**

```bash
pnpm add react-hotkeys-hook
```

### **Arquivo: `src/hooks/useKeyboardShortcuts.ts`** (criar)

```typescript
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate()

  // Navegação
  useHotkeys('ctrl+h', () => navigate('/'), { preventDefault: true })
  useHotkeys('ctrl+b', () => navigate('/bens-cadastrados'), { preventDefault: true })
  useHotkeys('ctrl+i', () => navigate('/imoveis'), { preventDefault: true })
  useHotkeys('ctrl+r', () => navigate('/relatorios'), { preventDefault: true })
  
  // Ações
  useHotkeys('ctrl+n', () => navigate('/bens-cadastrados/novo'), { preventDefault: true })
  useHotkeys('ctrl+k', () => {
    // Abrir busca global
    document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
  }, { preventDefault: true })

  // Esc para fechar modais
  useHotkeys('esc', () => {
    const closeButtons = document.querySelectorAll('[data-close-modal]')
    closeButtons.forEach(btn => (btn as HTMLElement).click())
  })
}
```

### **Usar no Layout:**

```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export const Layout = () => {
  useKeyboardShortcuts()
  
  // ... resto do componente
}
```

### **Componente de Ajuda de Atalhos (criar `src/components/KeyboardShortcutsHelp.tsx`):**

```typescript
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

const shortcuts = [
  { keys: 'Ctrl + H', description: 'Ir para Dashboard' },
  { keys: 'Ctrl + B', description: 'Ir para Bens Cadastrados' },
  { keys: 'Ctrl + I', description: 'Ir para Imóveis' },
  { keys: 'Ctrl + R', description: 'Ir para Relatórios' },
  { keys: 'Ctrl + N', description: 'Novo Cadastro' },
  { keys: 'Ctrl + K', description: 'Busca Global' },
  { keys: 'Esc', description: 'Fechar Modal' },
  { keys: '?', description: 'Mostrar Atalhos' },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useHotkeys('?', () => setOpen(true), { preventDefault: true })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
        aria-label="Atalhos de teclado"
      >
        <Keyboard className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atalhos de Teclado</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {shortcuts.map((shortcut, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

### **Fase 1 - Rápidas (1-2 horas):**
- [ ] Adicionar Skeleton component
- [ ] Implementar ThemeToggle
- [ ] Adicionar KeyboardShortcutsHelp

### **Fase 2 - Médias (2-4 horas):**
- [ ] Implementar lazy loading nas rotas principais
- [ ] Configurar tema dark em todos os componentes
- [ ] Testar atalhos de teclado

### **Fase 3 - Produção:**
- [ ] Criar script de backup
- [ ] Configurar cron
- [ ] Testar backup e restore

---

## 🚀 **PRÓXIMOS PASSOS**

Após implementar estas melhorias, considere:

1. **Compressão de Imagens**: Adicionar `browser-image-compression`
2. **Virtualização**: Implementar `@tanstack/react-virtual` para listas grandes
3. **Logs**: Adicionar Winston no backend
4. **Testes**: Vitest + Playwright

---

**Implementação estimada: 4-6 horas de desenvolvimento** ✨
