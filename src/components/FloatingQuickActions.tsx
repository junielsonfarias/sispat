import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import {
  Archive,
  BarChart,
  Download,
  FileText,
  Plus,
  QrCode,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FloatingAction {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
  color: string;
  bgColor: string;
}

const floatingActions: FloatingAction[] = [
  {
    label: 'Novo Bem',
    icon: Plus,
    path: '/bens-cadastrados/novo',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    color: 'text-white',
    bgColor:
      'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
  },
  {
    label: 'Gerar Etiqueta',
    icon: QrCode,
    path: '/gerar-etiquetas',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    color: 'text-white',
    bgColor:
      'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
  },
  {
    label: 'Relatórios',
    icon: FileText,
    path: '/relatorios',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    color: 'text-white',
    bgColor:
      'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700',
  },
  {
    label: 'Exportar',
    icon: Download,
    path: '/exportacao',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    color: 'text-white',
    bgColor:
      'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700',
  },
  {
    label: 'Análise',
    icon: BarChart,
    path: '/analise/setor',
    roles: ['superuser', 'supervisor', 'admin'],
    color: 'text-white',
    bgColor:
      'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700',
  },
  {
    label: 'Inventários',
    icon: Archive,
    path: '/inventarios',
    roles: ['superuser', 'supervisor', 'admin', 'usuario'],
    color: 'text-white',
    bgColor:
      'bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700',
  },
];

interface FloatingQuickActionsProps {
  className?: string;
  showLabels?: boolean;
}

export const FloatingQuickActions = ({
  className = '',
  showLabels = false,
}: FloatingQuickActionsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filtrar ações baseadas no role do usuário
  const availableActions = floatingActions.filter(
    action => user && action.roles.includes(user.role)
  );

  const handleActionClick = (path: string) => {
    navigate(path);
  };

  if (!user || availableActions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {availableActions.map(action => (
        <Button
          key={action.path}
          onClick={() => handleActionClick(action.path)}
          className={`${action.bgColor} ${action.color} shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
            showLabels ? 'px-4 py-2' : 'p-3'
          }`}
          title={action.label}
        >
          <action.icon className={`${showLabels ? 'mr-2' : ''} h-4 w-4`} />
          {showLabels && (
            <span className='text-sm font-medium'>{action.label}</span>
          )}
        </Button>
      ))}
    </div>
  );
};
