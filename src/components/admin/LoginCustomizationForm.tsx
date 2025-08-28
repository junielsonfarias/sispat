import { LoginPreview } from '@/components/admin/LoginPreview'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    CustomizationSettings,
    useCustomization,
} from '@/contexts/CustomizationContext'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Save, Undo } from 'lucide-react'
import { useEffect, useState } from 'react'

const LoginCustomizationForm = () => {
  const { user } = useAuth()
  const {
    getSettingsForMunicipality,
    saveSettingsForMunicipality,
    resetSettingsForMunicipality,
  } = useCustomization()
  const [settings, setSettings] = useState<CustomizationSettings>(
    getSettingsForMunicipality(user?.municipalityId || null),
  )

  useEffect(() => {
    if (user?.municipalityId) {
      setSettings(getSettingsForMunicipality(user.municipalityId))
    }
  }, [user, getSettingsForMunicipality])

  const handleSave = () => {
    if (user?.municipalityId) {
      saveSettingsForMunicipality(user.municipalityId, settings)
      toast({ description: 'Configurações da tela de login salvas.' })
    }
  }

  const handleReset = () => {
    if (user?.municipalityId) {
      resetSettingsForMunicipality(user.municipalityId)
      setSettings(getSettingsForMunicipality(user.municipalityId))
      toast({ description: 'Configurações redefinidas para o padrão.' })
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
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
                  value={settings.welcomeTitle}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="welcomeSubtitle">Subtítulo</Label>
                <Input
                  id="welcomeSubtitle"
                  name="welcomeSubtitle"
                  value={settings.welcomeSubtitle}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="loginFooterText">Texto do Rodapé</Label>
                <Textarea
                  id="loginFooterText"
                  name="loginFooterText"
                  value={settings.loginFooterText}
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
