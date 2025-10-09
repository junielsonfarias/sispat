import { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import { Toaster } from '@/components/ui/toaster'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Container } from '@/components/ui/responsive-container'

interface LayoutProps {
  children?: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth()
  
  // Ativar atalhos de teclado
  useKeyboardShortcuts()

  if (!user) {
    return <ProtectedRoute>{children}</ProtectedRoute>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header responsivo */}
      <div className="sticky top-0 z-10">
        <Header />
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex">
        {/* Sidebar de navegação - apenas desktop */}
        <SidebarProvider>
          <div className="hidden lg:block sticky top-24 h-[calc(100vh-6rem)] w-64">
            <Sidebar />
          </div>
          <div className="flex-1">
            <main className="flex-1 overflow-auto p-3 md:p-4 lg:p-6">
              {children || <Outlet />}
            </main>
          </div>
        </SidebarProvider>
      </div>
      
      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcutsHelp />
      
      <Toaster />
    </div>
  )
}

// Layout alternativo para páginas que não precisam de sidebar
export const SimpleLayout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex-1 overflow-auto">
        <Container size="full" padding="md" className="min-h-[calc(100vh-4rem)]">
          {children}
        </Container>
      </main>
      <Toaster />
    </div>
  )
}

// Layout para páginas de autenticação
export const AuthLayout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster />
    </div>
  )
}