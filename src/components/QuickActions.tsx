import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import {
    Archive,
    BarChart,
    Download,
    FileText,
    Plus,
    QrCode,
    Settings,
    Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
  description: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'Novo Bem',
    icon: Plus,
    path: '/bens-cadastrados/novo',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    description: 'Cadastrar novo patrimônio',
  },
  {
    label: 'Gerar Etiqueta',
    icon: QrCode,
    path: '/gerar-etiquetas',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    description: 'Criar etiquetas QR Code',
  },
  {
    label: 'Relatórios',
    icon: FileText,
    path: '/relatorios',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    description: 'Gerar relatórios',
  },
  {
    label: 'Exportar Dados',
    icon: Download,
    path: '/exportacao',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    description: 'Exportar dados do sistema',
  },
  {
    label: 'Análise por Setor',
    icon: BarChart,
    path: '/analise/setor',
    roles: ['superuser', 'supervisor', 'admin'],
    description: 'Análise estatística por setor',
  },
  {
    label: 'Inventários',
    icon: Archive,
    path: '/inventarios',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    description: 'Gerenciar inventários',
  },
  {
    label: 'Configurações',
    icon: Settings,
    path: '/configuracoes',
    roles: ['superuser', 'supervisor', 'admin'],
    description: 'Configurações do sistema',
  },
];

export const QuickActions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filtrar ações baseadas no role do usuário
  const availableActions = quickActions.filter(action => 
    user && action.roles.includes(user.role)
  );

  const handleActionClick = (path: string) => {
    navigate(path);
  };

  if (!user || availableActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-10 w-10 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border border-transparent hover:border-blue-200'
          title='Ações Rápidas'
        >
          <Zap className='h-5 w-5 text-blue-600' />
          <span className='sr-only'>Ações Rápidas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align='end' 
        className='w-72 p-2 shadow-xl border-0 bg-white/95 backdrop-blur-md'
      >
        <DropdownMenuLabel className='px-3 py-2 text-base font-semibold text-gray-900 flex items-center gap-2'>
          <Zap className='h-4 w-4 text-blue-600' />
          Ações Rápidas
        </DropdownMenuLabel>
        <DropdownMenuSeparator className='bg-gray-200' />
        
        {availableActions.map((action, index) => (
          <DropdownMenuItem
            key={action.path}
            onClick={() => handleActionClick(action.path)}
            className='px-3 py-3 text-sm rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group'
          >
            <div className='flex items-center gap-3 w-full'>
              <div className='p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-200'>
                <action.icon className='h-4 w-4 text-blue-600' />
              </div>
              <div className='flex-1'>
                <div className='font-medium text-gray-900'>{action.label}</div>
                <div className='text-xs text-gray-500'>{action.description}</div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
