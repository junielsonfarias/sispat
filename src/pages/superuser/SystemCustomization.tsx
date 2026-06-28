import { useState, useEffect, ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Save, Undo, UploadCloud, Info } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { uploadFile } from '@/services/fileService'
import { useAuth } from '@/hooks/useAuth'

export default function SystemCustomization() {
  const { settings, saveSettings, resetSettings } = useCustomization()
  const { user } = useAuth()
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


  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof CustomizationSettings,
  ) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reenviar o mesmo arquivo
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ description: 'Selecione um arquivo de imagem.', variant: 'destructive' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: 'O arquivo deve ter no máximo 5MB.', variant: 'destructive' })
      return
    }
    // Upload real (→ /uploads/...) em vez de base64 (não infla o banco/customization).
    try {
      toast({ description: 'Enviando imagem...' })
      const result = await uploadFile(file, 'customization', user?.id || 'superuser')
      setLocalSettings((prev) => ({ ...prev, [key]: result.file_url }))
      toast({ description: 'Imagem enviada. Clique em "Salvar" para confirmar.' })
    } catch {
      toast({ description: 'Falha ao enviar a imagem. Tente novamente.', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customização do Sistema</h1>
          <p className="text-muted-foreground">
            Configurações de plataforma para {MUNICIPALITY_NAME}: título do navegador,
            favicon e textos de rodapé do sistema.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esta tela trata <strong>configurações de plataforma</strong> (visíveis para todos
          os usuários do sistema). Para ajustar identidade do município (logos, informações,
          tela de login), use{' '}
          <Link to="/configuracoes/personalizacao" className="text-primary hover:underline font-medium">
            Configurações → Personalização
          </Link>.
        </AlertDescription>
      </Alert>
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
