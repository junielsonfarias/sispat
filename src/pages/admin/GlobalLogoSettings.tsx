import { GlobalLogoManager } from '@/components/admin/GlobalLogoManager';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GlobalLogoSettings() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-4'>
        <Link
          to='/configuracoes'
          className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
        >
          <ArrowLeft className='h-4 w-4' />
          Voltar às Configurações
        </Link>
      </div>

      <div className='flex items-center gap-4'>
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to='/configuracoes'>Configurações</Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Logo Global</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className='text-2xl font-bold mt-2'>Logo Global do Sistema</h1>
        </div>
      </div>

      <div className='grid gap-6'>
        <GlobalLogoManager />

        <Card>
          <CardHeader>
            <CardTitle>Informações sobre a Logo Global</CardTitle>
            <CardDescription>
              Entenda como a logo global funciona no sistema SISPAT
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <h3 className='font-semibold'>Onde a logo é utilizada:</h3>
              <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
                <li>
                  <strong>Etiquetas:</strong> Etiquetas de patrimônios e imóveis
                </li>
                <li>
                  <strong>Fichas:</strong> Fichas de bens e relatórios
                  detalhados
                </li>
                <li>
                  <strong>Relatórios:</strong> Todos os relatórios gerados pelo
                  sistema
                </li>
                <li>
                  <strong>Documentos:</strong> Certificados, declarações e
                  outros documentos
                </li>
                <li>
                  <strong>QR Codes:</strong> QR codes gerados para consulta
                  pública
                </li>
              </ul>
            </div>

            <div className='space-y-3'>
              <h3 className='font-semibold'>Recomendações técnicas:</h3>
              <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
                <li>Use imagens em formato PNG, JPG ou SVG</li>
                <li>Recomendado: 200x100 pixels para melhor qualidade</li>
                <li>Certifique-se de que a URL seja pública e acessível</li>
                <li>
                  Evite logos muito grandes para não comprometer a qualidade das
                  etiquetas
                </li>
                <li>Use fundo transparente (PNG) para melhor integração</li>
              </ul>
            </div>

            <div className='space-y-3'>
              <h3 className='font-semibold'>Como funciona:</h3>
              <p className='text-sm text-muted-foreground'>
                A logo global é armazenada localmente no navegador e é aplicada
                automaticamente em todos os documentos e etiquetas gerados pelo
                sistema. Quando você altera a logo, a mudança é refletida
                imediatamente em todas as novas gerações de documentos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
