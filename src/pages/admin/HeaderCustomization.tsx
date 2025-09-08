import { HeaderPreview } from '@/components/HeaderPreview';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCustomization } from '@/contexts/CustomizationContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { FileText, FormInput, Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

const HeaderCustomization = () => {
  const { user } = useAuth();
  const { getSettingsForMunicipality, saveSettingsForMunicipality } =
    useCustomization();

  const [settings, setSettings] = useState(() =>
    getSettingsForMunicipality(user?.municipalityId || null)
  );

  // Atualizar o estado quando as configurações mudarem
  useEffect(() => {
    const currentSettings = getSettingsForMunicipality(
      user?.municipalityId || null
    );
    setSettings(currentSettings);
  }, [getSettingsForMunicipality, user?.municipalityId]);

  const handleSave = () => {
    if (user?.municipalityId) {
      saveSettingsForMunicipality(user.municipalityId, settings);
      toast({ description: 'Configurações de cabeçalho salvas com sucesso.' });
    }
  };

  const updateReportHeader = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      reportHeader: {
        ...prev.reportHeader,
        [field]: value,
      },
    }));
  };

  const updateFormHeader = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      formHeader: {
        ...prev.formHeader,
        [field]: value,
      },
    }));
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <Settings className='h-6 w-6' />
        <h1 className='text-2xl font-bold'>Personalização de Cabeçalhos</h1>
      </div>

      <p className='text-muted-foreground'>
        Configure os cabeçalhos dos relatórios e fichas para incluir informações
        personalizadas.
      </p>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Configurações de Relatórios */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              Cabeçalho de Relatórios
            </CardTitle>
            <CardDescription>
              Configure o que aparece no cabeçalho dos relatórios
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* Elementos a exibir */}
            <div className='space-y-4'>
              <Label className='text-sm font-medium'>Elementos a exibir:</Label>
              <div className='grid grid-cols-2 gap-3'>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-logo'
                    checked={settings.reportHeader.showLogo}
                    onCheckedChange={checked =>
                      updateReportHeader('showLogo', checked)
                    }
                  />
                  <Label htmlFor='report-logo' className='text-sm'>
                    Logo
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-title'
                    checked={settings.reportHeader.showTitle}
                    onCheckedChange={checked =>
                      updateReportHeader('showTitle', checked)
                    }
                  />
                  <Label htmlFor='report-title' className='text-sm'>
                    Título
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-subtitle'
                    checked={settings.reportHeader.showSubtitle}
                    onCheckedChange={checked =>
                      updateReportHeader('showSubtitle', checked)
                    }
                  />
                  <Label htmlFor='report-subtitle' className='text-sm'>
                    Subtítulo
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-date'
                    checked={settings.reportHeader.showDate}
                    onCheckedChange={checked =>
                      updateReportHeader('showDate', checked)
                    }
                  />
                  <Label htmlFor='report-date' className='text-sm'>
                    Data
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-time'
                    checked={settings.reportHeader.showTime}
                    onCheckedChange={checked =>
                      updateReportHeader('showTime', checked)
                    }
                  />
                  <Label htmlFor='report-time' className='text-sm'>
                    Hora
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-municipality'
                    checked={settings.reportHeader.showMunicipality}
                    onCheckedChange={checked =>
                      updateReportHeader('showMunicipality', checked)
                    }
                  />
                  <Label htmlFor='report-municipality' className='text-sm'>
                    Município
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-address'
                    checked={settings.reportHeader.showAddress}
                    onCheckedChange={checked =>
                      updateReportHeader('showAddress', checked)
                    }
                  />
                  <Label htmlFor='report-address' className='text-sm'>
                    Setor
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-phone'
                    checked={settings.reportHeader.showPhone}
                    onCheckedChange={checked =>
                      updateReportHeader('showPhone', checked)
                    }
                  />
                  <Label htmlFor='report-phone' className='text-sm'>
                    Local
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-email'
                    checked={settings.reportHeader.showEmail}
                    onCheckedChange={checked =>
                      updateReportHeader('showEmail', checked)
                    }
                  />
                  <Label htmlFor='report-email' className='text-sm'>
                    E-mail
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='report-website'
                    checked={settings.reportHeader.showWebsite}
                    onCheckedChange={checked =>
                      updateReportHeader('showWebsite', checked)
                    }
                  />
                  <Label htmlFor='report-website' className='text-sm'>
                    Website
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Textos personalizados */}
            <div className='space-y-4'>
              <Label className='text-sm font-medium'>
                Textos personalizados:
              </Label>
              <div className='space-y-3'>
                <div>
                  <Label htmlFor='report-title-text' className='text-sm'>
                    Título do relatório:
                  </Label>
                  <Input
                    id='report-title-text'
                    value={settings.reportHeader.title}
                    onChange={e => updateReportHeader('title', e.target.value)}
                    placeholder='Ex: Relatório de Patrimônio'
                  />
                </div>
                <div>
                  <Label htmlFor='report-subtitle-text' className='text-sm'>
                    Subtítulo:
                  </Label>
                  <Input
                    id='report-subtitle-text'
                    value={settings.reportHeader.subtitle}
                    onChange={e =>
                      updateReportHeader('subtitle', e.target.value)
                    }
                    placeholder='Ex: Sistema de Gestão de Patrimônio'
                  />
                </div>
                <div>
                  <Label htmlFor='report-municipality-text' className='text-sm'>
                    Nome do município:
                  </Label>
                  <Input
                    id='report-municipality-text'
                    value={settings.reportHeader.municipality}
                    onChange={e =>
                      updateReportHeader('municipality', e.target.value)
                    }
                    placeholder='Ex: Prefeitura Municipal de São Sebastião da Boa Vista'
                  />
                </div>
                <div>
                  <Label htmlFor='report-address-text' className='text-sm'>
                    Setor que está gerando o relatório:
                  </Label>
                  <Input
                    id='report-address-text'
                    value={settings.reportHeader.address}
                    onChange={e =>
                      updateReportHeader('address', e.target.value)
                    }
                    placeholder='Ex: Secretaria Municipal de Saúde'
                  />
                </div>
                <div>
                  <Label htmlFor='report-phone-text' className='text-sm'>
                    Local:
                  </Label>
                  <Input
                    id='report-phone-text'
                    value={settings.reportHeader.phone}
                    onChange={e => updateReportHeader('phone', e.target.value)}
                    placeholder='Ex: Hospital Municipal'
                  />
                </div>
                <div>
                  <Label htmlFor='report-email-text' className='text-sm'>
                    E-mail:
                  </Label>
                  <Input
                    id='report-email-text'
                    value={settings.reportHeader.email}
                    onChange={e => updateReportHeader('email', e.target.value)}
                    placeholder='Ex: contato@municipio.gov.br'
                  />
                </div>
                <div>
                  <Label htmlFor='report-website-text' className='text-sm'>
                    Website:
                  </Label>
                  <Input
                    id='report-website-text'
                    value={settings.reportHeader.website}
                    onChange={e =>
                      updateReportHeader('website', e.target.value)
                    }
                    placeholder='Ex: www.municipio.gov.br'
                  />
                </div>
                <div>
                  <Label htmlFor='report-custom-text' className='text-sm'>
                    Texto personalizado:
                  </Label>
                  <Textarea
                    id='report-custom-text'
                    value={settings.reportHeader.customText}
                    onChange={e =>
                      updateReportHeader('customText', e.target.value)
                    }
                    placeholder='Texto adicional que aparecerá no cabeçalho...'
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Fichas */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FormInput className='h-5 w-5' />
              Cabeçalho de Fichas
            </CardTitle>
            <CardDescription>
              Configure o que aparece no cabeçalho das fichas de patrimônio
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* Elementos a exibir */}
            <div className='space-y-4'>
              <Label className='text-sm font-medium'>Elementos a exibir:</Label>
              <div className='grid grid-cols-2 gap-3'>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-logo'
                    checked={settings.formHeader.showLogo}
                    onCheckedChange={checked =>
                      updateFormHeader('showLogo', checked)
                    }
                  />
                  <Label htmlFor='form-logo' className='text-sm'>
                    Logo
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-title'
                    checked={settings.formHeader.showTitle}
                    onCheckedChange={checked =>
                      updateFormHeader('showTitle', checked)
                    }
                  />
                  <Label htmlFor='form-title' className='text-sm'>
                    Título
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-subtitle'
                    checked={settings.formHeader.showSubtitle}
                    onCheckedChange={checked =>
                      updateFormHeader('showSubtitle', checked)
                    }
                  />
                  <Label htmlFor='form-subtitle' className='text-sm'>
                    Subtítulo
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-date'
                    checked={settings.formHeader.showDate}
                    onCheckedChange={checked =>
                      updateFormHeader('showDate', checked)
                    }
                  />
                  <Label htmlFor='form-date' className='text-sm'>
                    Data
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-time'
                    checked={settings.formHeader.showTime}
                    onCheckedChange={checked =>
                      updateFormHeader('showTime', checked)
                    }
                  />
                  <Label htmlFor='form-time' className='text-sm'>
                    Hora
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-municipality'
                    checked={settings.formHeader.showMunicipality}
                    onCheckedChange={checked =>
                      updateFormHeader('showMunicipality', checked)
                    }
                  />
                  <Label htmlFor='form-municipality' className='text-sm'>
                    Município
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-address'
                    checked={settings.formHeader.showAddress}
                    onCheckedChange={checked =>
                      updateFormHeader('showAddress', checked)
                    }
                  />
                  <Label htmlFor='form-address' className='text-sm'>
                    Setor
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-phone'
                    checked={settings.formHeader.showPhone}
                    onCheckedChange={checked =>
                      updateFormHeader('showPhone', checked)
                    }
                  />
                  <Label htmlFor='form-phone' className='text-sm'>
                    Local
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-email'
                    checked={settings.formHeader.showEmail}
                    onCheckedChange={checked =>
                      updateFormHeader('showEmail', checked)
                    }
                  />
                  <Label htmlFor='form-email' className='text-sm'>
                    E-mail
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='form-website'
                    checked={settings.formHeader.showWebsite}
                    onCheckedChange={checked =>
                      updateFormHeader('showWebsite', checked)
                    }
                  />
                  <Label htmlFor='form-website' className='text-sm'>
                    Website
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Textos personalizados */}
            <div className='space-y-4'>
              <Label className='text-sm font-medium'>
                Textos personalizados:
              </Label>
              <div className='space-y-3'>
                <div>
                  <Label htmlFor='form-title-text' className='text-sm'>
                    Título da ficha:
                  </Label>
                  <Input
                    id='form-title-text'
                    value={settings.formHeader.title}
                    onChange={e => updateFormHeader('title', e.target.value)}
                    placeholder='Ex: Ficha de Patrimônio'
                  />
                </div>
                <div>
                  <Label htmlFor='form-subtitle-text' className='text-sm'>
                    Subtítulo:
                  </Label>
                  <Input
                    id='form-subtitle-text'
                    value={settings.formHeader.subtitle}
                    onChange={e => updateFormHeader('subtitle', e.target.value)}
                    placeholder='Ex: Sistema de Gestão de Patrimônio'
                  />
                </div>
                <div>
                  <Label htmlFor='form-municipality-text' className='text-sm'>
                    Nome do município:
                  </Label>
                  <Input
                    id='form-municipality-text'
                    value={settings.formHeader.municipality}
                    onChange={e =>
                      updateFormHeader('municipality', e.target.value)
                    }
                    placeholder='Ex: Prefeitura Municipal de São Sebastião da Boa Vista'
                  />
                </div>
                <div>
                  <Label htmlFor='form-address-text' className='text-sm'>
                    Setor que está gerando o relatório:
                  </Label>
                  <Input
                    id='form-address-text'
                    value={settings.formHeader.address}
                    onChange={e => updateFormHeader('address', e.target.value)}
                    placeholder='Ex: Secretaria Municipal de Saúde'
                  />
                </div>
                <div>
                  <Label htmlFor='form-phone-text' className='text-sm'>
                    Local:
                  </Label>
                  <Input
                    id='form-phone-text'
                    value={settings.formHeader.phone}
                    onChange={e => updateFormHeader('phone', e.target.value)}
                    placeholder='Ex: Hospital Municipal'
                  />
                </div>
                <div>
                  <Label htmlFor='form-email-text' className='text-sm'>
                    E-mail:
                  </Label>
                  <Input
                    id='form-email-text'
                    value={settings.formHeader.email}
                    onChange={e => updateFormHeader('email', e.target.value)}
                    placeholder='Ex: contato@municipio.gov.br'
                  />
                </div>
                <div>
                  <Label htmlFor='form-website-text' className='text-sm'>
                    Website:
                  </Label>
                  <Input
                    id='form-website-text'
                    value={settings.formHeader.website}
                    onChange={e => updateFormHeader('website', e.target.value)}
                    placeholder='Ex: www.municipio.gov.br'
                  />
                </div>
                <div>
                  <Label htmlFor='form-custom-text' className='text-sm'>
                    Texto personalizado:
                  </Label>
                  <Textarea
                    id='form-custom-text'
                    value={settings.formHeader.customText}
                    onChange={e =>
                      updateFormHeader('customText', e.target.value)
                    }
                    placeholder='Texto adicional que aparecerá no cabeçalho...'
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='flex justify-end'>
        <Button onClick={handleSave} className='flex items-center gap-2'>
          <Save className='h-4 w-4' />
          Salvar Configurações
        </Button>
      </div>

      {/* Previews */}
      <div className='grid gap-6 lg:grid-cols-2 mt-8'>
        <HeaderPreview type='report' settings={settings} />
        <HeaderPreview type='form' settings={settings} />
      </div>
    </div>
  );
};

export default HeaderCustomization;
