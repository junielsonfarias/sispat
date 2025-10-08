// Header component - Updated to fix Building2 error and improve typography
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCustomization } from '@/contexts/CustomizationContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GlobalSearch } from '@/components/GlobalSearch'
import { MobileNavigation, BottomNavigation } from '@/components/MobileNavigation'
import { Bell, Search, User, LogOut, Settings, Shield } from 'lucide-react'

export const Header = () => {
  const { user, logout } = useAuth()
  
  // Fallback para quando o contexto não estiver disponível
  let settings
  try {
    const customization = useCustomization()
    settings = customization.settings
  } catch (error) {
    // Se o contexto não estiver disponível, usar valores padrão
    settings = {
      activeLogoUrl: '/logo-government.svg'
    }
  }
  
  const [showSearch, setShowSearch] = useState(false)
  const location = useLocation()

  if (!user) return null

  // Função para obter o título da página baseado na rota
  const getPageTitle = () => {
    const path = location.pathname
    
    if (path.includes('/dashboard')) return 'Dashboard'
    if (path.includes('/bens')) return 'Gestão de Patrimônio'
    if (path.includes('/imoveis')) return 'Gestão de Imóveis'
    if (path.includes('/relatorios')) return 'Relatórios'
    if (path.includes('/ferramentas')) return 'Ferramentas'
    if (path.includes('/configuracoes')) return 'Configurações'
    if (path.includes('/admin')) return 'Administração'
    if (path.includes('/superuser')) return 'Super Usuário'
    if (path.includes('/profile')) return 'Perfil'
    if (path === '/') return 'Dashboard'
    
    return 'Sistema de Patrimônio'
  }

  const handleLogout = async () => {
    await logout()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superuser':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'supervisor':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'admin':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'usuario':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'visualizador':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superuser':
        return Shield
      case 'supervisor':
      case 'admin':
        return User
      default:
        return User
    }
  }

  const RoleIcon = getRoleIcon(user.role)

  return (
    <>
      <header 
        className="header-responsive safe-top no-print"
        role="banner"
        aria-label="Cabeçalho principal"
      >
        <div className="container-fluid flex items-center justify-between h-16 lg:h-20 px-4 lg:px-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Button - Only visible on mobile */}
            <div className="block md:hidden">
              <MobileNavigation />
            </div>
            
            {/* Logo and Municipality Info - Only show on mobile/tablet, hidden on desktop since it's in sidebar */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity lg:hidden">
              <div className="relative">
                <img
                  src={settings.activeLogoUrl}
                  alt="Logo"
                  className="img-responsive rounded-lg shadow-sm border border-border/20"
                  style={{ height: 'clamp(1.5rem, 1.25rem + 1.25vw, 2rem)' }}
                />
              </div>
              <div className="hidden sm:block">
                {settings.prefeituraName ? (
                  <div className="flex flex-col">
                    <h1 className="text-fluid-sm font-semibold leading-none text-foreground mb-0.5">
                      {settings.prefeituraName}
                    </h1>
                    {settings.secretariaResponsavel && (
                      <p className="text-fluid-xs text-muted-foreground leading-tight font-normal truncate max-w-[200px]">
                        {settings.secretariaResponsavel}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <h1 className="text-fluid-sm font-semibold leading-none">SISPAT</h1>
                    <p className="text-fluid-xs text-muted-foreground font-normal leading-tight">Sistema de Patrimônio</p>
                  </div>
                )}
              </div>
            </Link>
            
            {/* Desktop: Show municipality info with proper alignment */}
            <div className="hidden lg:flex lg:items-center lg:gap-6 flex-1">
              {settings.prefeituraName && (
                <div className="flex flex-col justify-center">
                  <h1 className="text-lg font-semibold text-foreground leading-tight mb-0.5">
                    {settings.prefeituraName}
                  </h1>
                  {settings.secretariaResponsavel && (
                    <p className="text-sm text-muted-foreground leading-tight font-normal">
                      {settings.secretariaResponsavel}
                    </p>
                  )}
                  {settings.departamentoResponsavel && (
                    <p className="text-xs text-muted-foreground/70 leading-tight font-normal mt-0.5">
                      {settings.departamentoResponsavel}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <GlobalSearch />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search Button - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="mobile-only touch-target"
              aria-label="Abrir busca global"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full touch-target"
                  aria-label="Menu do usuário"
                  aria-expanded="false"
                >
                  <Avatar className="h-8 w-8">
                    {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                    <AvatarFallback className="text-xs">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground mt-1">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'w-fit text-xs',
                        getRoleBadgeColor(user.role)
                      )}
                    >
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes/personalizacao" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="mobile-only border-t bg-background p-4">
            <GlobalSearch />
          </div>
        )}
      </header>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </>
  )
}