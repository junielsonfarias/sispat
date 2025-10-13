import { Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LogoManagement from '@/pages/admin/LogoManagement'
import LoginCustomizationForm from '@/components/admin/LoginCustomizationForm'
import MunicipalityInfoForm from '@/components/admin/MunicipalityInfoForm'

export default function Personalization() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/configuracoes">Configurações</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Personalização</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Personalização</h1>
      <Tabs defaultValue="municipality" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="municipality">Informações do Município</TabsTrigger>
          <TabsTrigger value="logo">Logos</TabsTrigger>
          <TabsTrigger value="login">Tela de Login</TabsTrigger>
        </TabsList>
        <TabsContent value="municipality">
          <MunicipalityInfoForm />
        </TabsContent>
        <TabsContent value="logo">
          <LogoManagement />
        </TabsContent>
        <TabsContent value="login">
          <LoginCustomizationForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
