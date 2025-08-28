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
import { useGlobalLogo } from '@/contexts/GlobalLogoContext';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Save } from 'lucide-react';
import { ChangeEvent, useState } from 'react';

export const GlobalLogoManager = () => {
  const { globalLogoUrl, setGlobalLogoUrl } = useGlobalLogo();
  const [newLogoUrl, setNewLogoUrl] = useState(globalLogoUrl);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewLogoUrl(e.target.value);
  };

  const handleSaveLogo = async () => {
    if (!newLogoUrl.trim()) {
      toast({
        title: 'Erro',
        description: 'URL da logo é obrigatória',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Validar se a URL é válida testando o carregamento da imagem
      const img = new Image();
      img.onload = () => {
        setGlobalLogoUrl(newLogoUrl);
        toast({
          title: 'Sucesso!',
          description: 'Logo global atualizada com sucesso',
        });
        setIsLoading(false);
      };
      img.onerror = () => {
        toast({
          title: 'Erro',
          description: 'URL da logo inválida ou imagem não encontrada',
          variant: 'destructive',
        });
        setIsLoading(false);
      };
      img.src = newLogoUrl;
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar logo',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleResetLogo = () => {
    const defaultLogo =
      'https://img.usecurling.com/i?q=brazilian%20government&color=azure';
    setNewLogoUrl(defaultLogo);
    setGlobalLogoUrl(defaultLogo);
    toast({
      title: 'Logo Resetada',
      description: 'Logo foi resetada para o padrão do sistema',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo Global do Sistema</CardTitle>
        <CardDescription>
          Configure a logo que será usada em todo o sistema: etiquetas, fichas,
          relatórios e demais documentos.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='logo-url'>URL da Logo</Label>
          <Input
            id='logo-url'
            type='url'
            placeholder='https://exemplo.com/logo.png'
            value={newLogoUrl}
            onChange={handleLogoChange}
          />
        </div>

        {globalLogoUrl && (
          <div className='space-y-2'>
            <Label>Preview da Logo Atual</Label>
            <div className='border rounded-md p-4 bg-gray-50'>
              <img
                src={globalLogoUrl}
                alt='Logo atual'
                className='max-w-48 max-h-24 object-contain mx-auto'
                onError={e => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        <div className='flex gap-2'>
          <Button onClick={handleSaveLogo} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Save className='mr-2 h-4 w-4' />
            )}
            Salvar Logo
          </Button>
          <Button variant='outline' onClick={handleResetLogo}>
            <RefreshCw className='mr-2 h-4 w-4' />
            Resetar para Padrão
          </Button>
        </div>

        <div className='text-sm text-muted-foreground'>
          <p>
            <strong>Dica:</strong> Use uma URL de imagem válida (PNG, JPG, SVG).
          </p>
          <p>A logo será usada em:</p>
          <ul className='list-disc list-inside mt-1 space-y-1'>
            <li>Etiquetas de patrimônios e imóveis</li>
            <li>Fichas de bens</li>
            <li>Relatórios do sistema</li>
            <li>Documentos gerados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
