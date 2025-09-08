import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CustomizationSettings,
  useCustomization,
} from '@/contexts/CustomizationContext';
import { useGlobalLogo } from '@/contexts/GlobalLogoContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UploadCloud } from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';

const LogoManagement = () => {
  const { user } = useAuth();
  const { getSettingsForMunicipality, saveSettingsForMunicipality } =
    useCustomization();
  const { setGlobalLogoUrl } = useGlobalLogo();
  const [settings, setSettings] = useState<CustomizationSettings>(
    getSettingsForMunicipality(user?.municipalityId || null)
  );

  useEffect(() => {
    if (user?.municipalityId) {
      setSettings(getSettingsForMunicipality(user.municipalityId));
    }
  }, [user, getSettingsForMunicipality]);

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof CustomizationSettings
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (user?.municipalityId) {
      saveSettingsForMunicipality(user.municipalityId, settings);
      // Sincronizar com GlobalLogoContext
      if (settings.activeLogoUrl) {
        setGlobalLogoUrl(settings.activeLogoUrl);
      }
      toast({ description: 'Logos atualizados com sucesso.' });
    }
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Logo Principal</CardTitle>
          <CardDescription>
            Este logo aparecerá na tela de login e no cabeçalho do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col items-center gap-4'>
          <div className='w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center'>
            <img
              src={settings.activeLogoUrl}
              alt='Logo Principal'
              className='max-w-full max-h-full'
            />
          </div>
          <Label htmlFor='logo-principal-input' className='cursor-pointer'>
            <div className='flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted'>
              <UploadCloud className='h-4 w-4' />
              <span>Alterar Logo Principal</span>
            </div>
            <Input
              id='logo-principal-input'
              type='file'
              className='hidden'
              accept='image/*'
              onChange={e => handleFileChange(e, 'activeLogoUrl')}
            />
          </Label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logo Secundário (Opcional)</CardTitle>
          <CardDescription>
            Este logo pode ser usado em relatórios e outros documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col items-center gap-4'>
          <div className='w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center'>
            {settings.secondaryLogoUrl ? (
              <img
                src={settings.secondaryLogoUrl}
                alt='Logo Secundário'
                className='max-w-full max-h-full'
              />
            ) : (
              <span className='text-muted-foreground'>Sem logo</span>
            )}
          </div>
          <Label htmlFor='logo-secundario-input' className='cursor-pointer'>
            <div className='flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted'>
              <UploadCloud className='h-4 w-4' />
              <span>Alterar Logo Secundário</span>
            </div>
            <Input
              id='logo-secundario-input'
              type='file'
              className='hidden'
              accept='image/*'
              onChange={e => handleFileChange(e, 'secondaryLogoUrl')}
            />
          </Label>
        </CardContent>
      </Card>
      <div className='flex justify-end'>
        <Button onClick={handleSave}>Salvar Alterações</Button>
      </div>
    </div>
  );
};

export default LogoManagement;
