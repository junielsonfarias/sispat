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
import { PlusCircle, Edit, Trash2, FileText } from 'lucide-react'
import { useImovelReportTemplates } from '@/contexts/ImovelReportTemplateContext'

export default function ImoveisReportTemplates() {
  const { templates, deleteTemplate } = useImovelReportTemplates()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Modelos de Relatório de Imóveis</h1>
        <Button onClick={() => navigate('/imoveis/relatorios/templates/novo')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Modelo
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Modelos Salvos</CardTitle>
          <CardDescription>
            Gerencie seus modelos de relatório para imóveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                  <div className="flex items-start gap-4">
                    <FileText className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>
                        {template.fields.length} campos selecionados
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/imoveis/relatorios/templates/editar/${template.id}`,
                      )
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Button>
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
                          Esta ação não pode ser desfeita.
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
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
