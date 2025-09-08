import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useDebounceValue } from '@/hooks/use-debounce';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

const documentationContent = [
  {
    id: 'funcoes',
    title: 'Explicação de Funções do Sistema',
    content: `
      <div class="prose dark:prose-invert max-w-none">
        <h4>Dashboard</h4>
        <p>O dashboard principal oferece uma visão geral do estado do patrimônio, com estatísticas rápidas, gráficos de distribuição e atividades recentes. Os widgets podem ser personalizados, adicionados, removidos e reordenados para se adequar às necessidades do usuário.</p>
        <h4>Cadastro de Bens</h4>
        <p>Permite o registro detalhado de novos bens móveis e imóveis. Para bens móveis, o número de patrimônio é gerado automaticamente no formato <code>AAAASSNNNNN</code> (Ano + Código do Setor + Sequencial), garantindo unicidade e padronização.</p>
        <h4>Inventário</h4>
        <p>Ferramenta para a realização de inventários físicos, permitindo a conferência dos bens em um determinado setor ou local. Ao finalizar, o sistema atualiza o status dos bens não encontrados para "extraviado", gerando um relatório de divergências.</p>
        <h4>Relatórios e Exportação</h4>
        <p>Gere relatórios personalizados e exporte dados nos formatos CSV, XLSX e PDF para análise externa e prestação de contas. Os modelos de relatório podem ser customizados para incluir campos específicos.</p>
        <h4>Consulta Pública</h4>
        <p>Uma interface pública que permite a qualquer cidadão consultar os bens do município, promovendo a transparência. A visibilidade dos municípios na consulta pública é configurável pelo superusuário.</p>
        <h4>Sincronização de Dados</h4>
        <p>O sistema garante que os dados sejam consistentes entre diferentes usuários do mesmo município. A sincronização pode ser acionada manualmente para garantir que as informações mais recentes estejam disponíveis.</p>
      </div>
    `,
  },
  {
    id: 'manual-usuario',
    title: 'Manual do Usuário (Perfil: Usuário)',
    content: `
      <div class="prose dark:prose-invert max-w-none">
        <h5>1. Acesso e Visão Geral</h5>
        <p>Ao fazer login, você terá acesso ao dashboard com informações resumidas do seu setor. Sua visão e ações são restritas aos setores pelos quais você é responsável, garantindo a segurança e integridade dos dados.</p>
        <h5>2. Cadastrando um Novo Bem</h5>
        <ul>
          <li>Navegue até "Patrimônio" > "Novo Cadastro".</li>
          <li>Selecione o "Setor Responsável". O sistema irá gerar automaticamente o próximo número de patrimônio disponível para aquele setor.</li>
          <li>Preencha todas as informações obrigatórias do formulário.</li>
          <li>Anexe fotos do bem para facilitar a identificação futura.</li>
          <li>Clique em "Salvar" para registrar o bem.</li>
        </ul>
        <h5>3. Realizando um Inventário</h5>
        <ul>
          <li>Vá para "Patrimônio" > "Inventários".</li>
          <li>Clique em "Novo Inventário" e selecione o setor a ser inventariado.</li>
          <li>Na tela do inventário, marque cada bem como "Encontrado" ou "Não Encontrado". O progresso é salvo automaticamente.</li>
          <li>Após concluir a verificação de todos os itens, notifique seu supervisor para que ele possa finalizar o processo.</li>
        </ul>
      </div>
    `,
  },
  {
    id: 'manual-supervisor',
    title: 'Manual do Supervisor (Perfis: Supervisor e Admin)',
    content: `
      <div class="prose dark:prose-invert max-w-none">
        <h5>1. Gerenciamento de Setores</h5>
        <p>Em "Administração" > "Gerenciar Setores", você pode criar e editar os setores do seu município. É crucial que cada setor tenha um <strong>Código de Setor</strong> de 2 dígitos único, pois ele é usado na geração automática do número de patrimônio.</p>
        <h5>2. Gerenciamento de Usuários</h5>
        <p>Em "Administração" > "Gerenciar Usuários", você pode adicionar novos usuários, editar perfis (Supervisor, Usuário, Visualizador) e definir a quais setores um usuário tem acesso. Isso garante o controle de acesso granular.</p>
        <h5>3. Finalizando Inventários</h5>
        <p>Após a conclusão da contagem por um usuário, o supervisor deve revisar e finalizar o inventário. Esta ação formaliza o resultado, gera um relatório de resumo e atualiza o status dos bens não localizados para "Extraviado".</p>
        <h5>4. Personalização</h5>
        <p>Em "Configurações", é possível personalizar a aparência da tela de login, gerenciar logos e temas para adequar o sistema à identidade visual do município.</p>
      </div>
    `,
  },
  {
    id: 'guia-implantacao',
    title: 'Guia Detalhado de Implantação (Deployment)',
    content: `
      <div class="prose dark:prose-invert max-w-none">
        <h4>Visão Geral</h4>
        <p>O SISPAT é uma aplicação web moderna construída com Vite, React, TypeScript e TailwindCSS. A implantação pode ser feita em qualquer serviço de hospedagem que suporte aplicações estáticas ou um servidor Node.js. Este guia detalha o processo para um ambiente de produção baseado em Linux.</p>
        
        <h4>1. Pré-requisitos</h4>
        <ul>
          <li><strong>Servidor:</strong> Um servidor Linux (Ubuntu 22.04 LTS recomendado).</li>
          <li><strong>Node.js:</strong> Versão 20.x ou superior.</li>
          <li><strong>Gerenciador de Pacotes:</strong> PNPM (<code>npm install -g pnpm</code>).</li>
          <li><strong>Servidor Web:</strong> Nginx é recomendado para servir os arquivos e configurar o roteamento.</li>
          <li><strong>Git:</strong> Para clonar o repositório do projeto.</li>
        </ul>

        <h4>2. Passo a Passo para Implantação</h4>
        <ol>
          <li><strong>Acessar o Servidor:</strong> Conecte-se ao seu servidor via SSH.</li>
          <li><strong>Clonar o Repositório:</strong> Clone a versão mais recente do projeto para um diretório (ex: <code>/var/www/sispat</code>).</li>
          <li><strong>Instalar Dependências:</strong> Navegue até o diretório do projeto e instale as dependências usando PNPM.
            <pre><code>cd /var/www/sispat && pnpm install</code></pre>
          </li>
          <li><strong>Configurar Variáveis de Ambiente:</strong> Crie um arquivo <code>.env.production</code> na raiz do projeto com as configurações necessárias.</li>
          <li><strong>Gerar o Build de Produção:</strong> Execute o comando de build para compilar a aplicação.
            <pre><code>pnpm build</code></pre>
            <p>Este comando criará um diretório <code>dist</code> com os arquivos estáticos.</p>
          </li>
          <li><strong>Configurar o Nginx:</strong> Crie um novo arquivo de configuração para o seu site no Nginx para servir a pasta <code>dist</code> e configurar o roteamento para a single-page application.
            <pre><code>server {
    listen 80;
    server_name sispat.seumunicipio.gov.br;
    root /var/www/sispat/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}</code></pre>
          </li>
          <li><strong>Ativar a Configuração e Reiniciar o Nginx:</strong> Ative o site e reinicie o Nginx para aplicar as alterações.</li>
        </ol>
      </div>
    `,
  },
];

const Documentation = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounceValue(searchTerm, 300);

  const filteredContent = useMemo(() => {
    if (!debouncedSearchTerm) return documentationContent;
    return documentationContent.filter(
      item =>
        item.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [debouncedSearchTerm]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header moderno com gradiente */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                />
              </svg>
            </div>
            <div>
              <h1 className='text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                Documentação do Sistema
              </h1>
              <p className='text-gray-600 mt-1'>
                Manuais, guias e informações detalhadas sobre o SISPAT
              </p>
            </div>
          </div>
        </div>

        {/* Barra de busca moderna */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8'>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <Search className='h-5 w-5 text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='Pesquisar na documentação...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white transition-all duration-200 text-lg'
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600'
              >
                <svg
                  className='h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo da documentação */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden'>
          <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
            <h2 className='text-lg font-semibold text-gray-800'>
              Bem-vindo à documentação do SISPAT
            </h2>
            <p className='text-sm text-gray-600'>
              Aqui você encontrará informações detalhadas sobre as
              funcionalidades, manuais e guias
            </p>
          </div>
          <div className='p-6'>
            <Accordion type='single' collapsible className='w-full'>
              {filteredContent.map(item => (
                <AccordionItem
                  value={item.id}
                  key={item.id}
                  className='border border-gray-200 rounded-lg mb-4'
                >
                  <AccordionTrigger className='px-6 py-4 hover:bg-gray-50 rounded-lg font-semibold text-gray-800'>
                    {item.title}
                  </AccordionTrigger>
                  <AccordionContent className='px-6 pb-4'>
                    <div
                      className='prose prose-sm max-w-none'
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filteredContent.length === 0 && (
              <div className='text-center py-12'>
                <div className='w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                  <Search className='w-12 h-12 text-gray-400' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  Nenhum resultado encontrado
                </h3>
                <p className='text-gray-600 mb-6'>
                  Não encontramos resultados para "{debouncedSearchTerm}". Tente
                  ajustar os termos da sua busca.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className='px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium'
                >
                  Limpar busca
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
