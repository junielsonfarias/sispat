import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/services/api'
import { AlertCircle, Building2, CheckCircle, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'

interface MunicipalitySectorsManagerProps {
  municipalityId: string
  municipalityName: string
  onSectorsCreated?: () => void
}

const defaultSectors = [
  {
    name: 'Secretaria Municipal de Educação',
    description: 'Setor responsável pela educação municipal',
    sigla: 'SME',
    codigo: '01'
  },
  {
    name: 'Secretaria Municipal de Saúde',
    description: 'Setor responsável pela saúde municipal',
    sigla: 'SMS',
    codigo: '02'
  },
  {
    name: 'Secretaria Municipal de Administração',
    description: 'Setor responsável pela administração municipal',
    sigla: 'SMA',
    codigo: '03'
  },
  {
    name: 'Secretaria Municipal de Obras',
    description: 'Setor responsável pelas obras municipais',
    sigla: 'SMO',
    codigo: '04'
  },
  {
    name: 'Secretaria Municipal de Finanças',
    description: 'Setor responsável pelas finanças municipais',
    sigla: 'SMF',
    codigo: '05'
  },
  {
    name: 'Secretaria Municipal de Meio Ambiente',
    description: 'Setor responsável pelo meio ambiente',
    sigla: 'SMMA',
    codigo: '06'
  },
  {
    name: 'Secretaria Municipal de Cultura e Turismo',
    description: 'Setor responsável pela cultura e turismo',
    sigla: 'SMCT',
    codigo: '07'
  },
  {
    name: 'Secretaria Municipal de Esportes',
    description: 'Setor responsável pelos esportes',
    sigla: 'SME',
    codigo: '08'
  }
]

export function MunicipalitySectorsManager({ 
  municipalityId, 
  municipalityName, 
  onSectorsCreated 
}: MunicipalitySectorsManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [sectorsStatus, setSectorsStatus] = useState<'none' | 'partial' | 'complete'>('none')
  const { toast } = useToast()

  const handleCreateDefaultSectors = async () => {
    setIsLoading(true)
    try {
      const response = await api.post(`/sectors/create-default/${municipalityId}`)
      
      toast({
        title: 'Setores Criados',
        description: response.data.message,
        variant: 'default'
      })

      setSectorsStatus('complete')
      onSectorsCreated?.()
    } catch (error: any) {
      console.error('Erro ao criar setores padrão:', error)
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao criar setores padrão',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Setores Padrão - {municipalityName}
        </CardTitle>
        <CardDescription>
          Configure os setores padrão para este município. Estes setores serão criados como setores raiz (sem setor pai).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defaultSectors.map((sector, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{sector.name}</h4>
                <p className="text-xs text-muted-foreground">{sector.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {sector.sigla}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Código: {sector.codigo}
                  </Badge>
                </div>
              </div>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {sectorsStatus === 'none' && (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            {sectorsStatus === 'complete' && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm text-muted-foreground">
              {sectorsStatus === 'none' && 'Nenhum setor padrão criado'}
              {sectorsStatus === 'complete' && 'Setores padrão configurados'}
            </span>
          </div>
          
          <Button 
            onClick={handleCreateDefaultSectors}
            disabled={isLoading || sectorsStatus === 'complete'}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isLoading ? 'Criando...' : 'Criar Setores Padrão'}
          </Button>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-sm text-blue-900 mb-1">
            Como funciona:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Os setores são criados como setores raiz (sem setor pai)</li>
            <li>• Cada setor pode ter sub-setores criados posteriormente</li>
            <li>• Usuários podem ser atribuídos a um ou mais setores</li>
            <li>• Patrimônios podem ser vinculados aos setores</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
