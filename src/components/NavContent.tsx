import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
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
  Tag,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { NavGroup, NavGroupItem } from '@/components/NavGroup'

interface NavItem {
  to?: string
  icon: React.ElementType
  label: string
  exact?: boolean
  isGroupLabel?: boolean
  children?: NavItem[]
  groupColor?: string
}

const supervisorAndAdminLinks: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },

  { 
    label: 'Patrimônio', 
    icon: Archive, 
    isGroupLabel: true,
    groupColor: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    children: [
      { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
      { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
      { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
      { to: '/locais', icon: MapPin, label: 'Locais' },
    ]
  },

  { 
    label: 'Imóveis', 
    icon: Building2, 
    isGroupLabel: true,
    groupColor: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
    children: [
      { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
      { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
      {
        to: '/imoveis/campos',
        icon: FileJson,
        label: 'Campos Personalizados',
      },
    ]
  },

  { 
    label: 'Análise e Relatórios', 
    icon: BarChart, 
    isGroupLabel: true,
    groupColor: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
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
    groupColor: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100',
    children: [
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
    ]
  },

  { 
    label: 'Administração', 
    icon: Users, 
    isGroupLabel: true,
    groupColor: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
    children: [
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
        to: '/configuracoes/tipos',
        icon: Package,
        label: 'Gerenciar Tipos de Bens',
      },
      {
        to: '/configuracoes/formas-aquisicao',
        icon: FileText,
        label: 'Formas de Aquisição',
      },
      {
        to: '/registros-de-atividade',
        icon: History,
        label: 'Logs de Atividade',
      },
    ]
  },

  { 
    label: 'Configurações', 
    icon: Settings, 
    isGroupLabel: true,
    groupColor: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
    children: [
      {
        to: '/configuracoes/personalizacao',
        icon: Palette,
        label: 'Personalização',
      },
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
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },

    { 
      label: 'Patrimônio', 
      icon: Archive, 
      isGroupLabel: true,
      groupColor: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      children: [
        { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
        { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
        { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
        { to: '/locais', icon: MapPin, label: 'Locais' },
      ]
    },

    { 
      label: 'Imóveis', 
      icon: Building2, 
      isGroupLabel: true,
      groupColor: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
      children: [
        { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
        { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
      ]
    },

    { 
      label: 'Ferramentas', 
      icon: Settings, 
      isGroupLabel: true,
      groupColor: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100',
      children: [
        { to: '/exportacao', icon: Download, label: 'Exportação' },
        { to: '/relatorios', icon: FileText, label: 'Relatórios' },
        { to: '/gerar-etiquetas', icon: QrCode, label: 'Gerar Etiquetas' },
        {
          to: '/ferramentas/sync-client',
          icon: Laptop,
          label: 'Cliente de Sincronização',
        },
        { to: '/downloads', icon: Download, label: 'Downloads' },
      ]
    },
  ],
  visualizador: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },

    { 
      label: 'Consulta', 
      icon: Archive, 
      isGroupLabel: true,
      groupColor: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
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
  const isActive = item.to
    ? item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)
    : false

  return (
    <NavGroupItem isActive={isActive}>
      <NavLink
        to={item.to!}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground group',
          isActive && 'bg-primary text-primary-foreground shadow-sm font-medium',
          !isActive && 'text-muted-foreground hover:text-foreground'
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0 transition-colors group-hover:scale-110" />
        <span className="truncate">{item.label}</span>
      </NavLink>
    </NavGroupItem>
  )
}

export const NavContent = () => {
  const { user } = useAuth()
  const links = user ? navLinks[user.role] || [] : []
  const [openGroup, setOpenGroup] = useState<string | null>(null) // Nenhum grupo aberto por padrão

  const handleGroupToggle = (groupLabel: string) => {
    setOpenGroup(openGroup === groupLabel ? null : groupLabel)
  }

  return (
    <nav className="px-2 text-sm font-medium lg:px-4 py-4 space-y-1">
      {links.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          {item.isGroupLabel ? (
            <NavGroup
              label={item.label}
              icon={item.icon}
              groupColor={item.groupColor}
              isOpen={openGroup === item.label}
              onOpenChange={() => handleGroupToggle(item.label)}
            >
              {item.children?.map((child, childIndex) => (
                <NavItemComponent key={`${child.label}-${childIndex}`} item={child} />
              ))}
            </NavGroup>
          ) : (
            <NavItemComponent item={item} />
          )}
        </div>
      ))}
    </nav>
  )
}