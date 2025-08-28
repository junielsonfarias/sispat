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
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'

interface NavItem {
  to?: string
  icon: React.ElementType
  label: string
  exact?: boolean
  isGroupLabel?: boolean
}

const supervisorAndAdminLinks: NavItem[] = [
  { label: 'Dashboards', icon: LayoutDashboard, isGroupLabel: true },
  { to: '/', icon: LayoutDashboard, label: 'Resumo', exact: true },
  { to: '/dashboard/supervisor', icon: Home, label: 'Supervisor' },

  { label: 'Patrimônio', icon: Archive, isGroupLabel: true },
  { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
  { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
  { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
  { to: '/locais', icon: MapPin, label: 'Locais' },

  { label: 'Imóveis', icon: Building2, isGroupLabel: true },
  { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
  { to: '/imoveis/mapa', icon: Map, label: 'Mapa Interativo' },
  { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
  {
    to: '/imoveis/campos',
    icon: FileJson,
    label: 'Campos Personalizados',
  },

  { label: 'Análise e Relatórios', icon: BarChart, isGroupLabel: true },
  { to: '/analise/setor', icon: Building, label: 'Análise por Setor' },
  { to: '/analise/tipo', icon: PieChart, label: 'Análise por Tipo' },
  { to: '/analise/temporal', icon: Calendar, label: 'Análise Temporal' },
  { to: '/relatorios', icon: FileText, label: 'Gerar Relatórios' },
  { to: '/exportacao', icon: Download, label: 'Exportação de Dados' },

  { label: 'Ferramentas', icon: Settings, isGroupLabel: true },
  { to: '/gerar-etiquetas', icon: QrCode, label: 'Gerar Etiquetas' },
  {
    to: '/etiquetas/templates',
    icon: LayoutTemplate,
    label: 'Modelos de Etiqueta',
  },
  {
    to: '/ferramentas/sync-client',
    icon: Laptop,
    label: 'Cliente de Sincronização',
  },
  { to: '/downloads', icon: Download, label: 'Downloads' },

  { label: 'Administração', icon: Users, isGroupLabel: true },
  {
    to: '/configuracoes/usuarios',
    icon: Users,
    label: 'Gerenciar Usuários',
  },
  {
    to: '/configuracoes/setores',
    icon: Building,
    label: 'Gerenciar Setores',
  },
  {
    to: '/registros-de-atividade',
    icon: History,
    label: 'Logs de Atividade',
  },
  {
    to: '/notificacoes',
    icon: Bell,
    label: 'Notificações',
  },

  { label: 'Configurações', icon: Settings, isGroupLabel: true },
  {
    to: '/configuracoes/personalizacao',
    icon: Palette,
    label: 'Personalização',
  },
  { to: '/configuracoes/seguranca', icon: ShieldCheck, label: 'Segurança' },
  { to: '/configuracoes/backup', icon: DatabaseBackup, label: 'Backup' },
]

const navLinks: Record<UserRole, NavItem[]> = {
  superuser: [],
  supervisor: supervisorAndAdminLinks,
  admin: supervisorAndAdminLinks,
  usuario: [
    { label: 'Dashboards', icon: LayoutDashboard, isGroupLabel: true },
    { to: '/', icon: LayoutDashboard, label: 'Resumo', exact: true },
    { to: '/dashboard/usuario', icon: Home, label: 'Meu Dashboard' },

    { label: 'Patrimônio', icon: Archive, isGroupLabel: true },
    { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
    { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
    { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
    { to: '/locais', icon: MapPin, label: 'Locais' },

    { label: 'Imóveis', icon: Building2, isGroupLabel: true },
    { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
    { to: '/imoveis/mapa', icon: Map, label: 'Mapa Interativo' },
    { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },

    { label: 'Ferramentas', icon: Settings, isGroupLabel: true },
    { to: '/exportacao', icon: Download, label: 'Exportação' },
    { to: '/relatorios', icon: FileText, label: 'Relatórios' },
    { to: '/gerar-etiquetas', icon: QrCode, label: 'Gerar Etiquetas' },
    {
      to: '/ferramentas/sync-client',
      icon: Laptop,
      label: 'Cliente de Sincronização',
    },
    { to: '/downloads', icon: Download, label: 'Downloads' },
    {
      to: '/notificacoes',
      icon: Bell,
      label: 'Notificações',
    },
  ],
  visualizador: [
    { label: 'Dashboards', icon: LayoutDashboard, isGroupLabel: true },
    { to: '/', icon: LayoutDashboard, label: 'Resumo', exact: true },
    { to: '/dashboard/visualizador', icon: Home, label: 'Meu Dashboard' },

    { label: 'Consulta', icon: Archive, isGroupLabel: true },
    { to: '/bens-cadastrados', icon: List, label: 'Listagem de Bens' },
    { to: '/imoveis', icon: List, label: 'Listagem de Imóveis' },
    { to: '/locais', icon: MapPin, label: 'Locais' },
    {
      to: '/notificacoes',
      icon: Bell,
      label: 'Notificações',
    },
  ],
}

const NavItemComponent = ({ item }: { item: NavItem }) => {
  const location = useLocation()
  const isActive = item.to
    ? item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)
    : false

  if (item.isGroupLabel) {
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
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4">
      {links.map((item, index) => (
        <NavItemComponent key={`${item.label}-${index}`} item={item} />
      ))}
    </nav>
  )
}
