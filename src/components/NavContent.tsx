import { NavLink, useLocation } from 'react-router-dom'
import {
  Building,
  Calendar,
  Download,
  FileText,
  Home,
  List,
  PieChart,
  Plus,
  Settings,
  History,
  ClipboardList,
  Archive,
  LayoutDashboard,
  QrCode,
  MapPin,
  Users,
  Palette,
  ShieldCheck,
  DatabaseBackup,
  BarChart,
  LayoutTemplate,
  Building2,
  FileJson,
  Map,
  Wrench,
  Laptop,
  Database,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { useState } from 'react'

interface NavItem {
  to?: string
  icon: React.ElementType
  label: string
  exact?: boolean
  isGroupLabel?: boolean
  children?: NavItem[]
  isCollapsible?: boolean
}

const supervisorAndAdminLinks: NavItem[] = [
  { label: 'Dashboards', icon: LayoutDashboard, isGroupLabel: true },
  { to: '/', icon: LayoutDashboard, label: 'Resumo', exact: true },
  { to: '/dashboard/supervisor', icon: Home, label: 'Supervisor' },

  { 
    label: 'Gestão de Patrimônio', 
    icon: Archive, 
    isGroupLabel: true,
    isCollapsible: true,
    children: [
      { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
      { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
      { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
      { to: '/locais', icon: MapPin, label: 'Locais' },
    ]
  },

  { 
    label: 'Gestão de Imóveis', 
    icon: Building2, 
    isGroupLabel: true,
    isCollapsible: true,
    children: [
      { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
      { to: '/imoveis/mapa', icon: Map, label: 'Mapa Interativo' },
      { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
      { to: '/imoveis/campos', icon: FileJson, label: 'Campos Personalizados' },
    ]
  },

  { 
    label: 'Análise e Relatórios', 
    icon: BarChart, 
    isGroupLabel: true,
    isCollapsible: true,
    children: [
      { to: '/analise/setor', icon: Building, label: 'Análise por Setor' },
      { to: '/analise/tipo', icon: PieChart, label: 'Análise por Tipo' },
      { to: '/analise/temporal', icon: Calendar, label: 'Análise Temporal' },
      { to: '/relatorios', icon: FileText, label: 'Gerar Relatórios' },
      { to: '/exportacao', icon: Download, label: 'Exportação de Dados' },
    ]
  },

  { 
    label: 'Ferramentas', 
    icon: Settings, 
    isGroupLabel: true,
    isCollapsible: true,
    children: [
      { to: '/gerar-etiquetas', icon: QrCode, label: 'Gerar Etiquetas' },
      { to: '/etiquetas/templates', icon: LayoutTemplate, label: 'Modelos de Etiqueta' },
      { to: '/ferramentas/sync-client', icon: Laptop, label: 'Cliente de Sincronização' },
      { to: '/downloads', icon: Download, label: 'Downloads' },
    ]
  },

  { 
    label: 'Administração', 
    icon: Users, 
    isGroupLabel: true,
    isCollapsible: true,
    children: [
      { to: '/configuracoes/usuarios', icon: Users, label: 'Gerenciar Usuários' },
      { to: '/configuracoes/setores', icon: Building, label: 'Gerenciar Setores' },
      { to: '/registros-de-atividade', icon: History, label: 'Logs de Atividade' },
      { to: '/admin/auditoria', icon: Database, label: 'Auditoria do Sistema' },
    ]
  },

  { 
    label: 'Configurações', 
    icon: Settings, 
    isGroupLabel: true,
    isCollapsible: true,
    children: [
      { to: '/configuracoes/personalizacao', icon: Palette, label: 'Personalização' },
      { to: '/configuracoes/seguranca', icon: ShieldCheck, label: 'Segurança' },
      { to: '/configuracoes/backup', icon: DatabaseBackup, label: 'Backup' },
    ]
  },
]

const navLinks: Record<UserRole, NavItem[]> = {
  superuser: [],
  supervisor: supervisorAndAdminLinks,
  admin: supervisorAndAdminLinks,
  usuario: [
    { label: 'Dashboards', icon: LayoutDashboard, isGroupLabel: true },
    { to: '/', icon: LayoutDashboard, label: 'Resumo', exact: true },
    { to: '/dashboard/usuario', icon: Home, label: 'Meu Dashboard' },

    { 
      label: 'Gestão de Patrimônio', 
      icon: Archive, 
      isGroupLabel: true,
      isCollapsible: true,
      children: [
        { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
        { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
        { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
        { to: '/locais', icon: MapPin, label: 'Locais' },
      ]
    },

    { 
      label: 'Gestão de Imóveis', 
      icon: Building2, 
      isGroupLabel: true,
      isCollapsible: true,
      children: [
        { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
        { to: '/imoveis/mapa', icon: Map, label: 'Mapa Interativo' },
        { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
      ]
    },

    { 
      label: 'Ferramentas', 
      icon: Settings, 
      isGroupLabel: true,
      isCollapsible: true,
      children: [
        { to: '/exportacao', icon: Download, label: 'Exportação' },
        { to: '/relatorios', icon: FileText, label: 'Relatórios' },
        { to: '/gerar-etiquetas', icon: QrCode, label: 'Gerar Etiquetas' },
        { to: '/ferramentas/sync-client', icon: Laptop, label: 'Cliente de Sincronização' },
        { to: '/downloads', icon: Download, label: 'Downloads' },
      ]
    },
  ],
  visualizador: [
    { label: 'Dashboards', icon: LayoutDashboard, isGroupLabel: true },
    { to: '/', icon: LayoutDashboard, label: 'Resumo', exact: true },
    { to: '/dashboard/visualizador', icon: Home, label: 'Meu Dashboard' },

    { 
      label: 'Consulta', 
      icon: Archive, 
      isGroupLabel: true,
      isCollapsible: true,
      children: [
        { to: '/bens-cadastrados', icon: List, label: 'Listagem de Bens' },
        { to: '/imoveis', icon: List, label: 'Listagem de Imóveis' },
        { to: '/locais', icon: MapPin, label: 'Locais' },
      ]
    },
  ],
}

const NavItemComponent = ({ item }: { item: NavItem }) => {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(true)
  
  const isActive = item.to
    ? item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)
    : false

  const hasActiveChild = item.children?.some(child => 
    location.pathname.startsWith(child.to || '')
  )

  if (item.isGroupLabel) {
    if (item.isCollapsible && item.children) {
      return (
        <div className="space-y-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider hover:text-primary transition-colors',
              (isActive || hasActiveChild) && 'text-primary'
            )}
          >
            <div className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {item.children.map((child, index) => (
                <NavLink
                  key={`${child.label}-${index}`}
                  to={child.to!}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-primary',
                    location.pathname.startsWith(child.to || '') && 'bg-muted text-primary'
                  )}
                >
                  <child.icon className="h-4 w-4" />
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )
    }
    
    return (
      <h3 className="px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 mt-4 flex items-center gap-2">
        <item.icon className="h-4 w-4" />
        {item.label}
      </h3>
    )
  }

  return (
    <NavLink
      to={item.to!}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary',
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  )
}

export const NavContent = () => {
  const { user } = useAuth()
  const links = user ? navLinks[user.role] || [] : []

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4 space-y-2">
      {links.map((item, index) => (
        <NavItemComponent key={`${item.label}-${index}`} item={item} />
      ))}
    </nav>
  )
}
