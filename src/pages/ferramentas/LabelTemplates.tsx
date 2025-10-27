import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PlusCircle, Edit, Trash2, QrCode, Search, Layers } from 'lucide-react'
import { useLabelTemplates } from '@/hooks/useLabelTemplates'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default function LabelTemplates() {
  const { templates, deleteTemplate } = useLabelTemplates()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  console.log('LabelTemplates render:', { templates: templates.length, templatesData: templates.map(t => ({ id: t.id, name: t.name, municipalityId: t.municipalityId })) })

  // Filtrar templates por nome
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/gerar-etiquetas">Gerar Etiquetas</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Modelos de Etiqueta</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Modelos de Etiqueta</h1>
          <p className="text-sm text-gray-600 mt-1">
            Crie e gerencie diferentes tipos de etiquetas e placas
          </p>
        </div>
        <Button onClick={() => navigate('/etiquetas/templates/editor/novo')} size="lg">
          <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Modelo
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Modelos Salvos</CardTitle>
              <CardDescription>
                {filteredTemplates.length} de {templates.length} modelos
              </CardDescription>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                {searchTerm ? 'Nenhum modelo encontrado' : 'Nenhum modelo criado ainda'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm
                  ? 'Tente ajustar os termos de busca'
                  : 'Comece criando seu primeiro modelo de etiqueta'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => navigate('/etiquetas/templates/editor/novo')}
                  className="mt-4"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar Primeiro Modelo
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader className="flex-grow">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <QrCode className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="text-muted-foreground text-sm space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <Layers className="h-3 w-3" />
                          <span className="text-xs">
                            {template.width}mm x {template.height}mm
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {template.elements.length} {template.elements.length === 1 ? 'elemento' : 'elementos'}
                          </span>
                        </div>
                        {template.isDefault && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Padrão
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/etiquetas/templates/editor/${template.id}`)
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  {!template.isDefault && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá o
                            modelo "{template.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTemplate(template.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardFooter>
              </Card>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
