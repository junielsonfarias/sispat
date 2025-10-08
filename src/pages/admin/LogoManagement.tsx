import { useState, ChangeEvent, useEffect } from 'react'
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
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { UploadCloud, X, Trash2 } from 'lucide-react'

const LogoManagement = () => {
  const { user } = useAuth()
  const { settings, saveSettings } = useCustomization()
  const [localSettings, setLocalSettings] = useState<CustomizationSettings>(
    settings,
  )

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof CustomizationSettings,
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({ 
          description: 'Por favor, selecione apenas arquivos de imagem.',
          variant: 'destructive'
        })
        return
      }

      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          description: 'O arquivo deve ter no máximo 5MB.',
          variant: 'destructive'
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setLocalSettings((prev) => ({ ...prev, [key]: reader.result as string }))
        toast({ description: 'Logo carregado com sucesso.' })
      }
      reader.onerror = () => {
        toast({ 
          description: 'Erro ao carregar o arquivo.',
          variant: 'destructive'
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    saveSettings(localSettings)
    toast({ description: 'Logos atualizados com sucesso.' })
  }

  const handleRemoveLogo = (key: keyof CustomizationSettings) => {
    setLocalSettings((prev) => ({ ...prev, [key]: '' }))
    toast({ description: 'Logo removido.' })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo Principal</CardTitle>
          <CardDescription>
            Este logo aparecerá na tela de login e no cabeçalho do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center">
            <img
              src={localSettings.activeLogoUrl}
              alt="Logo Principal"
              className="max-w-full max-h-full"
            />
            {localSettings.activeLogoUrl && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveLogo('activeLogoUrl')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Label htmlFor="logo-principal-input" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
                <UploadCloud className="h-4 w-4" />
                <span>Alterar Logo Principal</span>
              </div>
              <Input
                id="logo-principal-input"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'activeLogoUrl')}
              />
            </Label>
            {localSettings.activeLogoUrl && (
              <Button
                variant="outline"
                onClick={() => handleRemoveLogo('activeLogoUrl')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logo Secundário (Opcional)</CardTitle>
          <CardDescription>
            Este logo pode ser usado em relatórios e outros documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center">
            {localSettings.secondaryLogoUrl ? (
              <>
                <img
                  src={localSettings.secondaryLogoUrl}
                  alt="Logo Secundário"
                  className="max-w-full max-h-full"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemoveLogo('secondaryLogoUrl')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">Sem logo</span>
            )}
          </div>
          <div className="flex gap-2">
            <Label htmlFor="logo-secundario-input" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
                <UploadCloud className="h-4 w-4" />
                <span>Alterar Logo Secundário</span>
              </div>
              <Input
                id="logo-secundario-input"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'secondaryLogoUrl')}
              />
            </Label>
            {localSettings.secondaryLogoUrl && (
              <Button
                variant="outline"
                onClick={() => handleRemoveLogo('secondaryLogoUrl')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave}>Salvar Alterações</Button>
      </div>
    </div>
  )
}

export default LogoManagement
