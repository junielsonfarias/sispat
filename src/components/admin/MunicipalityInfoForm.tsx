import { useState, useEffect } from 'react'
import { useCustomization } from '@/contexts/CustomizationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Building2, Users, Building } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function MunicipalityInfoForm() {
  const { settings, saveSettings } = useCustomization()
  const [formData, setFormData] = useState({
    prefeituraName: '',
    secretariaResponsavel: '',
    departamentoResponsavel: '',
  })

  useEffect(() => {
    setFormData({
      prefeituraName: settings.prefeituraName || '',
      secretariaResponsavel: settings.secretariaResponsavel || '',
      departamentoResponsavel: settings.departamentoResponsavel || '',
    })
  }, [settings])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    const updatedSettings = {
      ...settings,
      ...formData
    }
    
    saveSettings(updatedSettings)
    toast({
      title: "Informações salvas",
      description: "As informações do município foram atualizadas com sucesso.",
    })
  }

  const hasChanges = () => {
    return (
      formData.prefeituraName !== settings.prefeituraName ||
      formData.secretariaResponsavel !== settings.secretariaResponsavel ||
      formData.departamentoResponsavel !== settings.departamentoResponsavel
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações do Município
          </CardTitle>
          <CardDescription>
            Configure as informações institucionais que aparecerão nos relatórios e documentos do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prefeituraName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Nome da Prefeitura
              </Label>
              <Input
                id="prefeituraName"
                value={formData.prefeituraName}
                onChange={(e) => handleInputChange('prefeituraName', e.target.value)}
                placeholder="Ex: PREFEITURA DE SÃO SEBASTIÃO DA BOA VISTA"
                className="font-medium"
              />
              <p className="text-sm text-muted-foreground">
                Nome oficial da prefeitura que aparecerá nos cabeçalhos dos relatórios.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretariaResponsavel" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Secretaria Responsável
              </Label>
              <Input
                id="secretariaResponsavel"
                value={formData.secretariaResponsavel}
                onChange={(e) => handleInputChange('secretariaResponsavel', e.target.value)}
                placeholder="Ex: SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO"
                className="font-medium"
              />
              <p className="text-sm text-muted-foreground">
                Secretaria responsável pela gestão do sistema de patrimônio.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="departamentoResponsavel" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Departamento Responsável
              </Label>
              <Input
                id="departamentoResponsavel"
                value={formData.departamentoResponsavel}
                onChange={(e) => handleInputChange('departamentoResponsavel', e.target.value)}
                placeholder="Ex: DEPARTAMENTO DE PATRIMÔNIO"
                className="font-medium"
              />
              <p className="text-sm text-muted-foreground">
                Departamento específico responsável pela gestão patrimonial.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSave}
              disabled={!hasChanges()}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar Informações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview das informações */}
      <Card>
        <CardHeader>
          <CardTitle>Visualização</CardTitle>
          <CardDescription>
            Como as informações aparecerão nos relatórios e documentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-800">
                {formData.prefeituraName || 'Nome da Prefeitura'}
              </h3>
              <p className="text-sm text-gray-600">
                {formData.secretariaResponsavel || 'Secretaria Responsável'}
              </p>
              <p className="text-sm text-gray-600">
                {formData.departamentoResponsavel || 'Departamento Responsável'}
              </p>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">SISPAT</p>
                <p className="text-xs text-gray-500">Sistema de Patrimônio</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
