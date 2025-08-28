import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { Save } from 'lucide-react'
import { SystemConfiguration } from '@/types'

const SystemInformation = () => {
  const [config, setConfig] = useState<SystemConfiguration>({
    id: 'global-config',
    contactInfo: 'suporte@sispat.com',
    defaultSystemMessage: 'Bem-vindo ao Sistema de Gestão de Patrimônio.',
  })

  useEffect(() => {
    const storedConfig = localStorage.getItem('sispat_system_config')
    if (storedConfig) {
      setConfig(JSON.parse(storedConfig))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('sispat_system_config', JSON.stringify(config))
    toast({ description: 'Informações do sistema salvas com sucesso.' })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setConfig((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Informações Gerais do Sistema</h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Salvar Alterações
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais</CardTitle>
          <CardDescription>
            Gerencie informações e configurações que se aplicam a todo o
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="contactInfo">E-mail de Contato do Suporte</Label>
            <Input
              id="contactInfo"
              name="contactInfo"
              value={config.contactInfo}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultSystemMessage">
              Mensagem Padrão do Sistema
            </Label>
            <Textarea
              id="defaultSystemMessage"
              name="defaultSystemMessage"
              value={config.defaultSystemMessage}
              onChange={handleChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SystemInformation
