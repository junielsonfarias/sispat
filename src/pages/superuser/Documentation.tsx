import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

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
]

const Documentation = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const filteredContent = useMemo(() => {
    if (!debouncedSearchTerm) return documentationContent
    return documentationContent.filter(
      (item) =>
        item.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    )
  }, [debouncedSearchTerm])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Documentação do Sistema</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo à documentação do SISPAT</CardTitle>
          <CardDescription>
            Aqui você encontrará informações detalhadas sobre as
            funcionalidades, manuais e guias.
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar na documentação..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {filteredContent.map((item) => (
              <AccordionItem value={item.id} key={item.id}>
                <AccordionTrigger>{item.title}</AccordionTrigger>
                <AccordionContent>
                  <div dangerouslySetInnerHTML={{ __html: item.content }} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {filteredContent.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum resultado encontrado para "{debouncedSearchTerm}".
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Documentation
