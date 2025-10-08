import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Users,
  Building,
  Palette,
  ShieldCheck,
  DatabaseBackup,
  Hash,
  Package,
  FileText,
} from 'lucide-react'

const settingsLinks = [
  {
    to: '/configuracoes/usuarios',
    icon: Users,
    title: 'Gerenciar Usuários',
    description: 'Adicione, edite e remova usuários do sistema.',
  },
  {
    to: '/configuracoes/setores',
    icon: Building,
    title: 'Gerenciar Setores',
    description: 'Organize a estrutura de setores do município.',
  },
  {
    to: '/configuracoes/tipos',
    icon: Package,
    title: 'Gerenciar Tipos de Bens',
    description: 'Configure os tipos de bens como eletrônicos, mobiliário, etc.',
  },
  {
    to: '/configuracoes/formas-aquisicao',
    icon: FileText,
    title: 'Gerenciar Formas de Aquisição',
    description: 'Configure as formas de aquisição como compra, doação, etc.',
  },
  {
    to: '/configuracoes/personalizacao',
    icon: Palette,
    title: 'Personalização',
    description: 'Customize a aparência do sistema e da tela de login.',
  },
  {
    to: '/configuracoes/seguranca',
    icon: ShieldCheck,
    title: 'Segurança',
    description: 'Configure opções de segurança como 2FA.',
  },
  {
    to: '/configuracoes/backup',
    icon: DatabaseBackup,
    title: 'Backup e Restauração',
    description: 'Realize e restaure backups dos dados do sistema.',
  },
  {
    to: '/configuracoes/numeracao-bens',
    icon: Hash,
    title: 'Numeração de Bens',
    description: 'Configure o padrão de numeração automática dos bens.',
  },
]

export default function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link to={link.to} key={link.to}>
            <Card className="h-full hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{link.title}</CardTitle>
                  <link.icon className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{link.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
