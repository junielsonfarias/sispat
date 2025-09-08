import { SuperuserFooter } from '@/components/SuperuserFooter';
import { SuperuserHeader } from '@/components/SuperuserHeader';
import { VersionChecker } from '@/components/VersionChecker';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import {
  BookText,
  Building,
  FileJson,
  FileSpreadsheet,
  GitBranch,
  Info,
  LayoutDashboard,
  Palette,
  Search,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/superuser', label: 'Dashboard', icon: LayoutDashboard },
  {
    to: '/superuser/municipalities',
    label: 'Municípios',
    icon: Building,
  },
  { to: '/superuser/users', label: 'Usuários', icon: Users },
  {
    to: '/superuser/permissions',
    label: 'Permissões',
    icon: Shield,
  },
  {
    to: '/superuser/customization',
    label: 'Customização de Login',
    icon: Settings,
  },
  {
    to: '/superuser/form-fields',
    label: 'Campos de Formulário',
    icon: FileJson,
  },
  {
    to: '/superuser/export-templates',
    label: 'Modelos de Exportação',
    icon: FileSpreadsheet,
  },
  {
    to: '/superuser/public-search',
    label: 'Consulta Pública',
    icon: Search,
  },
  {
    to: '/superuser/system-information',
    label: 'Informações do Sistema',
    icon: Info,
  },
  {
    to: '/superuser/footer-customization',
    label: 'Rodapé do Superusuário',
    icon: Palette,
  },
  {
    to: '/superuser/version-update',
    label: 'Atualização de Versão',
    icon: GitBranch,
  },
  {
    to: '/superuser/documentation',
    label: 'Documentação',
    icon: BookText,
  },
];

export const SuperuserLayout = () => {
  return (
    <div className='grid min-h-screen w-full md:grid-cols-[288px_1fr]'>
      <div className='hidden border-r border-gray-200/50 bg-gradient-to-b from-white to-gray-50/50 backdrop-blur-sm shadow-xl md:block'>
        <div className='flex h-full max-h-screen flex-col gap-2'>
          <div className='flex h-16 items-center justify-center border-b border-gray-200/50 px-3 lg:px-4 bg-gradient-to-r from-purple-50 to-indigo-50'>
            <NavLink
              to='/superuser'
              className='flex items-center gap-3 font-semibold relative'
            >
              <div className='p-1.5 bg-gradient-to-br from-purple-100 to-indigo-200 rounded-lg'>
                <LayoutDashboard className='h-5 w-5 text-purple-700' />
              </div>
              <div>
                <span className='text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent'>
                  SISPAT
                </span>
                <div className='text-xs text-gray-500 font-medium'>
                  Superusuário
                </div>
              </div>
              <div className='absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full animate-pulse' />
            </NavLink>
          </div>
          <div className='flex-1 overflow-y-auto superuser-sidebar'>
            <nav className='flex flex-col px-3 text-sm font-medium py-4 space-y-1 bg-gradient-to-b from-transparent to-gray-50/30'>
              {navItems.map((item, index) => (
                <div
                  key={item.to}
                  className='animate-in fade-in-0 slide-in-from-left-2 duration-500'
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <NavLink
                    to={item.to}
                    end={item.to === '/superuser'}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-300 relative overflow-hidden',
                        'hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:shadow-sm hover:scale-[1.01]',
                        'text-gray-600 hover:text-purple-700',
                        isActive &&
                          'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 shadow-sm'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={cn(
                            'p-1.5 rounded-md transition-all duration-300',
                            'bg-gray-100 group-hover:bg-purple-100',
                            isActive && 'bg-purple-200'
                          )}
                        >
                          <item.icon className='h-3.5 w-3.5' />
                        </div>
                        <span className='font-medium'>{item.label}</span>
                        {isActive && (
                          <div className='ml-auto w-2 h-2 bg-purple-500 rounded-full animate-pulse' />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className='flex flex-col'>
        <SuperuserHeader />
        <main className='flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40'>
          <Outlet />
        </main>
        <SuperuserFooter />
      </div>
      <Toaster />
      <VersionChecker />
    </div>
  );
};
