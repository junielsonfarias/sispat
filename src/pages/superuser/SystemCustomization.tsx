import { useState, useEffect, ChangeEvent } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCustomization,
  CustomizationSettings,
} from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { toast } from '@/hooks/use-toast'
import { Save, Undo, UploadCloud } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function SystemCustomization() {
  const { settings, saveSettings, resetSettings } = useCustomization()
  const [localSettings, setLocalSettings] = useState<CustomizationSettings>(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = async () => {
    try {
      await saveSettings(localSettings)
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso!',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configurações',
        variant: 'destructive',
      })
    }
  }

  const handleReset = async () => {
    try {
      await resetSettings()
      toast({
        title: 'Sucesso',
        description: 'Configurações restauradas para o padrão!',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao restaurar configurações',
        variant: 'destructive',
      })
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setLocalSettings((prev) => ({ ...prev, [name]: value }))
  }


  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof CustomizationSettings,
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLocalSettings((prev) => ({
          ...prev,
          [key]: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customização do Sistema</h1>
          <p className="text-muted-foreground">
            Personalize a aparência e configurações do sistema para {MUNICIPALITY_NAME}.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customização do Sistema</CardTitle>
          <CardDescription>
            Configure as aparências e textos do sistema para {MUNICIPALITY_NAME}.
          </CardDescription>
        </CardHeader>
        <CardContent>
        <ScrollArea className="h-[calc(100vh-22rem)]">
          <div className="space-y-6 pr-4">
            <Card>
              <CardHeader>
                <CardTitle>Identidade Visual</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="browserTitle">Título do Navegador</Label>
                  <Input
                    id="browserTitle"
                    name="browserTitle"
                    value={localSettings.browserTitle}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex-grow">
                    <Label htmlFor="faviconUrl">Favicon</Label>
                    <Input
                      id="faviconUrl"
                      name="faviconUrl"
                      value={localSettings.faviconUrl}
                      onChange={handleInputChange}
                      placeholder="URL do .ico ou data URL"
                    />
                  </div>
                  <Label
                    htmlFor="favicon-upload"
                    className="cursor-pointer shrink-0"
                  >
                    <Button asChild variant="outline">
                      <span>
                        <UploadCloud className="mr-2 h-4 w-4" /> Enviar
                      </span>
                    </Button>
                    <Input
                      id="favicon-upload"
                      type="file"
                      className="hidden"
                      accept="image/x-icon,image/png,image/svg+xml"
                      onChange={(e) => handleFileChange(e, 'faviconUrl')}
                    />
                  </Label>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Textos de Rodapé</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="loginFooterText">
                    Rodapé da Tela de Login
                  </Label>
                  <Textarea
                    id="loginFooterText"
                    name="loginFooterText"
                    value={localSettings.loginFooterText}
                    onChange={handleInputChange}
                    placeholder="Deixe em branco para usar o padrão."
                  />
                </div>
                <div>
                  <Label htmlFor="systemFooterText">
                    Rodapé Interno do Sistema
                  </Label>
                  <Textarea
                    id="systemFooterText"
                    name="systemFooterText"
                    value={localSettings.systemFooterText}
                    onChange={handleInputChange}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
          >
            <Undo className="mr-2 h-4 w-4" /> Redefinir
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Salvar Configurações
          </Button>
        </CardFooter>
        </CardContent>
      </Card>
    </div>
  )
}
