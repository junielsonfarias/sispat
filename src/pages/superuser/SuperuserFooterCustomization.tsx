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
import {
  useCustomization,
  CustomizationSettings,
} from '@/contexts/CustomizationContext'
import { toast } from '@/hooks/use-toast'
import { Save } from 'lucide-react'

const SuperuserFooterCustomization = () => {
  const { getSettingsForMunicipality, saveSettingsForMunicipality } =
    useCustomization()
  const [settings, setSettings] = useState<CustomizationSettings>(
    getSettingsForMunicipality('superuser'),
  )

  useEffect(() => {
    setSettings(getSettingsForMunicipality('superuser'))
  }, [getSettingsForMunicipality])

  const handleSave = () => {
    saveSettingsForMunicipality('superuser', settings)
    toast({ description: 'Rodapé do superusuário atualizado com sucesso.' })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Personalização do Rodapé do Superusuário
        </h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Salvar Alterações
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Rodapé</CardTitle>
          <CardDescription>
            Personalize o texto exibido no rodapé das páginas de superusuário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="superUserFooterText">Texto do Rodapé</Label>
            <Input
              id="superUserFooterText"
              name="superUserFooterText"
              value={settings.superUserFooterText || ''}
              onChange={handleChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SuperuserFooterCustomization
