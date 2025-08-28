import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { usePublicSearch } from '@/contexts/PublicSearchContext';
import { useMunicipalities } from '@/contexts/MunicipalityContext';

export default function PublicSearchSettings() {
  const { settings, togglePublicSearch, toggleMunicipality } =
    usePublicSearch();
  const { municipalities } = useMunicipalities();

  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-bold'>Configurações da Consulta Pública</h1>
      <Card>
        <CardHeader>
          <CardTitle>Status Global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between rounded-lg border p-4'>
            <div className='space-y-0.5'>
              <Label htmlFor='public-search-toggle' className='text-base'>
                Habilitar Consulta Pública
              </Label>
              <p className='text-sm text-muted-foreground'>
                Permite que o público em geral pesquise bens e imóveis.
              </p>
            </div>
            <Switch
              id='public-search-toggle'
              checked={settings.isPublicSearchEnabled}
              onCheckedChange={togglePublicSearch}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Municípios Públicos</CardTitle>
          <CardDescription>
            Selecione quais municípios estarão disponíveis na consulta pública.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {municipalities.map(municipality => (
            <div key={municipality.id} className='flex items-center space-x-2'>
              <Checkbox
                id={`municipality-${municipality.id}`}
                checked={settings.publicMunicipalityIds.includes(
                  municipality.id
                )}
                onCheckedChange={checked =>
                  toggleMunicipality(municipality.id, !!checked)
                }
                disabled={!settings.isPublicSearchEnabled}
              />
              <Label htmlFor={`municipality-${municipality.id}`}>
                {municipality.name}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
