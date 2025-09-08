import { ReportFilterDialog } from '@/components/ferramentas/ReportFilterDialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useReportTemplates } from '@/contexts/ReportTemplateContext';
import { ReportFilters, ReportTemplate } from '@/types';
import { FileText, PlusCircle, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Relatorios = () => {
  const { templates } = useReportTemplates();
  const navigate = useNavigate();
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null);

  const handleGenerateClick = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFilterOpen(true);
  };

  const handleApplyFilters = (filters: ReportFilters) => {
    console.log('Applied filters:', filters);
    if (selectedTemplate) {
      navigate(`/relatorios/ver/${selectedTemplate.id}`);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header compacto com gradiente */}
        <div className='bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md'>
                <FileText className='h-6 w-6 text-white' />
              </div>
              <div>
                <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                  Relatórios
                </h1>
                <p className='text-sm text-gray-600'>
                  {templates.length} modelos disponíveis
                </p>
              </div>
            </div>
            <Button asChild className='bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300'>
              <Link to='/relatorios/templates'>
                <Settings className='mr-2 h-4 w-4' /> Gerenciar Modelos
              </Link>
            </Button>
          </div>
        </div>
        {/* Grid de modelos compacto */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {templates.map((template, index) => {
            const colors = [
              'from-blue-50 to-blue-100 border-blue-200',
              'from-green-50 to-green-100 border-green-200', 
              'from-orange-50 to-orange-100 border-orange-200',
              'from-purple-50 to-purple-100 border-purple-200',
              'from-pink-50 to-pink-100 border-pink-200',
              'from-indigo-50 to-indigo-100 border-indigo-200'
            ];
            const colorClass = colors[index % colors.length];
            
            return (
              <Card key={template.id} className={`bg-gradient-to-br ${colorClass} border-2 hover:shadow-xl transition-all duration-300 hover:scale-105`}>
                <CardHeader className='pb-3'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-white rounded-lg shadow-sm'>
                      <FileText className='h-5 w-5 text-blue-600' />
                    </div>
                    <div>
                      <CardTitle className='text-lg font-semibold text-gray-800'>
                        {template.name}
                      </CardTitle>
                      <CardDescription className='text-sm text-gray-600'>
                        {template.fields.length} campos
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-0'>
                  <Button
                    className='w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300'
                    onClick={() => handleGenerateClick(template)}
                  >
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Card para criar novo modelo */}
          <Card className='border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300 hover:scale-105'>
            <CardHeader className='text-center pb-3'>
              <div className='p-3 bg-white rounded-lg shadow-sm mx-auto mb-3 w-fit'>
                <PlusCircle className='h-6 w-6 text-gray-600' />
              </div>
              <CardTitle className='text-lg font-semibold text-gray-800'>
                Criar Novo Modelo
              </CardTitle>
              <CardDescription className='text-sm text-gray-600'>
                Crie um novo modelo de relatório personalizado
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <Button variant='outline' asChild className='w-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300'>
                <Link to='/relatorios/templates'>
                  <PlusCircle className='mr-2 h-4 w-4' />
                  Criar Modelo
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isFilterOpen} onOpenChange={setFilterOpen}>
        <ReportFilterDialog
          onApplyFilters={handleApplyFilters}
          onClose={() => setFilterOpen(false)}
        />
      </Dialog>
    </div>
  );
};

export default Relatorios;
