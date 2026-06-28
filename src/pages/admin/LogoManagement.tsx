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
import { toast } from '@/hooks/use-toast'
import { UploadCloud, X, Trash2 } from 'lucide-react'
import { uploadFile } from '@/services/fileService'
import { useAuth } from '@/hooks/useAuth'

const LogoManagement = () => {
  const { settings, saveSettings } = useCustomization()
  const { user } = useAuth()
  const [localSettings, setLocalSettings] = useState<CustomizationSettings>(
    settings,
  )

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof CustomizationSettings,
  ) => {
    const file = e.target.files?.[0]
    // Limpa o input para permitir reenviar o MESMO arquivo depois.
    e.target.value = ''
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({ description: 'Por favor, selecione apenas arquivos de imagem.', variant: 'destructive' })
      return
    }
    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: 'O arquivo deve ter no máximo 5MB.', variant: 'destructive' })
      return
    }

    // Upload de verdade (POST /upload/single → /uploads/...), em vez de base64.
    // O backend guarda o arquivo e devolve a URL; isso não infla a customização
    // no banco nem o /customization/public (que volta a cada login).
    try {
      toast({ description: 'Enviando logo...' })
      const result = await uploadFile(file, 'logo', user?.id || 'admin')
      setLocalSettings((prev) => ({ ...prev, [key]: result.file_url }))
      toast({ description: 'Logo enviado. Clique em "Salvar Alterações" para confirmar.' })
    } catch {
      toast({ description: 'Falha ao enviar o logo. Tente novamente.', variant: 'destructive' })
    }
  }

  const handleSave = () => {
    saveSettings(localSettings)
    toast({ description: 'Logos atualizados com sucesso.' })
  }

  const handleRemoveLogo = (key: keyof CustomizationSettings) => {
    const updated = { ...localSettings, [key]: '' }
    setLocalSettings(updated)
    // Persistir de fato — antes só atualizava o estado local e o logo voltava ao recarregar.
    saveSettings(updated)
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
                aria-label="Remover logo principal"
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
                  aria-label="Remover logo secundário"
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
