import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useImovelReportTemplates } from '@/contexts/ImovelReportTemplateContext'
import { ImovelReportTemplate } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Save } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ImovelReportTemplateForm } from '@/components/imoveis/ImovelReportTemplateForm'

export default function ImoveisReportEditor() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getTemplateById, saveTemplate } = useImovelReportTemplates()
  const [template, setTemplate] = useState<ImovelReportTemplate | null>(null)

  useEffect(() => {
    if (templateId) {
      if (templateId === 'novo') {
        if (!user?.municipalityId) return
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
    }
  }, [templateId, getTemplateById, user])

  const handleSave = (data: Omit<ImovelReportTemplate, 'id'>) => {
    saveTemplate({ ...data, id: template?.id || generateId() })
    toast({ description: 'Modelo salvo com sucesso!' })
    navigate('/imoveis/relatorios/templates')
  }

  if (!template) return <div>Carregando...</div>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Editor de Modelo de Relatório</h1>
      <ImovelReportTemplateForm template={template} onSave={handleSave} />
    </div>
  )
}
