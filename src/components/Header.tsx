import { NotificationBell } from '@/components/NotificationBell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useSearch } from '@/contexts/SearchContext'
import { useAuth } from '@/hooks/useAuth'
import {
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    Settings,
    User as UserIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { openSearch } = useSearch()

  const handleLogout = () => {
    logout()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background/80 px-3 sm:px-4 md:px-6 backdrop-blur-sm no-print">
      {/* Mobile Sidebar Trigger - Hidden on desktop since we have the fixed one */}
      <div className="md:hidden">
        <SidebarTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SidebarTrigger>
      </div>
      
      {/* Search Button - Mobile */}
      <div className="flex-1 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9"
          onClick={openSearch}
        >
          <Search className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="sr-only">Pesquisar</span>
        </Button>
      </div>
      
      {/* Right side items */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search Button - Desktop */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-9 w-9"
          onClick={openSearch}
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">Pesquisar</span>
        </Button>
        
        {/* Notifications */}
        <div className="hidden sm:block">
          <NotificationBell />
        </div>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-9 sm:w-9">
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback className="text-xs sm:text-sm">
                  {user ? getInitials(user.name) : <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-sm">{user?.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/')} className="text-sm">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/perfil')} className="text-sm">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/notificacoes')} className="text-sm">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Notificações</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="text-sm">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-sm text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
