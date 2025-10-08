import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Menu,
  X,
  Home,
  Building,
  Archive,
  Settings,
  BarChart,
  QrCode,
  Users,
  Palette,
  ShieldCheck,
  Shield,
  Database,
  Lock,
  Info,
  RefreshCw,
  DatabaseBackup,
  LayoutDashboard,
  Building2,
  FileText,
  Tag,
  Download,
  MapPin,
  ClipboardList,
  Plus,
  List,
  Map,
  Wrench,
  FileJson,
  LayoutTemplate,
  Laptop,
  History,
  ChevronRight,
  Package,
} from 'lucide-react'

interface MobileNavItem {
  to: string
  icon: React.ElementType
  label: string
  badge?: string
  exact?: boolean
}

interface MobileNavGroup {
  title: string
  icon: React.ElementType
  color: string
  items: MobileNavItem[]
}

const mobileNavGroups: Record<UserRole, MobileNavGroup[]> = {
  superuser: [],
  supervisor: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      color: 'text-blue-600 bg-blue-50',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      ],
    },
    {
      title: 'Patrimônio',
      icon: Archive,
      color: 'text-green-600 bg-green-50',
      items: [
        { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
        { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
        { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
        { to: '/locais', icon: MapPin, label: 'Locais' },
      ],
    },
    {
      title: 'Imóveis',
      icon: Building2,
      color: 'text-orange-600 bg-orange-50',
      items: [
        { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
        { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
        { to: '/imoveis/campos', icon: FileJson, label: 'Campos Personalizados' },
      ],
    },
    {
      title: 'Análise e Relatórios',
      icon: BarChart,
      color: 'text-purple-600 bg-purple-50',
      items: [
        { to: '/analise/setor', icon: Building, label: 'Análise por Setor' },
        { to: '/relatorios', icon: FileText, label: 'Gerar Relatórios' },
        { to: '/exportacao', icon: Download, label: 'Exportação de Dados' },
      ],
    },
    {
      title: 'Ferramentas',
      icon: Settings,
      color: 'text-cyan-600 bg-cyan-50',
      items: [
        { to: '/gerar-etiquetas', icon: QrCode, label: 'Gerar Etiquetas' },
        { to: '/etiquetas/templates', icon: LayoutTemplate, label: 'Modelos de Etiqueta' },
        { to: '/ferramentas/sync-client', icon: Laptop, label: 'Cliente de Sincronização' },
        { to: '/downloads', icon: Download, label: 'Downloads' },
      ],
    },
    {
      title: 'Administração',
      icon: Users,
      color: 'text-red-600 bg-red-50',
      items: [
        { to: '/configuracoes/usuarios', icon: Users, label: 'Gerenciar Usuários' },
        { to: '/configuracoes/setores', icon: Building, label: 'Gerenciar Setores' },
        { to: '/configuracoes/tipos', icon: Package, label: 'Gerenciar Tipos de Bens' },
        { to: '/configuracoes/formas-aquisicao', icon: FileText, label: 'Formas de Aquisição' },
        { to: '/registros-de-atividade', icon: History, label: 'Logs de Atividade' },
      ],
    },
    {
      title: 'Configurações',
      icon: Settings,
      color: 'text-gray-600 bg-gray-50',
      items: [
        { to: '/configuracoes/personalizacao', icon: Palette, label: 'Personalização' },
        { to: '/configuracoes/seguranca', icon: ShieldCheck, label: 'Segurança' },
        { to: '/configuracoes/backup', icon: DatabaseBackup, label: 'Backup' },
      ],
    },
  ],
  admin: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      color: 'text-blue-600 bg-blue-50',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      ],
    },
    {
      title: 'Patrimônio',
      icon: Archive,
      color: 'text-green-600 bg-green-50',
      items: [
        { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
        { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
        { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
        { to: '/locais', icon: MapPin, label: 'Locais' },
      ],
    },
    {
      title: 'Imóveis',
      icon: Building2,
      color: 'text-orange-600 bg-orange-50',
      items: [
        { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
        { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
        { to: '/imoveis/campos', icon: FileJson, label: 'Campos Personalizados' },
      ],
    },
    {
      title: 'Análise e Relatórios',
      icon: BarChart,
      color: 'text-purple-600 bg-purple-50',
      items: [
        { to: '/analise/setor', icon: Building, label: 'Análise por Setor' },
        { to: '/relatorios', icon: FileText, label: 'Gerar Relatórios' },
        { to: '/exportacao', icon: Download, label: 'Exportação de Dados' },
      ],
    },
    {
      title: 'Ferramentas',
      icon: Settings,
      color: 'text-cyan-600 bg-cyan-50',
      items: [
        { to: '/ferramentas/gerar-etiquetas', icon: Tag, label: 'Gerar Etiquetas' },
        { to: '/ferramentas/label-templates', icon: FileText, label: 'Templates de Etiquetas' },
      ],
    },
    {
      title: 'Administração',
      icon: Shield,
      color: 'text-red-600 bg-red-50',
      items: [
        { to: '/configuracoes/usuarios', icon: Users, label: 'Gerenciar Usuários' },
        { to: '/configuracoes/setores', icon: Building, label: 'Gerenciar Setores' },
        { to: '/configuracoes/tipos', icon: Package, label: 'Gerenciar Tipos de Bens' },
        { to: '/configuracoes/formas-aquisicao', icon: FileText, label: 'Formas de Aquisição' },
        { to: '/registros-de-atividade', icon: History, label: 'Logs de Atividade' },
        { to: '/configuracoes/personalizacao', icon: Palette, label: 'Personalização' },
        { to: '/configuracoes/seguranca', icon: ShieldCheck, label: 'Segurança' },
        { to: '/configuracoes/backup', icon: DatabaseBackup, label: 'Backup' },
      ],
    },
  ],
  usuario: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      color: 'text-blue-600 bg-blue-50',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      ],
    },
    {
      title: 'Patrimônio',
      icon: Archive,
      color: 'text-green-600 bg-green-50',
      items: [
        { to: '/bens-cadastrados', icon: List, label: 'Bens Cadastrados' },
        { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
        { to: '/inventarios', icon: ClipboardList, label: 'Inventários' },
        { to: '/locais', icon: MapPin, label: 'Locais' },
      ],
    },
    {
      title: 'Imóveis',
      icon: Building2,
      color: 'text-orange-600 bg-orange-50',
      items: [
        { to: '/imoveis', icon: List, label: 'Cadastro de Imóveis' },
        { to: '/imoveis/manutencao', icon: Wrench, label: 'Manutenção' },
      ],
    },
    {
      title: 'Ferramentas',
      icon: Settings,
      color: 'text-cyan-600 bg-cyan-50',
      items: [
        { to: '/exportacao', icon: Download, label: 'Exportação' },
        { to: '/relatorios', icon: FileText, label: 'Relatórios' },
        { to: '/gerar-etiquetas', icon: QrCode, label: 'Gerar Etiquetas' },
        { to: '/ferramentas/sync-client', icon: Laptop, label: 'Cliente de Sincronização' },
        { to: '/downloads', icon: Download, label: 'Downloads' },
      ],
    },
  ],
  visualizador: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      color: 'text-blue-600 bg-blue-50',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      ],
    },
    {
      title: 'Consulta',
      icon: Archive,
      color: 'text-green-600 bg-green-50',
      items: [
        { to: '/bens-cadastrados', icon: List, label: 'Listagem de Bens' },
        { to: '/imoveis', icon: List, label: 'Listagem de Imóveis' },
        { to: '/locais', icon: MapPin, label: 'Locais' },
      ],
    },
  ],
}

const MobileNavItem = ({ item }: { item: MobileNavItem }) => {
  const location = useLocation()
  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to)

  return (
    <NavLink
      to={item.to}
      className={cn(
        'flex items-center gap-4 p-fluid-sm rounded-lg transition-all duration-200 touch-target',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      <span className="font-medium text-fluid-base">{item.label}</span>
      {item.badge && (
        <Badge variant="secondary" className="ml-auto text-fluid-xs">
          {item.badge}
        </Badge>
      )}
      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
    </NavLink>
  )
}

const MobileNavGroup = ({ group }: { group: MobileNavGroup }) => {
  return (
    <div className="space-fluid-sm">
      <div className={cn('flex items-center gap-3 p-fluid-sm rounded-lg', group.color)}>
        <group.icon className="h-5 w-5" />
        <h3 className="font-semibold text-fluid-base">{group.title}</h3>
      </div>
      <div className="space-y-1 ml-4">
        {group.items.map((item, index) => (
          <MobileNavItem key={`${item.label}-${index}`} item={item} />
        ))}
      </div>
    </div>
  )
}

export const MobileNavigation = () => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const groups = user ? mobileNavGroups[user.role] || [] : []

  // Close menu when route changes
  React.useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (!user) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="mobile-only touch-target no-print"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-fluid-md border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-fluid-lg font-semibold">Menu</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="touch-target"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-fluid-sm text-muted-foreground">
            {user.name} - {user.role}
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-auto p-fluid-md space-fluid-lg">
          {groups.map((group, index) => (
            <MobileNavGroup key={`${group.title}-${index}`} group={group} />
          ))}
        </div>
        
        <div className="p-fluid-md border-t">
          <div className="text-fluid-xs text-muted-foreground text-center">
            SISPAT v2.0.0
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Bottom navigation for mobile
export const BottomNavigation = () => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return null

  const bottomNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Início', exact: true },
    { to: '/bens-cadastrados', icon: Archive, label: 'Bens' },
    { to: '/imoveis', icon: Building2, label: 'Imóveis' },
    { to: '/relatorios', icon: BarChart, label: 'Relatórios' },
    { to: '/configuracoes/personalizacao', icon: Settings, label: 'Config' },
  ]

  return (
    <div className="mobile-only fixed bottom-0 left-0 right-0 bg-background border-t safe-bottom no-print">
      <div className="flex items-center justify-around p-fluid-xs">
        {bottomNavItems.map((item, index) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={`${item.label}-${index}`}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1 p-fluid-xs rounded-lg touch-target transition-all duration-200',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-fluid-xs font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
