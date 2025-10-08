import { useState, useEffect, ChangeEvent } from 'react'
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
import {
  useCustomization,
  CustomizationSettings,
} from '@/contexts/CustomizationContext'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Save, Undo } from 'lucide-react'
import { LoginPreview } from '@/components/admin/LoginPreview'

const LoginCustomizationForm = () => {
  const { user } = useAuth()
  const { settings, saveSettings, resetSettings } = useCustomization()
  const [localSettings, setLocalSettings] = useState<CustomizationSettings>(
    settings,
  )

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    saveSettings(localSettings)
    toast({ description: 'Configurações da tela de login salvas.' })
  }

  const handleReset = () => {
    resetSettings()
    setLocalSettings(settings)
    toast({ description: 'Configurações redefinidas para o padrão.' })
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setLocalSettings((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          <Undo className="mr-2 h-4 w-4" /> Redefinir para Padrão
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Salvar Alterações
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Textos da Tela de Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="welcomeTitle">Título de Boas-Vindas</Label>
                <Input
                  id="welcomeTitle"
                  name="welcomeTitle"
                  value={localSettings.welcomeTitle}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="welcomeSubtitle">Subtítulo</Label>
                <Input
                  id="welcomeSubtitle"
                  name="welcomeSubtitle"
                  value={localSettings.welcomeSubtitle}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="loginFooterText">Texto do Rodapé</Label>
                <Textarea
                  id="loginFooterText"
                  name="loginFooterText"
                  value={localSettings.loginFooterText}
                  onChange={handleInputChange}
                  placeholder="Deixe em branco para usar o padrão do sistema."
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 sticky top-24">
          <Card>
            <CardHeader>
              <CardTitle>Visualização</CardTitle>
              <CardDescription>
                Veja como a tela de login aparecerá para os usuários do seu
                município.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginPreview settings={settings} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default LoginCustomizationForm
