import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { LOCAL_IMAGES } from '@/lib/image-utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const Downloads = () => {
  const appVersion = '0.0.155'
  const fileSize = '91.5 MB'
  const releaseDate = '15 de Agosto de 2025'
  const downloadUrl = '/downloads/sispat-setup-v0.0.155.exe'

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Downloads</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Downloads</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <img
              src={LOCAL_IMAGES.ICON_WINDOWS}
              alt="Windows Logo"
              className="h-10 w-10"
            />
            <div>
              <CardTitle>Cliente Desktop SISPAT para Windows</CardTitle>
              <CardDescription>
                Baixe a versão mais recente do aplicativo para seu computador.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold">Versão</p>
              <p className="text-muted-foreground">{appVersion}</p>
            </div>
            <div>
              <p className="font-semibold">Tamanho do Arquivo</p>
              <p className="text-muted-foreground">{fileSize}</p>
            </div>
            <div>
              <p className="font-semibold">Data de Lançamento</p>
              <p className="text-muted-foreground">{releaseDate}</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Requisitos Mínimos</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li>Windows 10 ou superior (64-bit)</li>
              <li>4 GB de RAM</li>
              <li>250 MB de espaço em disco</li>
              <li>Conexão com a internet para sincronização</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <a href={downloadUrl} download>
              <Download className="mr-2 h-4 w-4" />
              Baixar Agora
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default Downloads
