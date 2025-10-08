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
  sequence: Hash,
}

export default function NumberingSettings() {
  const { pattern, savePattern } = useNumberingPattern()
  const [components, setComponents] = useState<NumberingPatternComponent[]>([])

  useEffect(() => {
    if (pattern) {
      setComponents(pattern.components)
    }
  }, [pattern])

  const preview = useMemo(() => generatePreview(components), [components])

  const handleAddComponent = (type: NumberingPatternComponent['type']) => {
    const newComponent: NumberingPatternComponent = {
      id: generateId(),
      type,
      ...(type === 'year' && { format: 'YYYY' }),
      ...(type === 'sequence' && { length: 5 }),
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
        <h1 className="text-2xl font-bold">Padrão de Numeração de Bens</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <Undo className="mr-2 h-4 w-4" /> Redefinir
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Salvar Padrão
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Visualização</CardTitle>
          <CardDescription>
            Este é um exemplo de como o número de patrimônio será gerado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-md font-mono text-lg text-center">
            {preview}
          </div>
        </CardContent>
      </Card>
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
                          <SelectItem value="YYYY">Ano (YYYY)</SelectItem>
                          <SelectItem value="YY">Ano (YY)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {comp.type === 'sequence' && (
                      <div>
                        <Label className="text-xs">Comprimento</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={comp.length || 5}
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddComponent('text')}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Texto
            </Button>
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
              onClick={() => handleAddComponent('sequence')}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Sequência
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
