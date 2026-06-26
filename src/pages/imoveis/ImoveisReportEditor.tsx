import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useImovelReportTemplates } from '@/contexts/ImovelReportTemplateContext'
import { ImovelReportTemplate } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { ImovelReportTemplateForm } from '@/components/imoveis/ImovelReportTemplateForm'
import { Loader2 } from 'lucide-react'

export default function ImoveisReportEditor() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getTemplateById, saveTemplate } = useImovelReportTemplates()
  const [template, setTemplate] = useState<ImovelReportTemplate | null>(null)

  useEffect(() => {
    if (!templateId) return
    if (templateId === 'novo') {
      if (!user?.municipalityId) {
        // Sem município não dá para criar — avisar e voltar em vez de travar em "Carregando...".
        toast({
          variant: 'destructive',
          title: 'Município não identificado',
          description:
            'Sua conta não está associada a um município. Faça login novamente.',
        })
        navigate('/imoveis/relatorios/templates')
        return
      }
      setTemplate({
        id: '',
        name: 'Novo Relatório de Imóvel',
        fields: [],
        filters: {},
        municipalityId: user.municipalityId,
      })
    } else {
      setTemplate(getTemplateById(templateId) || null)
    }
  }, [templateId, getTemplateById, user, navigate])

  const handleSave = (data: Omit<ImovelReportTemplate, 'id'>) => {
    saveTemplate({ ...data, id: template?.id || generateId() })
    toast({ description: 'Modelo salvo com sucesso!' })
    navigate('/imoveis/relatorios/templates')
  }

  if (!template)
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Editor de Modelo de Relatório</h1>
      <ImovelReportTemplateForm template={template} onSave={handleSave} />
    </div>
  )
}
