import { NotificationBell } from '@/components/NotificationBell';
import { QuickActions } from '@/components/QuickActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSearch } from '@/contexts/SearchContext';
import { useAuth } from '@/hooks/useAuth';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    Settings,
    User as UserIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { openSearch } = useSearch();

  const handleLogout = () => {
    logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className='sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/95 backdrop-blur-md shadow-sm px-4 md:px-6 no-print'>
      {/* Mobile Sidebar Trigger */}
      <div className='md:hidden'>
        <SidebarTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-10 w-10 rounded-xl hover:bg-gray-100 transition-all duration-200'
          >
            <Menu className='h-5 w-5' />
            <span className='sr-only'>Toggle navigation menu</span>
          </Button>
        </SidebarTrigger>
      </div>

      {/* Search Button - Mobile */}
      <div className='flex-1 md:hidden'>
        <Button
          variant='ghost'
          size='icon'
          className='h-10 w-10 rounded-xl hover:bg-gray-100 transition-all duration-200'
          onClick={openSearch}
        >
          <Search className='h-5 w-5' />
          <span className='sr-only'>Pesquisar</span>
        </Button>
      </div>

      {/* Right side items */}
      <div className='flex items-center gap-3'>
        {/* Search Button - Desktop */}
        <Button
          variant='ghost'
          size='icon'
          className='hidden md:flex h-10 w-10 rounded-xl hover:bg-gray-100 transition-all duration-200'
          onClick={openSearch}
        >
          <Search className='h-5 w-5' />
          <span className='sr-only'>Pesquisar</span>
        </Button>

        {/* Quick Actions */}
        <div className='hidden md:block'>
          <QuickActions />
        </div>

        {/* Notifications */}
        <div className='hidden sm:block'>
          <NotificationBell />
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='rounded-full h-10 w-10 hover:bg-gray-100 transition-all duration-200 border-2 border-transparent hover:border-gray-200'
            >
              <Avatar className='h-8 w-8 ring-2 ring-gray-100'>
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback className='text-sm font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white'>
                  {user ? (
                    getInitials(user.name)
                  ) : (
                    <UserIcon className='h-4 w-4' />
                  )}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-64 p-2 shadow-xl border-0 bg-white/95 backdrop-blur-md'>
            <DropdownMenuLabel className='px-3 py-2 text-base font-semibold text-gray-900'>
              {user?.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className='bg-gray-200' />
            <DropdownMenuItem 
              onClick={() => navigate('/')} 
              className='px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer'
            >
              <LayoutDashboard className='mr-3 h-4 w-4 text-gray-600' />
              <span>Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/perfil')}
              className='px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer'
            >
              <UserIcon className='mr-3 h-4 w-4 text-gray-600' />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/notificacoes')}
              className='px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer'
            >
              <UserIcon className='mr-3 h-4 w-4 text-gray-600' />
              <span>Notificações</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/configuracoes')}
              className='px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer'
            >
              <Settings className='mr-3 h-4 w-4 text-gray-600' />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className='bg-gray-200' />
            <DropdownMenuItem
              onClick={handleLogout}
              className='px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 cursor-pointer'
            >
              <LogOut className='mr-3 h-4 w-4' />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
