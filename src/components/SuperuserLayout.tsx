import { Outlet, NavLink } from 'react-router-dom'
import { SuperuserHeader } from '@/components/SuperuserHeader'
import { SuperuserFooter } from '@/components/SuperuserFooter'
import { Toaster } from '@/components/ui/toaster'
import {
  LayoutDashboard,
  Building,
  Users,
  Settings,
  FileSpreadsheet,
  FileJson,
  Search,
  BookText,
  Info,
  Palette,
  GitBranch,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VersionChecker } from '@/components/VersionChecker'

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
]

export const SuperuserLayout = () => {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-4 lg:px-6">
            <NavLink
              to="/superuser"
              className="flex items-center gap-2 font-semibold"
            >
              <span className="text-lg">SISPAT - Superusuário</span>
            </NavLink>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/superuser'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                      isActive && 'bg-muted text-primary',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <SuperuserHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          <Outlet />
        </main>
        <SuperuserFooter />
      </div>
      <Toaster />
      <VersionChecker />
    </div>
  )
}
