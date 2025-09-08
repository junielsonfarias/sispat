import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import {
    Archive,
    BarChart,
    Building,
    Building2,
    Calendar,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Database,
    DatabaseBackup,
    Download,
    FileJson,
    FileText,
    History,
    Home,
    Laptop,
    LayoutDashboard,
    LayoutTemplate,
    List,
    Map,
    MapPin,
    Palette,
    PieChart,
    Plus,
    QrCode,
    Settings,
    ShieldCheck,
    Users,
    Wrench
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  to?: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  isGroupLabel?: boolean;
  children?: NavItem[];
  isCollapsible?: boolean;
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
    ],
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
    ],
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
    ],
  },

  {
    label: 'Ferramentas',
    icon: Settings,
    isGroupLabel: true,
    isCollapsible: true,
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
    ],
  },

  {
    label: 'Administração',
    icon: Users,
    isGroupLabel: true,
    isCollapsible: true,
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
        to: '/registros-de-atividade',
        icon: History,
        label: 'Logs de Atividade',
      },
      { to: '/admin/auditoria', icon: Database, label: 'Auditoria do Sistema' },
    ],
  },

  {
    label: 'Configurações',
    icon: Settings,
    isGroupLabel: true,
    isCollapsible: true,
    children: [
      {
        to: '/configuracoes/personalizacao',
        icon: Palette,
        label: 'Personalização',
      },
      { to: '/configuracoes/seguranca', icon: ShieldCheck, label: 'Segurança' },
      { to: '/configuracoes/backup', icon: DatabaseBackup, label: 'Backup' },
    ],
  },
];

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
      ],
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
      ],
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
        {
          to: '/ferramentas/sync-client',
          icon: Laptop,
          label: 'Cliente de Sincronização',
        },
        { to: '/downloads', icon: Download, label: 'Downloads' },
      ],
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
      ],
    },
  ],
};

const NavItemComponent = ({ item }: { item: NavItem }) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = item.to
    ? item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)
    : false;

  const hasActiveChild = item.children?.some(child =>
    location.pathname.startsWith(child.to || '')
  );

  if (item.isGroupLabel) {
    if (item.isCollapsible && item.children) {
      return (
        <div className='space-y-1'>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'group flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 rounded-lg relative overflow-hidden',
              'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md hover:scale-[1.01]',
              'text-gray-600 hover:text-blue-700',
              (isActive || hasActiveChild) && 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm'
            )}
          >
            <div className='flex items-center gap-3'>
              <div className={cn(
                'p-1.5 rounded-lg transition-all duration-300',
                'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-200',
                (isActive || hasActiveChild) && 'bg-gradient-to-br from-blue-200 to-indigo-300'
              )}>
                <item.icon className='h-3.5 w-3.5' />
              </div>
              <span className='font-semibold'>{item.label}</span>
            </div>
            <div className={cn(
              'transition-transform duration-300',
              isExpanded ? 'rotate-90' : 'rotate-0'
            )}>
              <ChevronRight className='h-3 w-3' />
            </div>
          </button>
          {isExpanded && (
          <div className='ml-5 space-y-1 mt-2 animate-in slide-in-from-top-2 duration-300'>
            {item.children.map((child, index) => (
              <NavLink
                key={`${child.label}-${index}`}
                to={child.to!}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-300 relative overflow-hidden',
                  'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-sm hover:scale-[1.01]',
                  'text-gray-600 hover:text-indigo-700',
                  location.pathname.startsWith(child.to || '') &&
                    'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 shadow-sm'
                )}
              >
                  <div className={cn(
                    'p-1.5 rounded-md transition-all duration-300',
                    'bg-gray-100 group-hover:bg-indigo-100',
                    location.pathname.startsWith(child.to || '') && 'bg-indigo-200'
                  )}>
                    <child.icon className='h-3.5 w-3.5' />
                  </div>
                  <span className='font-medium'>{child.label}</span>
                  {location.pathname.startsWith(child.to || '') && (
                    <div className='ml-auto w-2 h-2 bg-indigo-500 rounded-full animate-pulse' />
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
        <h3 className='px-3 py-2 text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2 mt-6 flex items-center gap-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200/50'>
        <div className='p-1.5 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300'>
          <item.icon className='h-3.5 w-3.5' />
        </div>
        <span className='font-bold'>{item.label}</span>
      </h3>
    );
  }

  return (
        <NavLink
          to={item.to!}
          className={cn(
            'group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-300 relative overflow-hidden',
            'hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:shadow-sm hover:scale-[1.01]',
            'text-gray-600 hover:text-emerald-700',
            isActive && 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 shadow-sm'
          )}
        >
      <div className={cn(
        'p-1.5 rounded-md transition-all duration-300',
        'bg-gray-100 group-hover:bg-emerald-100',
        isActive && 'bg-emerald-200'
      )}>
        <item.icon className='h-3.5 w-3.5' />
      </div>
      <span className='font-medium'>{item.label}</span>
      {isActive && (
        <div className='ml-auto w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
      )}
    </NavLink>
  );
};

export const NavContent = () => {
  const { user } = useAuth();
  const links = user ? navLinks[user.role] || [] : [];

  return (
        <nav className='flex flex-col px-3 text-sm font-medium py-4 space-y-1 bg-gradient-to-b from-transparent to-gray-50/30'>
      {links.map((item, index) => (
        <div key={`${item.label}-${index}`} className='animate-in fade-in-0 slide-in-from-left-2 duration-500' style={{ animationDelay: `${index * 100}ms` }}>
          <NavItemComponent item={item} />
        </div>
      ))}
    </nav>
  );
};
