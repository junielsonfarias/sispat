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
  ChevronDown,
  Package,
  PieChart,
  Calendar,
  Hash,
  TrendingDown,
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
        { to: '/', icon: LayoutDashboard, label: 'Visão Geral', exact: true },
        { to: '/dashboard/depreciacao', icon: TrendingDown, label: 'Depreciação' },
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
        { to: '/analise/tipo', icon: PieChart, label: 'Análise por Tipo' },
        { to: '/analise/temporal', icon: Calendar, label: 'Análise Temporal' },
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
        { to: '/configuracoes/numeracao-bens', icon: Hash, label: 'Numeração de Bens' },
      ],
    },
  ],
  admin: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      color: 'text-blue-600 bg-blue-50',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Visão Geral', exact: true },
        { to: '/dashboard/depreciacao', icon: TrendingDown, label: 'Depreciação' },
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
        { to: '/analise/tipo', icon: PieChart, label: 'Análise por Tipo' },
        { to: '/analise/temporal', icon: Calendar, label: 'Análise Temporal' },
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
        { to: '/configuracoes/numeracao-bens', icon: Hash, label: 'Numeração de Bens' },
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
        'flex items-center gap-4 p-3 rounded-lg transition-all duration-200 touch-target min-h-[44px]',
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

const MobileNavGroup = ({ 
  group, 
  isOpen, 
  onToggle 
}: { 
  group: MobileNavGroup
  isOpen: boolean
  onToggle: () => void
}) => {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-all duration-200',
          'hover:bg-accent active:scale-[0.98]',
          group.color
        )}
      >
        <group.icon className="h-5 w-5 flex-shrink-0" />
        <h3 className="font-semibold text-base flex-1 text-left">{group.title}</h3>
        <ChevronDown 
          className={cn(
            'h-5 w-5 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
          )} 
        />
      </button>
      
      {/* Conteúdo expansível com animação */}
      <div 
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-1 ml-2 pt-1">
          {group.items.map((item, index) => (
            <MobileNavItem key={`${item.label}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

export const MobileNavigation = () => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(0) // Primeiro grupo aberto por padrão
  const location = useLocation()

  const groups = user ? mobileNavGroups[user.role] || [] : []

  // Close menu when route changes
  React.useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Toggle group - fecha outros ao abrir um
  const handleToggleGroup = (index: number) => {
    setOpenGroupIndex(openGroupIndex === index ? null : index)
  }

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
      <SheetContent side="left" className="w-80 max-w-[90vw] p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="touch-target h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {user.name} - {user.role}
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3">
          {groups.map((group, index) => (
            <MobileNavGroup 
              key={`${group.title}-${index}`} 
              group={group}
              isOpen={openGroupIndex === index}
              onToggle={() => handleToggleGroup(index)}
            />
          ))}
        </div>
        
        <div className="p-4 border-t flex-shrink-0">
          <div className="text-xs text-muted-foreground text-center">
            SISPAT v2.0.0
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Bottom navigation for mobile - Redesenhado e otimizado
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
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg no-print z-50 safe-bottom"
      aria-label="Navegação inferior"
    >
      <div className="grid grid-cols-5 gap-0 px-1 py-2 max-w-screen-xl mx-auto">
        {bottomNavItems.map((item, index) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={`${item.label}-${index}`}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all duration-200 touch-target min-h-[56px]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon 
                className={cn(
                  'h-6 w-6 transition-transform',
                  isActive && 'scale-110'
                )} 
              />
              <span className={cn(
                'text-xs font-medium leading-none',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
