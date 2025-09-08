import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle,
  FileText,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const features = [
    {
      icon: Building2,
      title: 'Gestão de Patrimônio',
      description:
        'Controle completo dos bens patrimoniais com rastreamento em tempo real',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Users,
      title: 'Gestão de Usuários',
      description:
        'Controle de acesso e permissões para diferentes níveis de usuários',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: FileText,
      title: 'Relatórios Avançados',
      description:
        'Geração de relatórios detalhados e exportação em múltiplos formatos',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: BarChart3,
      title: 'Dashboard Analytics',
      description: 'Visualização de dados e métricas importantes do sistema',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: Settings,
      title: 'Configurações',
      description:
        'Personalização completa do sistema conforme suas necessidades',
      color: 'from-gray-500 to-gray-600',
    },
    {
      icon: Shield,
      title: 'Segurança',
      description:
        'Sistema seguro com autenticação e controle de acesso robusto',
      color: 'from-red-500 to-red-600',
    },
  ];

  const benefits = [
    'Controle total do patrimônio',
    'Relatórios em tempo real',
    'Interface intuitiva e moderna',
    'Segurança de dados garantida',
    'Suporte técnico especializado',
    'Atualizações automáticas',
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* Hero Section */}
      <div className='relative overflow-hidden'>
        <div className='container mx-auto px-6 py-16'>
          <div className='text-center max-w-4xl mx-auto'>
            <div className='inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6'>
              <CheckCircle className='w-4 h-4' />
              Sistema de Patrimônio Moderno
            </div>

            <h1 className='text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6'>
              SISPAT
            </h1>

            <p className='text-xl text-gray-600 mb-8 leading-relaxed'>
              Gerencie seu patrimônio de forma inteligente com nossa plataforma
              completa de gestão patrimonial. Controle, monitore e otimize todos
              os seus bens em um só lugar.
            </p>

            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Link
                to='/bens-cadastrados'
                className='inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              >
                Começar Agora
                <ArrowRight className='w-5 h-5' />
              </Link>

              <Link
                to='/relatorios'
                className='inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              >
                Ver Relatórios
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className='container mx-auto px-6 py-16'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold text-gray-900 mb-4'>
            Recursos Principais
          </h2>
          <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
            Descubra todas as funcionalidades que tornam o SISPAT a melhor
            escolha para gestão patrimonial
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {features.map((feature, index) => (
            <div
              key={index}
              className='bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1'
            >
              <div
                className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4`}
              >
                <feature.icon className='w-6 h-6 text-white' />
              </div>

              <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                {feature.title}
              </h3>

              <p className='text-gray-600 leading-relaxed'>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className='bg-white py-16'>
        <div className='container mx-auto px-6'>
          <div className='max-w-4xl mx-auto text-center'>
            <h2 className='text-4xl font-bold text-gray-900 mb-8'>
              Por que escolher o SISPAT?
            </h2>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-12'>
              {benefits.map((benefit, index) => (
                <div key={index} className='flex items-center gap-3 text-left'>
                  <CheckCircle className='w-6 h-6 text-green-500 flex-shrink-0' />
                  <span className='text-gray-700 font-medium'>{benefit}</span>
                </div>
              ))}
            </div>

            <div className='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200'>
              <h3 className='text-2xl font-bold text-gray-900 mb-4'>
                Pronto para começar?
              </h3>
              <p className='text-gray-600 mb-6'>
                Acesse o sistema e comece a gerenciar seu patrimônio de forma
                profissional
              </p>
              <Link
                to='/bens-cadastrados'
                className='inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200'
              >
                Acessar Sistema
                <ArrowRight className='w-4 h-4' />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
