import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    SearchableSelect,
    SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    CustomizationSettings,
    useCustomization,
} from '@/contexts/CustomizationContext'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { toast } from '@/hooks/use-toast'
import { Info, Save, Undo, UploadCloud } from 'lucide-react'
import { ChangeEvent, useEffect, useState } from 'react'

export default function SystemCustomization() {
  const {
    getSettingsForMunicipality,
    saveSettingsForMunicipality,
    resetSettingsForMunicipality,
  } = useCustomization()
  const { municipalities } = useMunicipalities()
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<
    string | null
  >(municipalities[0]?.id || null)
  const [localSettings, setLocalSettings] = useState<CustomizationSettings>(
    getSettingsForMunicipality(selectedMunicipalityId),
  )
  const [globalSettings, setGlobalSettings] = useState<CustomizationSettings>(
    getSettingsForMunicipality('global_login_settings'),
  )

  const municipalityOptions: SearchableSelectOption[] = municipalities.map(
    (m) => ({ value: m.id, label: m.name }),
  )

  useEffect(() => {
    setLocalSettings(getSettingsForMunicipality(selectedMunicipalityId))
  }, [selectedMunicipalityId, getSettingsForMunicipality])

  useEffect(() => {
    setGlobalSettings(getSettingsForMunicipality('global_login_settings'))
  }, [getSettingsForMunicipality])

  const handleSave = () => {
    if (selectedMunicipalityId) {
      saveSettingsForMunicipality(selectedMunicipalityId, localSettings)
      toast({ description: 'Configurações de customização salvas.' })
    }
  }

  const handleGlobalSave = () => {
    saveSettingsForMunicipality('global_login_settings', globalSettings)
    toast({ description: 'Configurações globais da tela de login salvas.' })
  }

  const handleReset = () => {
    if (selectedMunicipalityId) {
      resetSettingsForMunicipality(selectedMunicipalityId)
      setLocalSettings(getSettingsForMunicipality(selectedMunicipalityId))
      toast({ description: 'Configurações redefinidas para o padrão.' })
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setLocalSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleGlobalInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setGlobalSettings((prev) => ({ ...prev, [name]: value }))
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
            Personalize a aparência global do sistema para cada município.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais da Tela de Login</CardTitle>
          <CardDescription>
            Estas configurações se aplicam a todos os municípios como padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label
              htmlFor="globalLoginFooterText"
              className="flex items-center"
            >
              Texto do Rodapé Padrão
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Este texto aparecerá na tela de login por padrão. <br />
                    Pode ser substituído por um texto específico de cada
                    município.
                  </p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Textarea
              id="globalLoginFooterText"
              name="loginFooterText"
              value={globalSettings.loginFooterText}
              onChange={handleGlobalInputChange}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGlobalSave}>Salvar Configuração Padrão</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Customização por Município</CardTitle>
          <CardDescription>
            Escolha um município para sobrescrever as configurações padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchableSelect
            options={municipalityOptions}
            value={selectedMunicipalityId}
            onChange={setSelectedMunicipalityId}
            placeholder="Selecione um município"
          />
        </CardContent>
      </Card>
      {selectedMunicipalityId && (
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
                    <Button as="span" variant="outline">
                      <UploadCloud className="mr-2 h-4 w-4" /> Enviar
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
                <div className="flex items-end gap-4">
                  <div className="flex-grow">
                    <Label htmlFor="activeLogoUrl">Logo Principal</Label>
                    <Input
                      id="activeLogoUrl"
                      name="activeLogoUrl"
                      value={localSettings.activeLogoUrl}
                      onChange={handleInputChange}
                      placeholder="URL do logo principal"
                    />
                  </div>
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer shrink-0"
                  >
                    <Button as="span" variant="outline">
                      <UploadCloud className="mr-2 h-4 w-4" /> Enviar
                    </Button>
                    <Input
                      id="logo-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'activeLogoUrl')}
                    />
                  </Label>
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex-grow">
                    <Label htmlFor="secondaryLogoUrl">Logo Secundário</Label>
                    <Input
                      id="secondaryLogoUrl"
                      name="secondaryLogoUrl"
                      value={localSettings.secondaryLogoUrl}
                      onChange={handleInputChange}
                      placeholder="URL do logo secundário (opcional)"
                    />
                  </div>
                  <Label
                    htmlFor="secondary-logo-upload"
                    className="cursor-pointer shrink-0"
                  >
                    <Button as="span" variant="outline">
                      <UploadCloud className="mr-2 h-4 w-4" /> Enviar
                    </Button>
                    <Input
                      id="secondary-logo-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'secondaryLogoUrl')}
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
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!selectedMunicipalityId}
              >
                <Undo className="mr-2 h-4 w-4" /> Redefinir
              </Button>
              <Button onClick={handleSave} disabled={!selectedMunicipalityId}>
                <Save className="mr-2 h-4 w-4" /> Salvar para este Município
              </Button>
            </CardFooter>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
