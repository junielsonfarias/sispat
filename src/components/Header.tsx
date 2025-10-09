// Header component - Enhanced with modern design based on image reference
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
import { Bell, Search, User, LogOut, Settings, Shield, Building2 } from 'lucide-react'

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
        className="bg-white border-b border-gray-200 shadow-sm no-print"
        role="banner"
        aria-label="Cabeçalho principal"
      >
        {/* Desktop Layout (lg and up) */}
        <div className="hidden lg:flex h-24">
          {/* Main Content Area - Centered Layout */}
          <div className="flex-1 flex items-center justify-between px-6">
            {/* Left Side - Logo (Aligned with menu) */}
            <div className="flex items-center w-64 justify-center">
              <div className="relative">
                <img
                  src={settings.activeLogoUrl}
                  alt="Logo da Prefeitura"
                  className="h-16 w-auto object-contain drop-shadow-md"
                />
              </div>
            </div>

            {/* Center - Municipality Information */}
            <div className="flex flex-col items-center text-center flex-1 px-4">
              {settings.prefeituraName ? (
                <>
                  <h1 className="text-xl font-bold text-gray-900 uppercase leading-tight tracking-wide">
                    {settings.prefeituraName}
                  </h1>
                  {settings.secretariaResponsavel && (
                    <p className="text-sm text-gray-700 uppercase font-semibold leading-tight tracking-wide">
                      {settings.secretariaResponsavel}
                    </p>
                  )}
                  {settings.departamentoResponsavel && (
                    <p className="text-xs text-gray-600 uppercase font-medium leading-tight tracking-wide">
                      {settings.departamentoResponsavel}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900 uppercase leading-tight tracking-wide">
                    PREFEITURA MUNICIPAL
                  </h1>
                  <p className="text-sm text-gray-700 uppercase font-semibold leading-tight tracking-wide">
                    SECRETARIA DE ADMINISTRAÇÃO
                  </p>
                  <p className="text-xs text-gray-600 uppercase font-medium leading-tight tracking-wide">
                    DEPARTAMENTO DE PATRIMÔNIO
                  </p>
                </>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 w-64 justify-end">
              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(!showSearch)}
                className="h-14 w-14 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all duration-200"
                aria-label="Buscar"
              >
                <Search className="h-7 w-7 text-blue-600" />
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-all duration-200 relative"
                aria-label="Notificações"
              >
                <Bell className="h-7 w-7 text-orange-600" />
                {/* Notification Badge */}
                <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white text-sm rounded-full flex items-center justify-center font-bold shadow-lg">
                  3
                </span>
              </Button>

              {/* User Avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-12 w-12 rounded-full hover:bg-green-50 hover:border-green-200 border border-transparent transition-all duration-200 p-0"
                    aria-label="Menu do usuário"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-green-200">
                      {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      )}
                      <AvatarFallback className="bg-green-100 text-green-700 text-sm font-bold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                          )}
                          <AvatarFallback className="bg-gray-200 text-gray-700">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold leading-none">{user.name}</p>
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
                    <Link to="/perfil" className="flex items-center gap-2 cursor-pointer">
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
        </div>

        {/* Tablet Layout (md to lg) */}
        <div className="hidden md:flex lg:hidden h-20 px-6 items-center justify-between">
          {/* Logo and Municipality Info - Stacked */}
          <div className="flex flex-col items-center gap-2">
            <img
              src={settings.activeLogoUrl}
              alt="Logo"
              className="h-24 w-auto object-contain drop-shadow-sm"
            />
            {settings.prefeituraName ? (
              <h2 className="text-sm font-bold text-gray-900 uppercase text-center leading-tight tracking-wide">
                {settings.prefeituraName}
              </h2>
            ) : (
              <h2 className="text-sm font-bold text-gray-900 uppercase text-center leading-tight tracking-wide">
                PREFEITURA MUNICIPAL
              </h2>
            )}
          </div>

          {/* SISPAT Branding - Center */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-gray-900 leading-none">
              SISPAT
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              Sistema de Patrimônio
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-6 w-6">
                    {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      )}
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes/personalizacao" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Layout (below md) */}
        <div className="flex md:hidden h-24 px-4 items-center justify-center">
          {/* Logo and Municipality Info - Centered */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <img
              src={settings.activeLogoUrl}
              alt="Logo"
              className="h-16 w-auto object-contain drop-shadow-lg"
            />
            {settings.prefeituraName ? (
              <h2 className="text-sm font-bold text-gray-900 uppercase text-center leading-tight tracking-wide">
                {settings.prefeituraName}
              </h2>
            ) : (
              <h2 className="text-sm font-bold text-gray-900 uppercase text-center leading-tight tracking-wide">
                PREFEITURA
              </h2>
            )}
          </div>


          {/* Actions - Minimal */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 rounded-full p-0">
                  <Avatar className="h-5 w-5">
                    {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      )}
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil" className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes/personalizacao" className="flex items-center gap-2 text-xs">
                    <Settings className="h-3 w-3" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 text-xs">
                  <LogOut className="h-3 w-3 mr-2" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden border-t bg-white p-3">
            <GlobalSearch />
          </div>
        )}
      </header>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </>
  )
}