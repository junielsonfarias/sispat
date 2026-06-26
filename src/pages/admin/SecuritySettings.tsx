import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ShieldAlert } from 'lucide-react'

export default function SecuritySettings() {
  // A autenticação de dois fatores ainda não possui backend. Em vez de simular
  // sucesso (toast enganoso), o controle fica desabilitado com aviso honesto.
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/configuracoes">Configurações</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Segurança</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Configurações de Segurança</h1>
      <Card>
        <CardHeader>
          <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Recurso em desenvolvimento</AlertTitle>
            <AlertDescription>
              A autenticação de dois fatores ainda não está disponível. Esta
              opção será habilitada em uma versão futura.
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between rounded-lg border p-4 opacity-60">
            <Label htmlFor="2fa-switch" className="flex flex-col gap-1">
              <span>Habilitar 2FA</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Será necessário um código de um aplicativo autenticador para
                fazer login.
              </span>
            </Label>
            <Switch id="2fa-switch" checked={false} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
