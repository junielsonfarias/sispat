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
import { Dialog } from '@/components/ui/dialog'
import { FileText, PlusCircle, Settings } from 'lucide-react'
import { useReportTemplates } from '@/contexts/ReportTemplateContext'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ReportFilterDialog } from '@/components/ferramentas/ReportFilterDialog'
import { ReportFilters, ReportTemplate } from '@/types'

const Relatorios = () => {
  const { templates } = useReportTemplates()
  const navigate = useNavigate()
  const [isFilterOpen, setFilterOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null)

  const handleGenerateClick = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setFilterOpen(true)
  }

  const handleApplyFilters = (filters: ReportFilters) => {
    if (selectedTemplate) {
      // Codificar filtros como query params
      const params = new URLSearchParams()
      
      if (filters.status && filters.status !== 'todos') {
        params.append('status', filters.status)
      }
      if (filters.situacao_bem && filters.situacao_bem !== 'todos') {
        params.append('situacao_bem', filters.situacao_bem)
      }
      if (filters.setor && filters.setor !== 'todos') {
        params.append('setor', filters.setor)
      }
      if (filters.tipo && filters.tipo !== 'todos') {
        params.append('tipo', filters.tipo)
      }
      if (filters.dateRange?.from) {
        params.append('dateFrom', filters.dateRange.from.toISOString())
      }
      if (filters.dateRange?.to) {
        params.append('dateTo', filters.dateRange.to.toISOString())
      }

      const queryString = params.toString()
      const url = queryString 
        ? `/relatorios/ver/${selectedTemplate.id}?${queryString}`
        : `/relatorios/ver/${selectedTemplate.id}`
      
      navigate(url)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard/admin">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Relatórios</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <Button asChild variant="outline">
          <Link to="/relatorios/templates">
            <Settings className="mr-2 h-4 w-4" /> Gerenciar Modelos
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatório a partir de um Modelo</CardTitle>
          <CardDescription>
            Selecione um modelo salvo para gerar um relatório rapidamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>
                      {template.fields.length} campos
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => handleGenerateClick(template)}
                  >
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card className="border-dashed flex flex-col items-center justify-center">
              <CardContent className="pt-6">
                <Button asChild variant="ghost">
                  <Link to="/relatorios/templates">
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Modelo
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      {isFilterOpen && (
        <Dialog open={isFilterOpen} onOpenChange={setFilterOpen}>
          <ReportFilterDialog
            onApplyFilters={handleApplyFilters}
            onClose={() => setFilterOpen(false)}
          />
        </Dialog>
      )}
    </div>
  )
}

export default Relatorios