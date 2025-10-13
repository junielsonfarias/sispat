import { useState, useEffect, useMemo } from 'react'
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNumberingPattern } from '@/contexts/NumberingPatternContext'
import { generatePreview } from '@/lib/numbering-pattern-utils'
import { NumberingPatternComponent } from '@/types'
import {
  PlusCircle,
  Trash2,
  GripVertical,
  Save,
  Undo,
  Text,
  Calendar,
  Hash,
  Building,
  Home,
  Package,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { generateId } from '@/lib/utils'

const componentIcons = {
  text: Text,
  year: Calendar,
  sector: Building,
  sequence: Hash,
}

export default function NumberingSettings() {
  const { pattern, savePattern } = useNumberingPattern()
  const [components, setComponents] = useState<NumberingPatternComponent[]>([])
  const [activeTab, setActiveTab] = useState<'bens' | 'imoveis'>('bens')

  useEffect(() => {
    if (pattern) {
      setComponents(pattern.components)
    }
  }, [pattern])

  const preview = useMemo(() => generatePreview(components), [components])
  
  // Preview fixo para imóveis
  const imovelPreview = 'IML2025010001'

  const handleAddComponent = (type: NumberingPatternComponent['type']) => {
    const newComponent: NumberingPatternComponent = {
      id: generateId(),
      type,
      ...(type === 'year' && { format: 'YYYY' }),
      ...(type === 'sector' && { sectorCodeLength: 2 }),
      ...(type === 'sequence' && { length: 6 }),
    }
    setComponents([...components, newComponent])
  }

  const handleUpdateComponent = (
    id: string,
    updates: Partial<NumberingPatternComponent>,
  ) => {
    setComponents(
      components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    )
  }

  const handleRemoveComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id))
  }

  const handleSave = () => {
    if (pattern) {
      savePattern({ ...pattern, components })
      toast({ description: 'Padrão de numeração salvo com sucesso.' })
    }
  }

  const handleReset = () => {
    if (pattern) {
      setComponents(pattern.components)
    }
  }

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
            <BreadcrumbPage>Numeração de Bens</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Padrão de Numeração Patrimonial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure o formato de numeração de bens móveis e imóveis
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'bens' | 'imoveis')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="bens" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Bens Móveis
          </TabsTrigger>
          <TabsTrigger value="imoveis" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Imóveis
          </TabsTrigger>
        </TabsList>

        {/* Aba de Bens Móveis */}
        <TabsContent value="bens" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setComponents([
                  { id: generateId(), type: 'year', format: 'YYYY' },
                  { id: generateId(), type: 'sector', sectorCodeLength: 2 },
                  { id: generateId(), type: 'sequence', length: 6 },
                ])
                toast({ 
                  description: 'Padrão recomendado aplicado! Clique em Salvar para confirmar.' 
                })
              }}
            >
              <Hash className="mr-2 h-4 w-4" /> Usar Padrão Recomendado
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <Undo className="mr-2 h-4 w-4" /> Redefinir
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Salvar Padrão
            </Button>
          </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Padrão Recomendado</CardTitle>
            <CardDescription>
              Formato: Ano + Código Setor + Sequência 6 dígitos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">Exemplo:</p>
              <p className="font-mono text-2xl text-blue-700 text-center">2025XX000001</p>
            </div>
            <div className="text-sm space-y-2 text-muted-foreground">
              <p>• <strong>2025</strong> = Ano de aquisição</p>
              <p>• <strong>XX</strong> = Código do setor (2 dígitos)</p>
              <p>• <strong>000001</strong> = Sequência (6 dígitos)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visualização Atual</CardTitle>
            <CardDescription>
              Prévia de como o número será gerado com sua configuração.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
              <p className="text-xs text-green-700 mb-2 font-semibold uppercase">Número Gerado:</p>
              <p className="font-mono text-3xl font-bold text-green-700 text-center break-all">
                {preview || 'Configure os componentes'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Componentes do Padrão</CardTitle>
          <CardDescription>
            Adicione, remova e configure os componentes que formarão o número de
            patrimônio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {components.map((comp) => {
              const Icon = componentIcons[comp.type]
              return (
                <div
                  key={comp.id}
                  className="flex items-center gap-2 p-2 border rounded-md"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-grow grid grid-cols-2 gap-2">
                    {comp.type === 'text' && (
                      <Input
                        placeholder="Texto fixo"
                        value={comp.value || ''}
                        onChange={(e) =>
                          handleUpdateComponent(comp.id, {
                            value: e.target.value,
                          })
                        }
                      />
                    )}
                    {comp.type === 'year' && (
                      <Select
                        value={comp.format}
                        onValueChange={(value) =>
                          handleUpdateComponent(comp.id, {
                            format: value as 'YYYY' | 'YY',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YYYY">Ano Completo (2025)</SelectItem>
                          <SelectItem value="YY">Ano Curto (25)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {comp.type === 'sector' && (
                      <div>
                        <Label className="text-xs">Dígitos do Código do Setor</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={comp.sectorCodeLength || 2}
                          onChange={(e) =>
                            handleUpdateComponent(comp.id, {
                              sectorCodeLength: parseInt(e.target.value, 10),
                            })
                          }
                        />
                      </div>
                    )}
                    {comp.type === 'sequence' && (
                      <div>
                        <Label className="text-xs">Dígitos da Sequência</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={comp.length || 6}
                          onChange={(e) =>
                            handleUpdateComponent(comp.id, {
                              length: parseInt(e.target.value, 10),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveComponent(comp.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddComponent('year')}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Ano
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddComponent('sector')}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Código Setor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddComponent('sequence')}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Sequência
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddComponent('text')}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Texto/Separador
            </Button>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Aba de Imóveis */}
        <TabsContent value="imoveis" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Formato de Numeração</CardTitle>
                <CardDescription>
                  IML + Ano + Código Setor + Sequencial de 4 dígitos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Formato Fixo:</p>
                  <p className="font-mono text-2xl text-blue-700 text-center">IML2025XX0001</p>
                </div>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>• <strong>IML</strong> = Prefixo fixo para imóveis</p>
                  <p>• <strong>2025</strong> = Ano de cadastro</p>
                  <p>• <strong>XX</strong> = Código do setor (2 dígitos)</p>
                  <p>• <strong>0001</strong> = Sequencial (4 dígitos)</p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ℹ️ O formato de numeração de imóveis é fixo e não pode ser personalizado. Esta configuração garante consistência e compatibilidade com sistemas de gestão pública.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exemplo de Numeração</CardTitle>
                <CardDescription>
                  Visualize como o número será gerado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 mb-2 font-semibold uppercase">Número Gerado:</p>
                  <p className="font-mono text-3xl font-bold text-green-700 text-center break-all">
                    {imovelPreview}
                  </p>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prefixo:</span>
                    <span className="font-mono font-semibold">IML</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Ano:</span>
                    <span className="font-mono font-semibold">2025</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Código do Setor:</span>
                    <span className="font-mono font-semibold">01</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Sequencial:</span>
                    <span className="font-mono font-semibold">0001</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
              <CardDescription>
                A numeração de imóveis é gerada automaticamente pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Prefixo Fixo</h4>
                      <p className="text-sm text-muted-foreground">
                        Todos os imóveis iniciam com "IML" (Imóvel)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Ano de Cadastro</h4>
                      <p className="text-sm text-muted-foreground">
                        Ano atual com 4 dígitos (ex: 2025)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Código do Setor</h4>
                      <p className="text-sm text-muted-foreground">
                        Código do setor responsável (2 dígitos)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Sequencial</h4>
                      <p className="text-sm text-muted-foreground">
                        Número sequencial automático (4 dígitos)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
