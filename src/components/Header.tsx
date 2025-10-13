// Header component - Enhanced with modern design based on image reference
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useTheme } from '@/contexts/ThemeContext'
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
import { MobileNavigation, BottomNavigation } from '@/components/MobileNavigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { User, LogOut, Settings, Shield, Building2, Sun, Moon } from 'lucide-react'

export const Header = () => {
  const { user, logout } = useAuth()
  const { theme, setTheme, actualTheme } = useTheme()
  
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
              <Link to="/dashboard" className="relative cursor-pointer hover:opacity-80 transition-opacity">
                <img
                  src={settings.activeLogoUrl}
                  alt="Logo da Prefeitura"
                  className="h-20 w-auto object-contain drop-shadow-md"
                />
              </Link>
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
                  <DropdownMenuItem 
                    onClick={() => setTheme(actualTheme === 'light' ? 'dark' : 'light')}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {actualTheme === 'light' ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <span>Tema</span>
                    <div className="ml-auto">
                      {actualTheme === 'light' ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </div>
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
        <div className="hidden md:flex lg:hidden h-28 px-6 items-center justify-between">
          {/* Logo and Municipality Info - Stacked */}
          <div className="flex flex-col items-center gap-1 py-2">
            <Link to="/dashboard" className="cursor-pointer hover:opacity-80 transition-opacity">
              <img
                src={settings.activeLogoUrl}
                alt="Logo"
                className="h-18 w-auto object-contain drop-shadow-sm"
              />
            </Link>
            {settings.prefeituraName ? (
              <h2 className="text-xs font-bold text-gray-900 uppercase text-center leading-tight">
                {settings.prefeituraName}
              </h2>
            ) : (
              <h2 className="text-xs font-bold text-gray-900 uppercase text-center leading-tight">
                PREFEITURA MUNICIPAL
              </h2>
            )}
          </div>

          {/* SISPAT Branding - Center */}
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-bold text-gray-900 leading-none">
              SISPAT
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              Sistema de Patrimônio
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* User Avatar - Tablet */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-green-50 hover:border-green-200 border border-transparent transition-all duration-200 p-0"
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-green-200">
                    {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
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
                <DropdownMenuItem 
                  onClick={() => setTheme(actualTheme === 'light' ? 'dark' : 'light')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {actualTheme === 'light' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  <span>Tema</span>
                  <div className="ml-auto">
                    {actualTheme === 'light' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </div>
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

        {/* Mobile Layout (below md) - Padrão de mercado otimizado */}
        <div className="flex md:hidden h-18 px-4 items-center justify-between gap-3">
          {/* Menu Hamburguer - Esquerda */}
          <div className="flex-shrink-0">
            <MobileNavigation />
          </div>

          {/* Logo - Centro (apenas logo, sem texto) */}
          <div className="flex items-center justify-center flex-1 min-w-0">
            <Link to="/dashboard" className="cursor-pointer hover:opacity-80 transition-opacity">
              <img
                src={settings.activeLogoUrl}
                alt="Logo"
                className="h-13 w-auto max-w-[120px] object-contain"
              />
            </Link>
          </div>

          {/* Avatar - Direita (apenas avatar, sem botão de busca) */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0 touch-target">
                  <Avatar className="h-9 w-9 ring-2 ring-offset-1 ring-border">
                    {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 mr-2" align="end" sideOffset={8}>
                {/* Header do Menu */}
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user.role}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator />
                
                {/* Opções do Menu */}
                <div className="py-1">
                  <DropdownMenuItem asChild>
                    <Link to="/perfil" className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/configuracoes/personalizacao" className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Configurações</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Theme Toggle dentro do menu */}
                  <DropdownMenuItem 
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Tema</span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ThemeToggle />
                      </div>
                    </div>
                  </DropdownMenuItem>
                </div>
                
                <DropdownMenuSeparator />
                
                {/* Sair */}
                <div className="py-1">
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-medium">Sair</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      </header>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </>
  )
}