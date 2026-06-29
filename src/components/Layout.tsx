import { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Toaster } from '@/components/ui/toaster'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Container } from '@/components/ui/responsive-container'
import MobileNavigationOptimized from '@/components/MobileNavigationOptimized'

interface LayoutProps {
  children?: ReactNode
}

// Contêiner da sidebar desktop: a largura acompanha o estado recolhido para
// não cortar o conteúdo dos submenus (antes era fixo em w-64, mais estreito
// que a própria sidebar). Apenas desktop (lg+).
const DesktopSidebar = () => {
  const { isCollapsed } = useSidebar()
  return (
    <div
      className={cn(
        'hidden lg:block sticky top-24 h-[calc(100vh-6rem)] transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-[280px]',
      )}
    >
      <Sidebar />
    </div>
  )
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth()
  const { isMobile } = useMobile()

  if (!user) {
    return <ProtectedRoute>{children}</ProtectedRoute>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header responsivo */}
      <div className="sticky top-0 z-40">
        <Header />
        {/* Navegação mobile */}
        {isMobile && <MobileNavigationOptimized />}
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex">
        {/* Sidebar de navegação - apenas desktop */}
        <SidebarProvider>
          <DesktopSidebar />
          <div className="flex-1 w-full">
            {/* Main com padding-bottom para o bottom navigation em mobile */}
            <main className={cn(
              "flex-1 overflow-auto p-4 md:p-4 lg:p-6",
              isMobile ? "pb-20" : "pb-4"
            )}>
              {children || <Outlet />}
            </main>
          </div>
        </SidebarProvider>
      </div>
      
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
