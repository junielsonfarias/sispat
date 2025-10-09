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
        <div className="flex h-20">
          {/* Left Sidebar - Logo and SISPAT */}
          <div className="w-64 bg-gradient-to-br from-blue-50 to-blue-100 border-r border-blue-200 flex items-center justify-center">
            <div className="flex items-center gap-4 px-6">
              {/* Logo */}
              <div className="relative">
                <img
                  src={settings.activeLogoUrl}
                  alt="Logo da Câmara Municipal"
                  className="h-12 w-auto object-contain"
                />
              </div>
              
              {/* SISPAT Text */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 leading-none">
                  SISPAT
                </h1>
                <p className="text-sm text-gray-600 font-medium leading-tight">
                  Sistema de
                </p>
                <p className="text-sm text-gray-600 font-medium leading-tight">
                  Patrimônio
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex items-center justify-between px-8">
            {/* Municipality Information */}
            <div className="flex flex-col">
              {settings.prefeituraName ? (
                <>
                  <h1 className="text-xl font-bold text-gray-900 uppercase leading-tight">
                    {settings.prefeituraName}
                  </h1>
                  {settings.secretariaResponsavel && (
                    <p className="text-sm text-gray-600 uppercase font-medium leading-tight">
                      {settings.secretariaResponsavel}
                    </p>
                  )}
                  {settings.departamentoResponsavel && (
                    <p className="text-sm text-gray-600 uppercase font-medium leading-tight">
                      {settings.departamentoResponsavel}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900 uppercase leading-tight">
                    PREFEITURA MUNICIPAL
                  </h1>
                  <p className="text-sm text-gray-600 uppercase font-medium leading-tight">
                    SECRETARIA DE ADMINISTRAÇÃO
                  </p>
                  <p className="text-sm text-gray-600 uppercase font-medium leading-tight">
                    DEPARTAMENTO DE PATRIMÔNIO
                  </p>
                </>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(!showSearch)}
                className="h-10 w-10 hover:bg-gray-100"
                aria-label="Buscar"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-gray-100 relative"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {/* Notification Badge */}
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* User Avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-full hover:bg-gray-100 p-0"
                    aria-label="Menu do usuário"
                  >
                    <Avatar className="h-8 w-8">
                      {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      )}
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
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

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden border-t bg-white p-4">
            <GlobalSearch />
          </div>
        )}
      </header>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </>
  )
}