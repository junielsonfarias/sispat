import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { toast } from '@/hooks/use-toast'

export default function SecuritySettings() {
  const [is2faEnabled, setIs2faEnabled] = useState(false)

  const handleToggle2FA = (enabled: boolean) => {
    setIs2faEnabled(enabled)
    toast({
      title: 'Configuração de Segurança',
      description: `Autenticação de dois fatores ${
        enabled ? 'habilitada' : 'desabilitada'
      }.`,
    })
  }

  const handleConfigure2FA = () => {
    toast({
      title: 'Configurar 2FA',
      description:
        'Esta funcionalidade será implementada em uma versão futura.',
    })
  }

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
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="2fa-switch" className="flex flex-col gap-1">
              <span>Habilitar 2FA</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Será necessário um código de um aplicativo autenticador para
                fazer login.
              </span>
            </Label>
            <Switch
              id="2fa-switch"
              checked={is2faEnabled}
              onCheckedChange={handleToggle2FA}
            />
          </div>
          {is2faEnabled && (
            <Button onClick={handleConfigure2FA}>Configurar 2FA</Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
